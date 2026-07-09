// One-off: optimise downloads/Comic/*.png -> public/comic/*.webp
// Run: node optimize-comic.js   (sharp is already a dependency)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'downloads', 'Comic');
const out = path.join(__dirname, 'public', 'comic');
fs.mkdirSync(out, { recursive: true });

const jobs = [
  { in: 'cover.png', out: 'cover.webp', width: 560, q: 82 },
  { in: '1.png', out: '1.webp', width: 1100, q: 80 },
  { in: '2.png', out: '2.webp', width: 1100, q: 80 },
  { in: '3.png', out: '3.webp', width: 1100, q: 80 },
  { in: '4.png', out: '4.webp', width: 1100, q: 80 },
];

(async () => {
  for (const j of jobs) {
    const dst = path.join(out, j.out);
    await sharp(path.join(src, j.in))
      .resize({ width: j.width, withoutEnlargement: true })
      .webp({ quality: j.q })
      .toFile(dst);
    const kb = (fs.statSync(dst).size / 1024).toFixed(0);
    console.log(j.out, '->', kb + 'KB');
  }
})().catch((e) => { console.error(e); process.exit(1); });
