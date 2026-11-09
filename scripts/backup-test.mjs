// Prueba de respaldo: exporta contactos con todos sus datos, borra todo,
// importa el texto exportado y verifica que los contactos queden idénticos.
// También revisa el botón "Copiar" con el portapapeles permitido y bloqueado.
// Uso: node scripts/build.mjs && node scripts/backup-test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('www');
const PORT = 5186;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const filePath = path.join(ROOT, req.url === '/' ? '/index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(PORT, r));

const CK = 'keepbonds_contacts_v2', SK = 'keepbonds_settings_v1';
const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const rich = [
  { id: 1, name: 'Abuela Rosa Ñuñez', phone: '+56 9 1234 5678', photo: PHOTO, role: 'Familia', priority: 'Alta',
    birthday: '1941-11-14', remind: 3, notif: true, notes: 'Le gustan las "rosas" y el café\nSegunda línea', birthdayNote: 'Libro de recetas',
    history: [{ date: '2026-11-01', note: 'Hablamos del viaje' }, { date: '2026-10-20', note: '' }], freq: 'Semanal',
    importantDates: [{ id: 'd1', label: 'Aniversario', mode: 'yearly', date: '1965-03-02' }], snoozedUntil: null },
  { id: 7, name: 'Compañero 😀', phone: '', photo: '', role: 'Compañeros de trabajo', priority: 'Baja',
    birthday: null, remind: 5, notif: false, notes: '', birthdayNote: '', history: [{ date: '2026-09-01', note: '' }],
    freq: 'Trimestral', importantDates: [], snoozedUntil: '2099-01-01' },
];

const issues = [];
const browser = await chromium.launch();

async function openBackup(page){
  await page.locator('.icon-btn').first().click(); // Ajustes
  await page.locator('text=Respaldo local (exportar / importar)').click();
  await page.waitForTimeout(300);
}

// 1. Exportar -> borrar -> importar -> comparar
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-CL' });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://localhost:${PORT}` });
const page = await ctx.newPage();
page.on('pageerror', (e) => issues.push('PAGE ERROR: ' + e.message));
await page.addInitScript(([cs, ck, sk]) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem(ck, JSON.stringify(cs));
    localStorage.setItem(sk, JSON.stringify({ onboarded: true, userName: 'QA', language: 'es' }));
    sessionStorage.setItem('seeded', '1');
  }
}, [rich, CK, SK]);
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
const before = await page.evaluate((k) => localStorage.getItem(k), CK);

await openBackup(page);
const exported = await page.locator('textarea').first().inputValue();
await page.locator('button:has-text("Copiar al portapapeles")').click();
await page.waitForTimeout(300);
const clip = await page.evaluate(() => navigator.clipboard.readText());
// El portapapeles del sistema puede cambiar los saltos de línea (CRLF en Windows); el contenido debe ser el mismo.
if (clip.replace(/\r\n/g, '\n') !== exported) issues.push(`BUG: "Copiar" no dejó el respaldo completo en el portapapeles (copiado: ${clip.length} car., esperado: ${exported.length}).`);
if (await page.locator('text=Respaldo copiado').count() === 0) issues.push('BUG: no apareció el aviso de copiado.');

// borrar todo y reiniciar la app
await page.evaluate((k) => localStorage.removeItem(k), CK);
await page.reload({ waitUntil: 'networkidle' });
if (await page.locator('text=Abuela Rosa').count() > 0) issues.push('BUG: los contactos no se borraron para la prueba.');

await openBackup(page);
await page.getByRole('button', { name: 'Importar', exact: true }).click();
await page.locator('textarea').first().fill(clip); // lo pegado desde el portapapeles
await page.locator('button:has-text("Importar y reemplazar")').click();
await page.waitForTimeout(400);
const after = await page.evaluate((k) => localStorage.getItem(k), CK);
if (after !== before) {
  issues.push('BUG: lo importado no es idéntico a lo exportado.');
  const a = JSON.parse(before), b = JSON.parse(after);
  for (let i = 0; i < a.length; i++) for (const k of Object.keys(a[i])) {
    if (JSON.stringify(a[i][k]) !== JSON.stringify(b[i] && b[i][k])) issues.push(`  diferencia en contacto ${a[i].id}, campo "${k}"`);
  }
} else {
  console.log(`OK: exportar -> borrar -> importar deja los ${JSON.parse(after).length} contactos idénticos (foto, notas, historial, fechas, emoji, Ñ).`);
}
await page.locator('svg path[d="M15 18l-6-6 6-6"]').first().click(); // Ajustes -> Inicio
await page.waitForTimeout(200);
if (await page.locator('text=Abuela Rosa Ñuñez').count() === 0) issues.push('BUG: después de importar, el contacto no aparece en Inicio.');

// 2. Texto inválido: debe avisar y no tocar los datos
await openBackup(page);
await page.getByRole('button', { name: 'Importar', exact: true }).click();
await page.locator('textarea').first().fill('{"esto": "no es un respaldo"');
await page.locator('button:has-text("Importar y reemplazar")').click();
await page.waitForTimeout(200);
if (await page.locator('text=no es un respaldo válido').count() === 0) issues.push('BUG: un texto inválido no mostró error.');
const afterInvalid = await page.evaluate((k) => localStorage.getItem(k), CK);
if (afterInvalid !== before) issues.push('BUG: un texto inválido modificó los contactos.');

// 3. Portapapeles bloqueado: no debe decir "copiado"
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-CL' });
const p2 = await ctx2.newPage();
await p2.addInitScript(([cs, ck, sk]) => {
  localStorage.setItem(ck, JSON.stringify(cs));
  localStorage.setItem(sk, JSON.stringify({ onboarded: true, userName: 'QA', language: 'es' }));
  navigator.clipboard.writeText = () => Promise.reject(new Error('NotAllowedError'));
}, [rich, CK, SK]);
await p2.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await openBackup(p2);
await p2.locator('button:has-text("Copiar al portapapeles")').click();
await p2.waitForTimeout(300);
if (await p2.locator('text=Respaldo copiado').count() > 0) issues.push('BUG: con el portapapeles bloqueado igual dice "Respaldo copiado".');
const selected = await p2.evaluate(() => { const ta = document.querySelector('textarea'); return ta && document.activeElement === ta && ta.selectionEnd - ta.selectionStart === ta.value.length; });
if (!selected) issues.push('BUG: con el portapapeles bloqueado no se seleccionó el texto para copiarlo a mano.');

await browser.close();
server.close();
console.log(issues.length ? '\n=== ISSUES ===\n' + issues.join('\n') : 'OK: sin problemas.');
