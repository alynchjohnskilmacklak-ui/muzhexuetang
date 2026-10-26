/* 只执行页面脚本里的「数据生成部分」（在首次触碰 DOM 之前截断），求出确定性真实值 */
const fs = require('fs');

function rawScript(file, index) {
  const h = fs.readFileSync(file, 'utf8');
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(h))) out.push(m[1]);
  return out[index];
}

function run(file, index, cutMarker, probe, label) {
  const body = rawScript(file, index);
  if (body === undefined) { console.log(label + ': 未找到脚本'); return; }
  const at = body.indexOf(cutMarker);
  if (at < 0) { console.log(label + ': 未找到截断标记'); return; }
  const dataPart = body.slice(0, at);            // 纯数据部分，不触碰 DOM
  const open = (dataPart.match(/\{/g) || []).length;
  const close = (dataPart.match(/\}/g) || []).length;
  const closer = '})();'.repeat(Math.max(1, open - close + 1));
  const wrapped = '(function(){\n' + dataPart + '\n' + probe + '\n' + closer + '\n';
  fs.writeFileSync('_probe_run.js', wrapped, 'utf8');

  console.log('########## ' + label + ' ##########');
  console.log('  数据段 ' + dataPart.length + ' 字符，{=' + open + ' }=' + close + ' → 补 ' + Math.max(1, open - close + 1) + ' 个收尾');
  try {
    delete require.cache[require.resolve('./_probe_run.js')];
    require('./_probe_run.js');
  } catch (e) { console.log('  执行出错: ' + e.message); }
  console.log();
}

run('edu-manage/public/home.html', 1, '  // 数字滚动', `
  const D = DATA.slice();
  while (D.length < 208) D.push(makeRecord());
  const avg = Math.round(D.reduce((s,d)=>s+d.to-d.from,0)/D.length);
  const mx = Math.max(...D.map(d=>d.to-d.from));
  const types = new Set(D.map(d=>d.course.replace(/^(数学|语文|英语|物理|化学|生物|政治|历史|地理|地生)/,'')));
  console.log('  记录数        = ' + D.length);
  console.log('  avgGain(平均) = ' + avg);
  console.log('  maxGain(最高) = ' + mx);
  console.log('  班型集合      = ' + [...types].join(' / ') + '   共 ' + types.size + ' 类');
  console.log('  前 6 条真实记录：');
  D.slice(0,6).forEach((d,i)=>console.log('    '+(i+1)+'. '+d.name+' | '+d.exam+' | '+d.course+' | '+d.from+'->'+d.to+' | +'+(d.to-d.from)));
`, '首页 home.html · 学员数据段');

run('edu-manage/public/about.html', 1, '  const gridEl', `
  const D = FIXED.slice();
  while (D.length < 126) D.push(makeRecord());
  const avg = Math.round(D.reduce((s,d)=>s+d.gain,0)/D.length);
  const types = new Set(D.map(d=>d.type));
  console.log('  记录数        = ' + D.length);
  console.log('  avgGain(平均) = +' + avg);
  console.log('  班型集合      = ' + [...types].join(' / ') + '   共 ' + types.size + ' 类');
  console.log('  前 6 条真实记录：');
  D.slice(0,6).forEach((d,i)=>console.log('    '+(i+1)+'. '+d.name+' | '+d.typeLabel+' | '+d.exam+' | '+d.base+'->'+d.final+' | +'+d.gain));
`, 'about.html · 学员数据段');
