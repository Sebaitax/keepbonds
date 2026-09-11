import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('www');
const PORT = 5199;
const OUT = path.resolve('play-assets/screenshots');
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

function isoDaysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function isoInDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function isoBirthdayInDays(n, age) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${new Date().getFullYear() - age}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const settings = { userName: 'Sebastián', theme: 'light', compact: false, defaultRemind: 5, defaultFreq: 'Quincenal', onboarded: true, language: 'es' };
const contacts = [
  { id: 1, name: 'Camila Rojas', role: 'Familia', priority: 'Alta', birthday: isoBirthdayInDays(4, 28), remind: 5, notif: true,
    notes: 'Le encanta el senderismo y el café de especialidad. Está aprendiendo a tejer.',
    history: [{ date: isoDaysAgo(2), note: 'Habló de su viaje a Pucón, llegó feliz.' }],
    birthdayNote: 'Este año lo celebra el sábado, no el día exacto. Juntarse a almorzar.' },
  { id: 2, name: 'Tomás Herrera', role: 'Amigos', priority: 'Alta', birthday: null, remind: 3, notif: true,
    notes: 'Fanático de la fórmula 1 y la cerveza artesanal. Anda buscando departamento nuevo.',
    history: [{ date: isoDaysAgo(9), note: '' }] },
  { id: 3, name: 'Rosa Elena Díaz', role: 'Familia', priority: 'Alta', birthday: isoBirthdayInDays(20, 74), remind: 7, notif: true,
    notes: 'Le gustan las plantas de interior y las novelas históricas.',
    history: [{ date: isoDaysAgo(35), note: 'La rodilla sigue igual, va al doctor el jueves.' }] },
  { id: 4, name: 'Ignacio Soto', role: 'Conocidos', priority: 'Baja', birthday: null, remind: 14, notif: false,
    notes: 'Compañero de universidad, ahora trabaja en diseño gráfico.',
    history: [{ date: isoDaysAgo(6), note: '' }],
    importantDates: [{ id: 'a1', label: 'Aniversario de matrimonio', mode: 'yearly', date: isoInDays(45) }] },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${PORT}/index.html`);
await page.evaluate(({ s, c }) => {
  localStorage.setItem('keepbonds_settings_v1', JSON.stringify(s));
  localStorage.setItem('keepbonds_contacts_v2', JSON.stringify(c));
}, { s: settings, c: contacts });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('text=Hola,', { timeout: 10000 });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'home-light.png') });

// Detail screen
await page.locator('text=Camila Rojas').first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'detail.png') });
await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
await page.waitForTimeout(200);

// Settings screen (bilingual toggle)
await page.locator('.icon-btn').first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'settings.png') });
await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click();
await page.waitForTimeout(200);

// Registrar (QuickLog) sheet
await page.locator('button:has(svg path[d^="M22 16.92v3a2 2 0 0 1-2.18"])').first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'quicklog.png') });
await page.mouse.click(20, 20);
await page.waitForTimeout(200);

// Dark mode home
await page.evaluate((s) => {
  s.theme = 'dark';
  localStorage.setItem('keepbonds_settings_v1', JSON.stringify(s));
}, settings);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('text=Hola,', { timeout: 10000 });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'home-dark.png') });

await browser.close();
server.close();
console.log('done');
