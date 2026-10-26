const fs = require('fs');
for (const k of ['home','about']) {
  const h = fs.readFileSync('_preview/'+k+'-after.html','utf8');
  const i = h.indexOf('application/ld+json');
  console.log('===== ' + k + ' JSON-LD 前后 300 字符 =====');
  console.log(JSON.stringify(h.substring(i-60, i+300)));
  console.log();
}
const hm = fs.readFileSync('_preview/home-after.html','utf8');
const j = hm.indexOf('class="ph-card"');
console.log('===== home 第一张 ph-card 前后 =====');
console.log(JSON.stringify(hm.substring(j-260, j+120)));
console.log();
console.log('ph-card 出现次数 =', (hm.match(/class="ph-card"/g)||[]).length);
console.log('ph-scroller 前后:');
const s = hm.indexOf('ph-scroller"');
console.log(JSON.stringify(hm.substring(s-80, s+200)));
