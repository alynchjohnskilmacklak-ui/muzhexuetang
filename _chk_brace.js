const fs = require('fs');
const lines = fs.readFileSync('edu-manage/public/about.html','utf8').split(/\r?\n/);
const body = lines.slice(985, 1089).join('\n');
const open = (body.match(/\{/g)||[]).length, close = (body.match(/\}/g)||[]).length;
console.log('花括号: { =', open, ' } =', close, ' 差额 =', open-close);
console.log('取到的最后 3 行:');
lines.slice(1086,1089).forEach((l,i)=>console.log('  ', 1087+i, l));
console.log('开头 3 行:');
lines.slice(985,988).forEach((l,i)=>console.log('  ', 986+i, l));
