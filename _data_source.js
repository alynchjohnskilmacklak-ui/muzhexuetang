/* 真正确定性的数值来源：直接执行两个页面自带的脚本，导出真实记录与统计值 */
const fs = require('fs');

function rawScript(file, index) {
  const h = fs.readFileSync(file, 'utf8');
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(h))) out.push(m[1]);
  return out[index];
}

function extract(file, index, cutMarker) {
  const body = rawScript(file, index);
  const at = body.indexOf(cutMarker);
  const dataPart = body.slice(0, at);
  const open = (dataPart.match(/\{/g) || []).length;
  const close = (dataPart.match(/\}/g) || []).length;
  const closer = '})();'.repeat(Math.max(1, open - close + 1));
  return { dataPart, closer };
}

/** 首页：返回 { avg, max, types, records[], colors } */
function homeData() {
  const { dataPart, closer } = extract('edu-manage/public/home.html', 1, '  // 数字滚动');
  const probe = `
  const D = DATA.slice();
  while (D.length < 208) D.push(makeRecord());
  module.exports = {
    count: D.length,
    avg: Math.round(D.reduce((s,d)=>s+d.to-d.from,0)/D.length),
    max: Math.max(...D.map(d=>d.to-d.from)),
    types: [...new Set(D.map(d=>d.course.replace(/^(数学|语文|英语|物理|化学|生物|政治|历史|地理|地生)/,'')))],
    colors: AV_COLORS,
    records: D.slice(0, 8).map(d => ({ name: d.name, exam: d.exam, course: d.course, from: d.from, to: d.to, gain: d.to - d.from }))
  };
`;
  const tmp = '_extract_home.js';
  fs.writeFileSync(tmp, '(function(){\n' + dataPart + '\n' + probe + '\n' + closer + '\n', 'utf8');
  delete require.cache[require.resolve('./' + tmp)];
  return require('./' + tmp);
}

/** about：返回 { count, avg, types, records[], colors } */
function aboutData() {
  const script = rawScript('edu-manage/public/about.html', 1);
  // AVC 定义在 itemHTML() 内部，作用域取不到，只能从源码里解析出来
  const m = /const AVC = \[([^\]]+)\]/.exec(script);
  const colors = m ? m[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')) : [];
  const { dataPart, closer } = extract('edu-manage/public/about.html', 1, '  const gridEl');
  const probe = `
  const D = FIXED.slice();
  while (D.length < 126) D.push(makeRecord());
  module.exports = {
    count: D.length,
    avg: Math.round(D.reduce((s,d)=>s+d.gain,0)/D.length),
    types: [...new Set(D.map(d=>d.type))],
    colors: ${JSON.stringify(colors)},
    records: D.slice(0, 8).map(d => ({ name: d.name, exam: d.exam, typeLabel: d.typeLabel, base: d.base, final: d.final, gain: d.gain, full: d.full }))
  };
`;
  const tmp = '_extract_about.js';
  fs.writeFileSync(tmp, '(function(){\n' + dataPart + '\n' + probe + '\n' + closer + '\n', 'utf8');
  delete require.cache[require.resolve('./' + tmp)];
  return require('./' + tmp);
}

if (require.main === module) {
  const h = homeData(), a = aboutData();
  console.log('首页:', JSON.stringify({ count: h.count, avg: h.avg, max: h.max, types: h.types }));
  h.records.slice(0, 6).forEach((r, i) => console.log('   ' + (i + 1) + '. ' + r.name + ' ' + r.exam + ' ' + r.course + ' ' + r.from + '->' + r.to + ' +' + r.gain));
  console.log('about:', JSON.stringify({ count: a.count, avg: a.avg, types: a.types }));
  a.records.slice(0, 6).forEach((r, i) => console.log('   ' + (i + 1) + '. ' + r.name + ' ' + r.typeLabel + ' ' + r.exam + ' ' + r.base + '->' + r.final + ' +' + r.gain));
}

module.exports = { homeData, aboutData };
