const fs = require('fs');
const c = fs.readFileSync('edu-manage/public/home.html','utf8');
const s = c.indexOf('const SURS =');
const e = c.indexOf('const DATA = [');
const mid = c.substring(s, e);
const dataStart = e;
// 取出内联的生成逻辑并执行，算出真实 avgGain / maxGain
const script = `
${mid}
const DATA = [
  {name:"x",exam:"a",course:"b",from:112,to:120,full:120},
  {name:"x",exam:"a",course:"b",from:108,to:114,full:120},
  {name:"x",exam:"a",course:"b",from:82,to:108,full:120}
];
while (DATA.length < 208) DATA.push(makeRecord());
const avgGain = Math.round(DATA.reduce((s,d)=>s+d.to-d.from,0)/DATA.length);
const maxGain = Math.max(...DATA.map(d=>d.to-d.from));
const types = new Set(DATA.map(d=>d.course.replace(/^(数学|语文|英语|物理|化学|生物|政治|历史|地理|地生)/,'')));
console.log('avgGain =', avgGain);
console.log('maxGain =', maxGain);
console.log('覆盖班型 =', [...types].join(' / '), '(共'+types.size+'类)');
console.log('前三张卡:', JSON.stringify(DATA.slice(0,3)));
console.log('第4-6张卡:', JSON.stringify(DATA.slice(3,6)));
`;
fs.writeFileSync('_calc_stats.js', script, 'utf8');
