import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const CANVAS_W = 1080;
const CANVAS_H = 1920; // 9:16, within Play Console's 320-3840px + 16:9/9:16 requirement
const LIGHT_BG = '#F6EFE2';
const DARK_BG = '#221E19';

const SRC_DIR = 'play-assets/screenshots';
const OUT_DIR = 'play-assets/tablet-screenshots';
fs.mkdirSync(OUT_DIR, { recursive: true });

const files = [
  { name: 'home-light.png', bg: LIGHT_BG },
  { name: 'detail.png', bg: LIGHT_BG },
  { name: 'settings.png', bg: LIGHT_BG },
  { name: 'quicklog.png', bg: LIGHT_BG },
  { name: 'home-dark.png', bg: DARK_BG },
];

for (const { name, bg } of files) {
  const srcPath = path.join(SRC_DIR, name);
  const meta = await sharp(srcPath).metadata();
  // Scale the phone screenshot up to fill most of the tablet canvas height, then center it.
  const targetH = Math.round(CANVAS_H * 0.94);
  const scale = targetH / meta.height;
  const targetW = Math.round(meta.width * scale);
  const resized = await sharp(srcPath).resize(targetW, targetH).png().toBuffer();

  await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: bg } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, name));
  console.log('wrote', path.join(OUT_DIR, name));
}
