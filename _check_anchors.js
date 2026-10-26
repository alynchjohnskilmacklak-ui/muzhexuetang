const fs = require('fs');
let bad = 0;
for (const k of ['home','about']) {
  const h = fs.readFileSync('_preview/'+k+'-after.html','utf8');
  const re = /<(script|style|title)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let m, n = 0;
  while ((m = re.exec(h))) {
    const inner = m[0];
    const inAnchors = (inner.match(/<span id="chg-/g) || []).length;
    if (inAnchors) { n += inAnchors; console.log('  ✗ ' + k + ': ' + inAnchors + ' 个锚点落在 <' + m[1] + '> 内 @' + m.index); bad += inAnchors; }
  }
  console.log('  ' + k + ': 原始文本区内的锚点数 = ' + n + (n === 0 ? ' ✓' : ' ✗'));
}
console.log(bad === 0 ? '\n锚点位置全部安全 ✅' : '\n仍有 ' + bad + ' 个危险锚点 ❌');
