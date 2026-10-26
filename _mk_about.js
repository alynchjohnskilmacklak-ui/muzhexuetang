const fs = require('fs');
const lines = fs.readFileSync('edu-manage/public/about.html','utf8').split(/\r?\n/);
let body = lines.slice(985, 1089).join('\n');
// 在 IIFE 内部注入统计代码
const probe = `
const DATA2 = FIXED.slice();
while (DATA2.length < 126) DATA2.push(makeRecord());
const avg2 = Math.round(DATA2.reduce((s,d)=>s+d.gain,0)/DATA2.length);
const types = new Set(DATA2.map(d=>d.type));
console.log('statCount 进步记录学员 =', DATA2.length);
console.log('statAvg   平均提升分数 = +' + avg2);
console.log('statType  覆盖班型     =', types.size, ' -> ', [...types].join(' / '));
for (let i=3;i<6;i++){ const d=DATA2[i]; console.log('  第'+(i+1)+'条:', d.name, '|', d.typeLabel, '|', d.exam, '|', d.base+'->'+d.final, '| +'+d.gain); }
console.log('gain 范围:', Math.min(...DATA2.map(d=>d.gain)), '~', Math.max(...DATA2.map(d=>d.gain)));
`;
const script = body + '\n  ' + probe + '\n})();\n';
fs.writeFileSync('_calc_about.js', script, 'utf8');
