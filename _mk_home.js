const fs = require('fs');

function extractBody(file, startLine, endLine) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const body = lines.slice(startLine, endLine).join('\n');
  const open = (body.match(/\{/g) || []).length, close = (body.match(/\}/g) || []).length;
  return { body, diff: open - close };
}

/* ---------- 首页 ---------- */
const H = extractBody('edu-manage/public/home.html',
  fs.readFileSync('edu-manage/public/home.html','utf8').split(/\r?\n/).findIndex(l => l.includes('const SURS =')),
  fs.readFileSync('edu-manage/public/home.html','utf8').split(/\r?\n/).findIndex(l => l.includes('const DATA = [')));
const homeScript = H.body + `
})();
const D = DATA.slice();
while (D.length < 208) D.push(makeRecord());
const avg = Math.round(D.reduce((s,d)=>s+d.to-d.from,0)/D.length);
const mx = Math.max(...D.map(d=>d.to-d.from));
const types = new Set(D.map(d=>d.course.replace(/^(数学|语文|英语|物理|化学|生物|政治|历史|地理|地生)/,'')));
console.log('=== 首页 home.html ===');
console.log('  记录数 = ' + D.length);
console.log('  平均提升 avgGain = ' + avg);
console.log('  最高提升 maxGain = ' + mx);
console.log('  班型集合 = ' + [...types].join(' / ') + '   共' + types.size + '类');
D.slice(0,6).forEach((d,i)=>console.log('   '+(i+1)+'. '+d.name+' | '+d.exam+' | '+d.course+' | '+d.from+'->'+d.to+' | +'+(d.to-d.from)));
console.log('  花括号差额(应为1) = ' + ${H.diff});
`;
fs.writeFileSync('_calc_home.js', homeScript, 'utf8');
