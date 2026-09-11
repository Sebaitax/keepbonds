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

  // --- Scroll test on Home: verify TabBar + its center phone-icon button stay fixed ---
  const tabBarBefore = await page.locator('text=Registrar').first().boundingBox();
  await page.evaluate(() => {
    document.querySelector('.screen-scroll').scrollTop = 800;
  });
  await page.waitForTimeout(200);
  await shot('02-home-scrolled.png');
  const tabBarAfter = await page.locator('text=Registrar').first().boundingBox();
  if (!tabBarBefore || !tabBarAfter) {
    issues.push('SCROLL BUG: el botón "Registrar" (ícono de teléfono) no se encontró antes/después de scrollear.');
  } else if (Math.abs(tabBarBefore.y - tabBarAfter.y) > 2) {
    issues.push(`SCROLL BUG: el botón "Registrar" se movió de y=${tabBarBefore.y} a y=${tabBarAfter.y} al scrollear (debería quedarse fijo).`);
  } else {
    console.log('OK: TabBar/Registrar se mantiene fijo al scrollear en Inicio.');
  }
  await page.evaluate(() => { document.querySelector('.screen-scroll').scrollTop = 0; });

  // --- Notificaciones (campanita) ---
  await page.locator('.icon-btn').nth(1).click();
  await page.waitForTimeout(300);
  await shot('02b-notifications.png');
  const notifTitle = await page.locator('text=Próximos avisos').count();
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

  // --- Add screen: manual ---
  await page.locator('text=Añadir').first().click();
  await page.waitForTimeout(200);
  await shot('05-add.png');
  await page.locator('input[placeholder="Ej: María José Fuentes"]').fill('Persona de Prueba');
  await page.locator('input[type="tel"]').fill('+56 9 1111 1111');

  // --- Validación: fecha de nacimiento en el futuro debe rechazarse ---
  // (el selector de año del DateSelect no ofrece años futuros, así que usamos una
  // fecha futura dentro del año actual: 28 de diciembre.)
  const now = new Date();
  const future = new Date(now.getFullYear(), 11, 28);
  const futureIso = future.toISOString().slice(0, 10);
  await fillDate(futureIso);
  const saveBtn = page.getByRole('button', { name: 'Guardar', exact: true });
  await saveBtn.click();
  await page.waitForTimeout(200);
  await shot('05b-add-future-date-error.png');
  const stillOnAdd = await page.locator('text=Sumar a tu círculo').count();
  if (stillOnAdd === 0) issues.push('BUG: se guardó un contacto con fecha de nacimiento futura (debería haberse rechazado).');
  const futureErrorShown = await page.locator('text=no puede ser en el futuro').count();
  if (futureErrorShown === 0) issues.push('BUG: no se mostró el mensaje de error de fecha futura.');

  // corregir la fecha y guardar de verdad
  await fillDate('1990-01-15');
  await saveBtn.click();
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

  // --- Segundo contacto: sin cumpleaños, rol personalizado y fecha importante cíclica ---
  await page.locator('text=Añadir').first().click();
  await page.waitForTimeout(200);
  await page.locator('input[placeholder="Ej: María José Fuentes"]').fill('Persona Sin Cumple');

  await page.locator('button:has-text("+ Otro")').click();
  await page.locator('input[placeholder="Ej: Compañeros de trabajo"]').fill('Compañeros de trabajo');
  await page.locator('button.btn-primary:has-text("Añadir")').click();
  await page.waitForTimeout(150);

  await page.locator('button:has-text("+ Añadir fecha")').click();
  await page.waitForTimeout(150);
  await page.locator('input[placeholder^="Nombre de la fecha"]').fill('Día del padre');
  // Modo por defecto ya es "Cíclica": el DateSelect de esta fecha no debe pedir año.
  // Se escopa a los <select> dentro del propio formulario de la fecha, porque el
  // campo de Cumpleaños de más arriba también tiene sus propios <select> en la página.
  const dateFormScope = page.locator('input[placeholder^="Nombre de la fecha"]').locator('xpath=..');
  const cyclicSelects = dateFormScope.locator('select');
  const cyclicSelectCount = await cyclicSelects.count();
  if (cyclicSelectCount !== 2) issues.push(`BUG: una fecha cíclica debería pedir solo día y mes (2 selects), pero se encontraron ${cyclicSelectCount}.`);
  await cyclicSelects.nth(0).selectOption('19');
  await cyclicSelects.nth(1).selectOption('6');
  await page.locator('button:has-text("Guardar")').last().click();
  await page.waitForTimeout(200);
  const cyclicDateAdded = await page.locator('text=Día del padre').count();
  if (cyclicDateAdded === 0) issues.push('BUG: la fecha cíclica añadida en el formulario de Añadir persona no aparece.');

  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
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
  await page.locator('text=Desde contactos').click();
  await page.waitForTimeout(500);
  await shot('07-add-contacts-fallback.png');

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
  await page.locator('button:has-text("Con año")').click();
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

  await page.locator('button:has-text("Marcar como hablado hoy")').click();
  await page.waitForTimeout(300);
  await shot('09-detail-after-mark.png');
  await page.waitForTimeout(2200); // dejar que el toast desaparezca antes de seguir
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);

  // --- Registrar sheet (QuickLog) ---
  await page.locator('button:has(svg path[d^="M22 16.92v3a2 2 0 0 1-2.18"])').first().click();
  await page.waitForTimeout(300);
  await shot('10-quicklog.png');
  const llamarBtn = page.locator('button[title="Llamar"]').first();
  if (await llamarBtn.count()) {
    await llamarBtn.click();
    await page.waitForTimeout(300);
    // Los contactos de ejemplo no tienen teléfono guardado: debe avisar con un toast
    // en vez de fingir que se hizo una llamada.
    const noPhoneToast = await page.locator('text=no tiene teléfono guardado').count();
    if (noPhoneToast === 0) issues.push('BUG: al tocar "Llamar" en un contacto sin teléfono no se avisó con un toast.');
    await page.waitForTimeout(2200); // dejar que el toast desaparezca

    // Probar el flujo de "Registrar" (nota sin llamada), que no depende del teléfono.
    await page.locator('button[title="Registrar"]').first().click();
    await page.waitForTimeout(200);
    await page.locator('textarea[placeholder="¿De qué hablaron? (opcional)"]').fill('Prueba automatizada de nota.');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.waitForTimeout(300);
    await shot('11-quicklog-after-call.png');
  } else {
    issues.push('INFO: no había contactos pendientes para probar el flujo de Llamar (puede ser normal).');
  }
  // cerrar sheet
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
