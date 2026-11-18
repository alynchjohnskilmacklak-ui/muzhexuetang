// 缩到1200px宽再压webp
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\Users\\Administrator\\AppData\\Local\\Temp\\mzx-pdfs\\crops-bio7';
const OUT = path.join(__dirname, '..', 'public', 'images', 'practice', 'real');

const JOBS = ['bio7-q1', 'bio7-q2'];

(async () => {
  for (const name of JOBS) {
    const src = path.join(SRC, `${name}.png`);
    const dst = path.join(OUT, `${name}.webp`);
    if (!fs.existsSync(src)) { console.log('MISS', src); continue; }
    const info = await sharp(src)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(dst);
    console.log(`${name}: ${info.width}x${info.height} ${Math.round(info.size / 1024)}KB`);
  }
})();
