// 压缩新12张裁剪图为webp(quality 80) → public/images/practice/real/
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const CROPS = 'C:\\Users\\Administrator\\AppData\\Local\\Temp\\mzx-pdfs\\crops';
const OUT = path.join(__dirname, '..', 'public', 'images', 'practice', 'real');

const JOBS = [
  ['geom7', 12], ['geom7', 15],
  ['cong13', 13], ['cong13', 16],
  ['tri17', 14], ['tri17', 16],
  ['func20', 13], ['func20', 15],
  ['trig26', 4], ['trig26', 16],
  ['inv27', 7], ['inv27', 15],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [tag, n] of JOBS) {
    const src = path.join(CROPS, tag, `crop-q${n}.png`);
    const dst = path.join(OUT, `${tag}-crop-q${n}.webp`);
    if (!fs.existsSync(src)) { console.log('MISS', src); continue; }
    const info = await sharp(src)
      .webp({ quality: 80, effort: 6 })
      .toFile(dst);
    console.log(`${tag}-q${n}: ${info.width}x${info.height} ${Math.round(info.size / 1024)}KB`);
  }
})();
