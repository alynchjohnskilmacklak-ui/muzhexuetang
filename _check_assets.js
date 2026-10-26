const fs = require('fs');
// 检查预览页引用的本地资源是否存在（避免预览里出现大面积 404）
const refs = new Set();
for (const f of ['home-after.html','about-after.html']) {
  const h = fs.readFileSync('_preview/' + f, 'utf8');
  for (const m of h.matchAll(/(?:src|srcSet|href)="(\/[^"]+)"/g)) refs.add(m[1].split('?')[0]);
  for (const m of h.matchAll(/url\(["']?(\/[^"')]+)["']?\)/g)) refs.add(m[1]);
  for (const m of h.matchAll(/imageSrcSet="([^"]+)"/g)) {
    for (const p of m[1].split(',')) refs.add(p.trim().split(' ')[0].split('?')[0]);
  }
}
const local = [...refs].filter((r) => r.startsWith('/') && !r.startsWith('/_next/'));
const missing = [], okc = [];
for (const r of local) {
  const p = 'edu-manage/public' + decodeURIComponent(r);
  (fs.existsSync(p) ? okc : missing).push(r);
}
console.log('本地资源引用 ' + local.length + ' 个：存在 ' + okc.length + '，缺失 ' + missing.length);
if (missing.length) { console.log('缺失（预览里会 404）：'); missing.slice(0, 25).forEach((m) => console.log('  ' + m)); }
console.log('\n存在的前 12 个：'); okc.slice(0, 12).forEach((m) => console.log('  ' + m));
