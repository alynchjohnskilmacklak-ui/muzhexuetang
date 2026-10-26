const fs = require('fs');
const home = fs.readFileSync('edu-manage/public/home.html','utf8');
console.log('行尾类型: ' + (home.includes('\r\n') ? 'CRLF' : 'LF'));
console.log('文件字符数: ' + home.length + ' / UTF-8字节: ' + Buffer.byteLength(home,'utf8'));
console.log();
for (const k of ['冀ICP备','class="footer"','</footer>','logo.jpg','about-images/new-logo.jpg','animateNum(document']) {
  const i = home.indexOf(k);
  console.log('--- ' + k + ' -> ' + (i>=0?'@'+i:'NOT FOUND'));
  if (i>=0) console.log('    ' + JSON.stringify(home.substring(Math.max(0,i-160), i+320)));
}
