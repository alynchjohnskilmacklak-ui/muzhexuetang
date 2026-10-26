const fs = require('fs');
const home = fs.readFileSync('edu-manage/public/home.html','utf8');
const show = (label, needle, ctx=0) => {
  const i = home.indexOf(needle);
  console.log('--- ' + label + ' : ' + (i>=0 ? 'FOUND@'+i : 'NOT FOUND'));
  if (i>=0) return;
};
// 1. JSON-LD 品牌名 附近
let i = home.indexOf('"name"');
console.log('=== JSON-LD 区（含前后文，用 | 标出空格） ===');
console.log(JSON.stringify(home.substring(i-40, i+420)));
console.log();
// 2. 导航
i = home.indexOf('#about"');
console.log('=== 导航区 ===');
console.log(JSON.stringify(home.substring(i-320, i+240)));
console.log();
// 3. 页脚
i = home.indexOf('site-filing-footer');
console.log('=== 页脚区 ===');
console.log(JSON.stringify(home.substring(i-200, i+520)));
