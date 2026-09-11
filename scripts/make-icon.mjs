import sharp from 'sharp';
import fs from 'node:fs';

const SIZE = 1024;
const SPLASH_SIZE = 2732;
const SPLASH_CREAM = '#F6EFE2';
const SPLASH_CREAM_DARK = '#221E19'; // matches .app-root.theme-dark --cream
// icon-source.svg is a flat trace (art + white background baked into the same
// paths), so the foreground layer is derived from it by stripping the
// background shapes, not from a separate hand-authored SVG.
const FOREGROUND_SCALE = 0.72; // keeps the art inside the adaptive-icon safe zone
const SPLASH_GLYPH_SIZE = 1200; // ~ matches the old thin-ring glyph's footprint on the 2732 canvas

await sharp('assets/icon-source.svg').resize(SIZE, SIZE).png().toFile('assets/icon.png');
await sharp('assets/icon-background.svg').resize(SIZE, SIZE).png().toFile('assets/icon-background.png');

let sourceSvg = fs.readFileSync('assets/icon-source.svg', 'utf8');
sourceSvg = sourceSvg.replace('<rect x="0" y="0" width="1024" height="1024" fill="#ffffff"/>', '');
sourceSvg = sourceSvg.replace(
  '<g><path fill="#ffffff" stroke="#ffffff" stroke-width="0.5"',
  '<g><path fill="none" stroke="none" stroke-width="0.5"'
);
const shrunk = await sharp(Buffer.from(sourceSvg), { density: 300 })
  .resize(Math.round(SIZE * FOREGROUND_SCALE), Math.round(SIZE * FOREGROUND_SCALE))
  .png()
  .toBuffer();
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: shrunk, gravity: 'center' }])
  .png()
  .toFile('assets/icon-foreground.png');

// Splash screen: same glyph (transparent art), centered on the app's cream background.
const splashGlyph = await sharp(Buffer.from(sourceSvg), { density: 300 })
  .resize(SPLASH_GLYPH_SIZE, SPLASH_GLYPH_SIZE)
  .png()
  .toBuffer();
await sharp({
  create: { width: SPLASH_SIZE, height: SPLASH_SIZE, channels: 4, background: SPLASH_CREAM }
}).composite([{ input: splashGlyph, gravity: 'center' }])
  .png()
  .toFile('assets/splash.png');

await sharp({
  create: { width: SPLASH_SIZE, height: SPLASH_SIZE, channels: 4, background: SPLASH_CREAM_DARK }
}).composite([{ input: splashGlyph, gravity: 'center' }])
  .png()
  .toFile('assets/splash-dark.png');

// In-app onboarding badge (bundled directly into the web app, not an Android resource).
await sharp('assets/icon-foreground.png').resize(240, 240).png().toFile('www/icon-foreground.png');

console.log('Icon, splash, and adaptive icon layers generated.');
