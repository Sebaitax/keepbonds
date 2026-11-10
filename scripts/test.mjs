import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('www');
const PORT = 5177;
const OUT = path.resolve('test-screens');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(ROOT, file);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

await new Promise((r) => server.listen(PORT, r));
console.log(`Server on http://localhost:${PORT}`);

const browser = await chromium.launch();
// Forzamos locale es para que la detección de idioma del sistema (i18n) siempre
// arranque en español, sin importar el locale de la máquina donde corre el test.
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'es-CL' });

const issues = [];
page.on('pageerror', (err) => issues.push(`PAGE ERROR: ${err.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') issues.push(`CONSOLE ERROR: ${msg.text()}`); });

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('shot:', name);
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Sin el botón "Restaurar datos de ejemplo" (removido de Ajustes), sembramos datos
// de prueba a través del propio flujo de Respaldo > Importar, para seguir probando
// pantallas que necesitan contactos ya existentes (y de paso cubrir un import válido,
// que antes solo se probaba con JSON inválido).
const SEED_CONTACTS = [
  { id: 1, name: 'Camila Rojas', role: 'Familia', priority: 'Alta', birthday: '1998-09-09', remind: 5, notif: true,
    notes: 'Le encanta el senderismo y el café de especialidad.',
    history: [{ date: isoDaysAgo(9), note: '' }] },
  { id: 2, name: 'Tomás Herrera', role: 'Amigos', priority: 'Alta', birthday: null, remind: 3, notif: true,
    notes: 'Fanático de la fórmula 1 y la cerveza artesanal.',
    history: [{ date: isoDaysAgo(20), note: '' }] },
  { id: 3, name: 'Rosa Elena Díaz', role: 'Familia', priority: 'Alta', birthday: '1952-09-25', remind: 7, notif: true,
    notes: 'Le gustan las plantas de interior y las novelas históricas.',
    history: [{ date: isoDaysAgo(35), note: '' }] },
];

// El campo de cumpleaños ahora es un DateSelect (3 <select> día/mes/año) en vez de <input type="date">.
async function fillDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const selects = page.locator('select');
  await selects.nth(0).selectOption(String(d));
  await selects.nth(1).selectOption(String(m));
  await selects.nth(2).selectOption(String(y));
}

try {
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });

  // --- Onboarding: primer uso (1. bienvenida, 2. nombre, 3. permisos) ---
  await page.waitForSelector('text=Bienvenido a KeepBonds', { timeout: 10000 });
  await shot('00a-onboarding-welcome.png');
  await page.locator('button:has-text("Continuar")').click();
  await page.waitForTimeout(200);

  await page.waitForSelector('text=¿Cómo te llamas?', { timeout: 10000 });
  await shot('00b-onboarding-name.png');
  await page.locator('input[placeholder="Tu nombre"]').fill('Prueba QA');
  await page.locator('button:has-text("Continuar")').click();
  await page.waitForTimeout(200);

  await page.waitForSelector('text=Antes de empezar', { timeout: 10000 });
  await shot('00b2-onboarding-permissions.png');
  await page.locator('button:has-text("Empezar a usar KeepBonds")').click();
  await page.waitForTimeout(300);

  // --- Estado vacío (app recién instalada, sin contactos) ---
  await page.waitForSelector('text=Hola,', { timeout: 10000 });
  await shot('00c-home-empty.png');
  const emptyMsg = await page.locator('text=Aún no tienes a nadie aquí').count();
  if (emptyMsg === 0) issues.push('BUG: no se muestra el estado vacío esperado cuando no hay contactos.');

  // Sembrar contactos de prueba vía Ajustes > Respaldo local > Importar.
  await page.locator('.icon-btn').first().click();
  await page.waitForTimeout(200);
  await page.locator('text=Respaldo local (exportar / importar)').click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await page.locator('textarea[placeholder="Pega aquí el JSON del respaldo..."]').fill(JSON.stringify(SEED_CONTACTS));
  await page.locator('button:has-text("Importar y reemplazar")').click();
  await page.waitForTimeout(300);
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click(); // Ajustes -> Inicio
  await page.waitForTimeout(200);

  await page.waitForSelector('text=Hola,', { timeout: 10000 });
  const importedOk = await page.locator('text=Camila Rojas').count();
  if (importedOk === 0) issues.push('BUG: el respaldo importado no dejó los contactos de prueba disponibles.');
  await shot('01-home.png');

  // --- Scroll test on Home: el botón flotante "Añadir" debe quedarse fijo ---
  const fab = page.locator('button.btn-primary:has-text("Añadir")');
  const fabBefore = await fab.boundingBox();
  await page.evaluate(() => {
    document.querySelector('.screen-scroll').scrollTop = 800;
  });
  await page.waitForTimeout(200);
  await shot('02-home-scrolled.png');
  const fabAfter = await fab.boundingBox();
  if (!fabBefore || !fabAfter) {
    issues.push('SCROLL BUG: el botón flotante "Añadir" no se encontró antes/después de scrollear.');
  } else if (Math.abs(fabBefore.y - fabAfter.y) > 2) {
    issues.push(`SCROLL BUG: el botón "Añadir" se movió de y=${fabBefore.y} a y=${fabAfter.y} al scrollear (debería quedarse fijo).`);
  } else {
    console.log('OK: el botón "Añadir" se mantiene fijo al scrollear en Inicio.');
  }
  await page.evaluate(() => { document.querySelector('.screen-scroll').scrollTop = 0; });

  // --- Notificaciones (campanita) ---
  await page.locator('.icon-btn').nth(1).click();
  await page.waitForTimeout(300);
  await shot('02b-notifications.png');
  const notifTitle = await page.locator('text=A quién te toca hablar').count();
  if (notifTitle === 0) issues.push('BUG: el panel de notificaciones no se abrió al tocar la campanita.');
  await page.mouse.click(20, 20);
  await page.waitForTimeout(200);

  // --- Settings ---
  await page.locator('.icon-btn').first().click();
  await page.waitForTimeout(300);
  await shot('03-settings.png');
  const permsSection = await page.locator('text=Permisos').count();
  if (permsSection === 0) issues.push('BUG: no aparece la sección Permisos en Ajustes.');
  // toggle dark theme (primer switch = Tema oscuro, segundo = Vista compacta)
  await page.locator('.switch-track').nth(0).click();
  await page.waitForTimeout(200);
  await shot('04-settings-dark.png');
  await page.locator('.switch-track').nth(0).click();
  await page.waitForTimeout(200);
  // back to home
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);

  // --- Añadir (asistente paso a paso): manual ---
  const next = () => page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.locator('text=Añadir').first().click();
  await page.waitForTimeout(200);
  await shot('05-add.png');
  await page.locator('button:has-text("Escribirlo yo")').click();
  await page.waitForTimeout(150);
  // Sin nombre no se puede avanzar
  const nextDisabled = await page.getByRole('button', { name: 'Siguiente', exact: true }).isDisabled();
  if (!nextDisabled) issues.push('BUG: "Siguiente" debería estar deshabilitado sin nombre.');
  await page.locator('input[placeholder="Ej: María José Fuentes"]').fill('Persona de Prueba');
  await page.locator('input[type="tel"]').fill('+56 9 1111 1111');
  await shot('05a-add-name.png');
  await next(); // nombre -> rol
  await page.waitForTimeout(150);
  await next(); // rol -> cumpleaños

  // --- Validación: fecha de nacimiento en el futuro debe rechazarse ---
  // (el selector de año del DateSelect no ofrece años futuros, así que usamos una
  // fecha futura dentro del año actual: 28 de diciembre.)
  const now = new Date();
  const future = new Date(now.getFullYear(), 11, 28);
  const futureIso = future.toISOString().slice(0, 10);
  await fillDate(futureIso);
  await next();
  await page.waitForTimeout(200);
  await shot('05b-add-future-date-error.png');
  const futureErrorShown = await page.locator('text=no puede ser en el futuro').count();
  if (futureErrorShown === 0) issues.push('BUG: no se mostró el mensaje de error de fecha futura (o avanzó de paso).');

  // corregir la fecha y seguir hasta guardar
  await fillDate('1990-01-15');
  await next(); // -> prioridad
  await page.waitForTimeout(150);
  await next(); // -> frecuencia
  await page.waitForTimeout(150);
  await next(); // -> fechas importantes
  await page.waitForTimeout(150);
  await next(); // -> notas
  await page.waitForTimeout(150);
  await page.locator('textarea').fill('Le gusta el café');
  await shot('05c-add-notes.png');
  await page.locator('button:has-text("Guardar a Persona")').click();
  await page.waitForTimeout(300);
  await shot('06-home-after-add.png');
  const added = await page.locator('text=Persona de Prueba').count();
  if (added === 0) issues.push('BUG: el contacto agregado manualmente no aparece en Inicio.');

  // --- Orden en Inicio ---
  const sortBtn = page.locator('button:has-text("Nombre")').first();
  if (await sortBtn.count()) {
    await sortBtn.click();
    await page.waitForTimeout(150);
    const sortChanged = await page.locator('button:has-text("Más atrasados")').count();
    if (sortChanged === 0) issues.push('BUG: el botón de orden no cambió a "Más atrasados" tras tocarlo.');
    await page.locator('button:has-text("Más atrasados")').first().click(); // volver a ciclar, deja "Próx. cumpleaños"
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Próx. cumpleaños")').first().click(); // ciclar una vez más, vuelve a "Nombre"
    await page.waitForTimeout(150);
  } else {
    issues.push('BUG: no se encontró el botón de orden ("Nombre") junto a "Tu gente".');
  }

  // --- Segundo contacto: sin cumpleaños (Omitir), rol personalizado y fecha importante cíclica ---
  await page.locator('text=Añadir').first().click();
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Escribirlo yo")').click();
  await page.locator('input[placeholder="Ej: María José Fuentes"]').fill('Persona Sin Cumple');
  await next(); // -> rol

  await page.locator('button:has-text("+ Otro")').click();
  await page.locator('input[placeholder="Ej: Compañeros de trabajo"]').fill('Compañeros de trabajo');
  await page.locator('button.btn-primary:has-text("Añadir")').click();
  await page.waitForTimeout(150);
  await next(); // -> cumpleaños
  await page.getByRole('button', { name: 'Omitir', exact: true }).click(); // -> prioridad
  await page.waitForTimeout(150);
  await next(); // -> frecuencia
  await next(); // -> fechas importantes
  await page.waitForTimeout(150);

  await page.locator('button:has-text("+ Añadir fecha")').click();
  await page.waitForTimeout(150);
  await page.locator('input[placeholder^="Nombre de la fecha"]').fill('Día del padre');
  // Modo por defecto ya es "Cíclica": el DateSelect de esta fecha no debe pedir año.
  const dateFormScope = page.locator('input[placeholder^="Nombre de la fecha"]').locator('xpath=..');
  const cyclicSelects = dateFormScope.locator('select');
  const cyclicSelectCount = await cyclicSelects.count();
  if (cyclicSelectCount !== 2) issues.push(`BUG: una fecha cíclica debería pedir solo día y mes (2 selects), pero se encontraron ${cyclicSelectCount}.`);
  await cyclicSelects.nth(0).selectOption('19');
  await cyclicSelects.nth(1).selectOption('6');
  await page.locator('button:has-text("Guardar")').last().click();
  await page.waitForTimeout(200);
  const cyclicDateAdded = await page.locator('text=Día del padre').count();
  if (cyclicDateAdded === 0) issues.push('BUG: la fecha cíclica añadida en el asistente no aparece.');
  await next(); // -> notas
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Omitir y guardar', exact: true }).click();
  await page.waitForTimeout(300);
  await shot('06b-home-after-add-no-birthday.png');

  const customRoleFilterChip = await page.locator('button.chip:has-text("Compañeros de trabajo")').count();
  if (customRoleFilterChip === 0) issues.push('BUG: el rol personalizado "Compañeros de trabajo" no aparece como filtro en Inicio.');

  await page.locator('text=Persona Sin Cumple').first().click();
  await page.waitForTimeout(200);
  await shot('08f-detail-no-birthday.png');
  const phantomBirthdayAlert = await page.locator('text=Alerta de cumpleaños').count();
  if (phantomBirthdayAlert > 0) issues.push('BUG: se muestra "Alerta de cumpleaños" para un contacto sin fecha de cumpleaños asignada.');
  const cyclicDateInDetail = await page.locator('text=Día del padre').count();
  if (cyclicDateInDetail === 0) issues.push('BUG: la fecha cíclica no se guardó correctamente al crear el contacto.');
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);

  // --- Add screen: desde contactos (sin plugin nativo -> debe mostrar error, no crashear) ---
  await page.locator('text=Añadir').first().click();
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Desde mis contactos")').click();
  await page.waitForTimeout(500);
  await shot('07-add-contacts-fallback.png');
  if (await page.locator('text=¿A quién quieres añadir?').count() === 0) issues.push('BUG: elegir "Desde mis contactos" no llevó al paso de elegir contacto.');

  // volver a home
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.waitForTimeout(200);

  // --- Detail screen ---
  await page.locator('text=Persona de Prueba').first().click();
  await page.waitForTimeout(200);
  await shot('08-detail.png');

  // --- Editar persona (lápiz) ---
  await page.locator('button:has(svg path[d^="M17 3a2.85 2.83"])').click();
  await page.waitForTimeout(200);
  await shot('08b-edit.png');
  const onEditScreen = await page.locator('text=Editar persona').count();
  if (onEditScreen === 0) issues.push('BUG: el lápiz no abrió la pantalla de edición.');
  await page.locator('.screen-scroll input.input').first().fill('Persona Editada');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.waitForTimeout(300);
  await shot('08c-after-edit.png');
  const editedNameShown = await page.locator('text=Persona Editada').count();
  if (editedNameShown === 0) issues.push('BUG: el cambio de nombre en Editar persona no se reflejó en el Detalle.');

  // --- Chip de Mensaje (WhatsApp) — solo verificamos que exista, sin tocarlo (navegaría fuera de la app) ---
  const whatsappChip = await page.locator('button:has-text("Mensaje")').count();
  if (whatsappChip === 0) issues.push('BUG: no aparece el botón "Mensaje" (WhatsApp) para un contacto con teléfono.');

  // --- Posponer / snooze ---
  await page.locator('button:has-text("1 semana")').click();
  await page.waitForTimeout(200);
  await shot('08d-detail-snoozed.png');
  const snoozedShown = await page.locator('text=Pospuesto').count();
  if (snoozedShown === 0) issues.push('BUG: tras posponer 1 semana no se muestra el estado "Pospuesto".');
  await page.locator('button:has-text("Cancelar posponer")').click();
  await page.waitForTimeout(200);
  const snoozeCancelled = await page.locator('button:has-text("1 semana")').count();
  if (snoozeCancelled === 0) issues.push('BUG: "Cancelar posponer" no devolvió la tarjeta a su estado normal.');

  // --- Fechas importantes (con año, ej. aniversario) ---
  await page.locator('button:has-text("+ Añadir fecha")').click();
  await page.waitForTimeout(200);
  await page.locator('input[placeholder^="Nombre de la fecha"]').fill('Aniversario');
  await page.locator('button[data-mode="yearly"]').click();
  const selectsInDate = page.locator('select');
  await selectsInDate.nth(0).selectOption('20');
  await selectsInDate.nth(1).selectOption('6');
  await selectsInDate.nth(2).selectOption('2015');
  await page.locator('button:has-text("Guardar")').last().click();
  await page.waitForTimeout(300);
  await shot('08e-detail-important-date.png');
  const dateAdded = await page.locator('text=Aniversario').count();
  if (dateAdded === 0) issues.push('BUG: la fecha importante añadida ("Aniversario") no aparece en el detalle.');
  // eliminarla de nuevo para dejar el contacto limpio
  const deleteDateBtn = page.locator('button:has(svg path[d="M18 6L6 18M6 6l12 12"])').first();
  if (await deleteDateBtn.count()) {
    await deleteDateBtn.click();
    await page.waitForTimeout(200);
  }

  // --- Fecha "Una vez" en el futuro (ej: matrimonio de una tía el próximo año) ---
  const nextYear = String(new Date().getFullYear() + 1);
  await page.locator('button:has-text("+ Añadir fecha")').click();
  await page.waitForTimeout(150);
  await page.locator('input[placeholder^="Nombre de la fecha"]').fill('Matrimonio');
  await page.locator('button[data-mode="once"]').click();
  {
    const scope = page.locator('input[placeholder^="Nombre de la fecha"]').locator('xpath=..');
    const sel = scope.locator('select');
    await sel.nth(0).selectOption('15');
    await sel.nth(1).selectOption('3');
    const years = await sel.nth(2).locator('option').allTextContents();
    if (!years.includes(nextYear)) issues.push(`BUG: "Una vez" no ofrece el año ${nextYear} (años: ${years.slice(0,4).join(', ')}...).`);
    await sel.nth(2).selectOption(nextYear);
  }
  await page.locator('button:has-text("Guardar")').last().click();
  await page.waitForTimeout(300);
  await shot('08g-detail-once-future.png');
  if (await page.locator('text=Matrimonio').count() === 0) issues.push('BUG: no se pudo guardar una fecha "Una vez" en el futuro.');
  const onceLine = await page.locator('text=Matrimonio').first().locator('xpath=..').textContent();
  if (!/en \d+ días/.test(onceLine)) issues.push(`BUG: la fecha futura no muestra cuántos días faltan ("${onceLine}").`);

  // "Una vez" en el pasado y "Aniversario" en el futuro deben rechazarse con un mensaje claro
  await page.locator('button:has-text("+ Añadir fecha")').click();
  await page.waitForTimeout(150);
  await page.locator('input[placeholder^="Nombre de la fecha"]').fill('Fecha inválida');
  await page.locator('button[data-mode="yearly"]').click();
  {
    const scope = page.locator('input[placeholder^="Nombre de la fecha"]').locator('xpath=..');
    const sel = scope.locator('select');
    const yearsYearly = await sel.nth(2).locator('option').allTextContents();
    if (yearsYearly.includes(nextYear)) issues.push('BUG: "Aniversario" ofrece años futuros.');
    await sel.nth(0).selectOption('31');
    await sel.nth(1).selectOption('12');
    await sel.nth(2).selectOption(String(new Date().getFullYear()));
  }
  await page.locator('button:has-text("Guardar")').last().click();
  await page.waitForTimeout(200);
  const today = new Date();
  const isLastDay = today.getMonth() === 11 && today.getDate() === 31;
  if (!isLastDay && await page.locator('text=Si todavía no ocurre').count() === 0) issues.push('BUG: un aniversario en el futuro no mostró el aviso para usar "Una vez".');
  await page.locator('button:has-text("Cancelar")').last().click();
  await page.waitForTimeout(150);

  // limpiar la fecha "Matrimonio"
  {
    const row = page.locator('text=Matrimonio').first().locator('xpath=../..');
    await row.locator('button').last().click();
    await page.waitForTimeout(200);
  }

  await page.locator('button:has-text("Marcar como hablado hoy")').click();
  await page.waitForTimeout(300);
  await shot('09-detail-after-mark.png');
  await page.waitForTimeout(2200); // dejar que el toast desaparezca antes de seguir
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);

  // --- "Te toca hablar con" vive en la campana (no en Inicio) ---
  await page.evaluate(() => { document.querySelector('.screen-scroll').scrollTop = 0; });
  if (await page.locator('text=Te toca hablar con').count() > 0) issues.push('BUG: "Te toca hablar con" sigue apareciendo en Inicio (debería estar solo en la campana).');
  const badge = await page.locator('.badge-count').first().textContent().catch(() => '');
  await page.locator('.icon-btn').nth(1).click();
  await page.waitForTimeout(300);
  await shot('10-today.png');
  if (await page.locator('text=Te toca hablar con').count() === 0) issues.push('BUG: la campana no muestra "Te toca hablar con" con contactos atrasados.');
  const listTitle = await page.locator('text=Te toca hablar con').first().textContent().catch(() => '');
  if (badge && !listTitle.includes(badge)) issues.push(`BUG: el número de la campana (${badge}) no coincide con la lista ("${listTitle}").`);
  if (await page.locator('text=Registrar').count() > 0) issues.push('BUG: todavía aparece un botón "Registrar" aparte.');
  const llamarBtn = page.locator('button[title="Llamar"]').first();
  if (await llamarBtn.count()) {
    await llamarBtn.click();
    await page.waitForTimeout(300);
    // Los contactos de ejemplo no tienen teléfono guardado: debe avisar con un toast
    // en vez de fingir que se hizo una llamada.
    const noPhoneToast = await page.locator('text=no tiene teléfono guardado').count();
    if (noPhoneToast === 0) issues.push('BUG: al tocar "Llamar" en un contacto sin teléfono no se avisó con un toast.');
    await page.waitForTimeout(2200); // dejar que el toast desaparezca

    const titleBefore = await page.locator('text=Te toca hablar con').first().textContent();
    await page.locator('button[title="Registrar"]').first().click();
    await page.waitForTimeout(200);
    await page.locator('textarea[placeholder="¿De qué hablaron? (opcional)"]').fill('Prueba automatizada de nota.');
    await page.getByRole('button', { name: 'Ya hablamos', exact: true }).click();
    await page.waitForTimeout(300);
    await shot('11-today-after-log.png');
    const titleAfter = (await page.locator('text=Te toca hablar con').count()) ? await page.locator('text=Te toca hablar con').first().textContent() : '';
    if (titleBefore === titleAfter) issues.push('BUG: registrar desde "Te toca hablar con" no sacó al contacto de la lista.');
    await page.waitForTimeout(2200);
  } else {
    issues.push('INFO: no había contactos pendientes para probar el flujo de Llamar (puede ser normal).');
  }

  // cerrar la hoja de la campana
  await page.mouse.click(20, 20);
  await page.waitForTimeout(200);

  // --- Backup sheet ---
  await page.locator('.icon-btn').first().click();
  await page.waitForTimeout(200);
  await page.locator('text=Respaldo local (exportar / importar)').click();
  await page.waitForTimeout(200);
  await shot('12-backup.png');
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await page.locator('textarea[placeholder="Pega aquí el JSON del respaldo..."]').fill('esto no es json valido');
  await page.locator('button:has-text("Importar y reemplazar")').click();
  await page.waitForTimeout(200);
  await shot('13-backup-import-error.png');
  await page.mouse.click(20, 20);
  await page.waitForTimeout(200);

  // --- Eliminar contacto + deshacer ---
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click(); // Ajustes -> Inicio
  await page.waitForTimeout(200);
  await page.locator('text=Persona Editada').first().click();
  await page.waitForTimeout(200);
  await page.locator('button:has(svg path[d^="M17 3a2.85 2.83"])').click(); // lápiz -> Editar
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Eliminar contacto")').click();
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Toca de nuevo para eliminar")').click();
  await page.waitForTimeout(300);
  await shot('14b-after-delete.png');
  const stillListed = await page.locator('text=Persona Editada').count();
  if (stillListed !== 0) issues.push('BUG: el contacto sigue apareciendo en Inicio después de eliminarlo.');
  const undoBtn = page.locator('.toast button:has-text("Deshacer")');
  if (await undoBtn.count() === 0) {
    issues.push('BUG: no apareció el botón "Deshacer" en el toast tras eliminar un contacto.');
  } else {
    await undoBtn.click();
    await page.waitForTimeout(300);
    const restored = await page.locator('text=Persona Editada').count();
    if (restored === 0) issues.push('BUG: "Deshacer" no restauró el contacto eliminado.');
  }

} catch (e) {
  issues.push(`TEST SCRIPT ERROR: ${e.message}`);
} finally {
  await browser.close();
  server.close();
}

console.log('\n=== ISSUES ===');
if (issues.length === 0) console.log('Ninguno detectado.');
else issues.forEach((i) => console.log('- ' + i));

fs.writeFileSync(path.join(OUT, 'issues.txt'), issues.join('\n'));
