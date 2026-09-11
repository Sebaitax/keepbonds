import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('www');
const PORT = 5178;
const OUT = path.resolve('test-screens-stress');
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

// ---------- Generar datos de estrés ----------
function isoDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
const FIRST = ['María','José','Antonia','Francisca','Camila','Valentina','Javiera','Constanza','Catalina','Fernanda',
  'Ignacio','Matías','Benjamín','Vicente','Diego','Tomás','Joaquín','Cristóbal','Nicolás','Agustín','Sofía','Amanda'];
const LAST = ['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda','Morales','Vera','Bravo','Reyes','Torres'];
const NOTE_SENTENCES = [
  'Le encanta salir a caminar los fines de semana.',
  'Está estudiando para un examen importante este mes.',
  'Cambió de trabajo hace poco, preguntar cómo le está yendo.',
  'Su mamá estuvo enferma, preguntar cómo sigue la familia.',
  'Le gustan mucho las plantas, tiene un patio lleno.',
  'Anda con ganas de viajar el próximo verano.',
];

const contacts = [];
for (let i = 1; i <= 62; i++) {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 3) % LAST.length];
  let name = `${first} ${last}`;
  if (i === 5) name = 'Bartolomé Nepomuceno de la Santísima Trinidad González Pérez del Campo';
  if (i === 11) name = 'Zoë 🌸';
  if (i === 17) name = 'A';
  if (i === 23) name = '   Nombre Con Espacios   '.trim();

  const role = ['Familia', 'Amigos', 'Conocidos'][i % 3];
  const priority = ['Alta', 'Media', 'Baja'][i % 3];
  const historyCount = i % 7; // 0..6 entradas
  const history = [];
  for (let h = 0; h < historyCount; h++) {
    const daysAgo = h * (3 + (i % 5)) + (i % 3);
    const note = (h === 0 && i % 4 === 0) ? NOTE_SENTENCES[i % NOTE_SENTENCES.length] : '';
    history.push({ date: isoDaysAgo(daysAgo), note });
  }

  let birthday = null;
  let birthdayNote = '';
  if (i % 2 === 0) {
    const year = i === 7 ? 1925 : (i === 13 ? new Date().getFullYear() : 1950 + (i % 60));
    const month = String(1 + (i % 12)).padStart(2, '0');
    const day = String(1 + (i % 27)).padStart(2, '0');
    birthday = `${year}-${month}-${day}`;
    if (i % 10 === 0) birthdayNote = 'Este año lo celebra el fin de semana siguiente, no el día exacto. Hay que juntar plata para el regalo grupal con el resto de la familia.';
  }

  let notes = '';
  if (i % 3 === 0) notes = NOTE_SENTENCES[(i + 2) % NOTE_SENTENCES.length];
  if (i === 8) notes = NOTE_SENTENCES.join(' ') + ' ' + NOTE_SENTENCES.join(' '); // nota muy larga

  contacts.push({
    id: i, name, role, priority,
    birthday, remind: [3, 5, 7, 14][i % 4],
    notif: i % 5 !== 0,
    notes, birthdayNote,
    history,
    freq: ['Semanal', 'Quincenal', 'Mensual', 'Trimestral'][i % 4],
  });
}

const settings = {
  userName: 'Estrés QA', theme: 'light', compact: false,
  defaultRemind: 5, defaultFreq: 'Quincenal', onboarded: true, language: 'es',
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'es-CL' });
const issues = [];
page.on('pageerror', (err) => issues.push(`PAGE ERROR: ${err.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') issues.push(`CONSOLE ERROR: ${msg.text()}`); });

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log('shot:', name);
}

await page.addInitScript(({ contacts, settings }) => {
  localStorage.setItem('keepbonds_contacts_v2', JSON.stringify(contacts));
  localStorage.setItem('keepbonds_settings_v1', JSON.stringify(settings));
}, { contacts, settings });

try {
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Hola,', { timeout: 10000 });
  await shot('01-home-62-contacts.png');

  const countText = await page.locator('text=/Tu gente \\(\\d+\\)/').first().textContent();
  console.log('Conteo mostrado:', countText);
  if (!countText || !countText.includes('62')) issues.push(`BUG: el contador de "Tu gente" no muestra 62 (mostró: ${countText}).`);

  // Scroll largo
  await page.evaluate(() => { document.querySelector('.screen-scroll').scrollTop = 3000; });
  await page.waitForTimeout(200);
  await shot('02-home-scrolled-deep.png');

  // Buscar
  await page.evaluate(() => { document.querySelector('.screen-scroll').scrollTop = 0; });
  await page.locator('input[placeholder="Buscar por nombre..."]').fill('a');
  await page.waitForTimeout(200);
  await shot('03-search-a.png');
  await page.locator('input[placeholder="Buscar por nombre..."]').fill('');

  // Filtro compacto
  await page.locator('.icon-btn').first().click();
  await page.waitForTimeout(200);
  await page.locator('.switch-track').nth(1).click(); // vista compacta
  await page.waitForTimeout(200);
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);
  await shot('04-home-compact-62.png');
  // volver a modo normal
  await page.locator('.icon-btn').first().click();
  await page.waitForTimeout(200);
  await page.locator('.switch-track').nth(1).click();
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);

  // Notificaciones con muchas alertas
  await page.locator('.icon-btn').nth(1).click();
  await page.waitForTimeout(300);
  await shot('05-notifications-many.png');
  await page.mouse.click(20, 20);
  await page.waitForTimeout(200);

  // Contacto con nombre larguísimo
  await page.locator('text=Bartolomé').first().click();
  await page.waitForTimeout(200);
  await shot('06-detail-long-name.png');
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);

  // Contacto con nota larguísima (id 8)
  const longNoteCard = page.locator('.card', { hasText: 'notas' }).first();
  await page.locator('text=/./').first(); // noop
  // Buscamos por nombre del contacto id 8: first = FIRST[8%22]=Fernanda, last=LAST[24%15]=Bravo -> "Fernanda Bravo"
  const c8 = contacts.find(c => c.id === 8);
  await page.locator(`text=${c8.name}`).first().click();
  await page.waitForTimeout(200);
  await shot('07-detail-long-note.png');
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);

  // Contacto recién nacido (id 13, cumpleaños este año)
  const c13 = contacts.find(c => c.id === 13);
  await page.locator(`text=${c13.name}`).first().click();
  await page.waitForTimeout(200);
  await shot('08-detail-newborn-birthday.png');
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);

  // Contacto viejito (id 7, nacido 1925)
  const c7 = contacts.find(c => c.id === 7);
  await page.locator(`text=${c7.name}`).first().click();
  await page.waitForTimeout(200);
  await shot('09-detail-old-birthday.png');
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);

  // Registrar sheet con muchos pendientes
  await page.locator('button:has(svg path[d^="M22 16.92v3a2 2 0 0 1-2.18"])').first().click();
  await page.waitForTimeout(300);
  await shot('10-quicklog-many.png');
  await page.mouse.click(20, 20);
  await page.waitForTimeout(200);

  // Respaldo con muchos datos
  await page.locator('.icon-btn').first().click();
  await page.waitForTimeout(200);
  await page.locator('text=Respaldo local (exportar / importar)').click();
  await page.waitForTimeout(200);
  await shot('11-backup-export-62.png');
  await page.mouse.click(20, 20);
  await page.waitForTimeout(200);

  // Tema oscuro con dataset grande
  await page.locator('.switch-track').nth(0).click();
  await page.waitForTimeout(200);
  await shot('12-settings-dark-stress.png');
  await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
  await page.waitForTimeout(200);
  await shot('13-home-dark-62.png');

} catch (e) {
  issues.push(`TEST SCRIPT ERROR: ${e.message}\n${e.stack}`);
} finally {
  await browser.close();
  server.close();
}

console.log('\n=== ISSUES ===');
if (issues.length === 0) console.log('Ninguno detectado.');
else issues.forEach((i) => console.log('- ' + i));
fs.writeFileSync(path.join(OUT, 'issues.txt'), issues.join('\n'));
