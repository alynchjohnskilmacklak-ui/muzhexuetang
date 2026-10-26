const fs = require('fs');
const lines = fs.readFileSync('edu-manage/public/about.html','utf8').split(/\r?\n/);
// L986..L1088 为 IIFE 主体（无 <script> 标签）
let body = lines.slice(985, 1088).join('\n');
const braceOpen = (body.match(/\{/g)||[]).length, braceClose = (body.match(/\}/g)||[]).length;
const probe = `
const D = FIXED.slice();
while (D.length < 126) D.push(makeRecord());
console.log('about 页真实生成的前 8 条：');
D.slice(0,8).forEach((d,i)=>console.log('  '+(i+1)+'. '+d.name+' | '+d.typeLabel+' | '+d.exam+' | '+d.base+'->'+d.final+' | +'+d.gain));
console.log('花括号差额=' + (${braceOpen}-${braceClose}));
`;
const script = body + '\n' + probe + '\n})();\n';
fs.writeFileSync('_calc_about2.js', script, 'utf8');
