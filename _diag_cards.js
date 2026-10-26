const fs = require('fs');
const h = fs.readFileSync('_preview/home-after.html','utf8');
let i = -1, k = 0;
while ((i = h.indexOf('class="ph-card"', i + 1)) >= 0) {
  k++;
  console.log('--- 第 ' + k + ' 处 @' + i);
  console.log('    ' + JSON.stringify(h.substring(i - 150, i + 60)));
}
