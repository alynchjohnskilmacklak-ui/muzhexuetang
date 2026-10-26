/* 静态校验：确认「改动后」HTML 正确，且严格未触碰 UI（结构与资源） */
const fs = require('fs');
const OUT = '_preview';
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };

const { homeData, aboutData } = require('./_data_source.js');
const HD = homeData(), AD = aboutData();

for (const [key, label] of [['home', '首页'], ['about', '关于页']]) {
  console.log('=== ' + label + ' (' + key + '-after.html) ===');
  const h = fs.readFileSync(OUT + '/' + key + '-after.html', 'utf8');

  // 1. JSON-LD 可解析
  const blocks = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  ok(blocks.length > 0, `找到 ${blocks.length} 个 JSON-LD 块`);
  blocks.forEach((b, i) => {
    try {
      const o = JSON.parse(b[1]);
      const an = Array.isArray(o.alternateName) ? o.alternateName.join(' / ') : o.alternateName;
      console.log(`      JSON-LD[${i}] name="${o.name}"  alternateName="${an}"  sameAs=${o.sameAs ? '有' : '无'}`);
      ok(o.name === '新乐牧哲学堂', '  name = 新乐牧哲学堂');
    } catch (e) { ok(false, `JSON-LD[${i}] 解析失败: ${e.message}`); }
  });

  // 2. 品牌词与标题长度
  const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1];
  console.log(`      <title> = ${t}  (${[...t].length} 字)`);
  ok([...t].length <= 20, `标题 ${[...t].length} 字 ≤ 20（移动端不截断）`);
  ok(t.startsWith('新乐牧哲学堂'), '标题以「新乐牧哲学堂」开头');

  // 3. 旧串不残留
  for (const bad of ['太原', 'xyz./', '新乐辅导机构']) ok(!h.includes(bad), `不含残留串「${bad}」`);
  ok(!h.includes('<span id="statAvg">0<'), 'statAvg 不再是 0');

  // 4. 预览锚点
  const anchors = [...h.matchAll(/<span id="chg-(home|about)-(\d+)"><\/span>/g)];
  console.log(`      注入预览锚点 ${anchors.length} 个`);
  console.log();
}

/* ---------- UI 未被触碰的证据：把「改动前/后」的结构与资源清单对比 ---------- */
console.log('=== UI 未触碰证据（改动前 vs 改动后）===');
function signature(html) {
  // 去掉预览锚点 <span id="chg-...">（本预览工具的产物，不属于真实改动）
  const clean = html.replace(/<span id="chg-(?:home|about)-\d+"><\/span>\s*/g, '');
  const tags = [...clean.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g)]
    .map((m) => m[1].toLowerCase())
    .filter((x) => !['script', 'style', 'meta', 'link', 'title', 'br'].includes(x));
  const classes = [...new Set([...clean.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)))].sort();
  const styles = [...new Set([...clean.matchAll(/style="([^"]*)"/g)].map((m) => m[1]))].sort();
  const assets = [...new Set([...clean.matchAll(/(?:src|href)="([^"]*\.(?:jpg|jpeg|png|webp|svg|ico|css))"/g)].map((m) => m[1]))].sort();
  const styleBlocks = [...clean.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('');
  return { tags, classes, styles, assets, cssLen: styleBlocks.length, cssHash: require('crypto').createHash('sha256').update(styleBlocks).digest('hex').slice(0, 16) };
}
for (const key of ['home', 'about']) {
  const b = signature(fs.readFileSync(`${OUT}/${key}-before.html`, 'utf8'));
  const a = signature(fs.readFileSync(`${OUT}/${key}-after.html`, 'utf8'));
  const tagDiff = b.tags.length - a.tags.length;
  ok(tagDiff === 0, `[${key}] 元素总数不变：${b.tags.length} → ${a.tags.length}`);
  ok(JSON.stringify(b.classes) === JSON.stringify(a.classes), `[${key}] class 清单完全一致（${a.classes.length} 个）`);
  ok(JSON.stringify(b.styles) === JSON.stringify(a.styles), `[${key}] 内联样式完全一致（${a.styles.length} 条）`);
  ok(JSON.stringify(b.assets) === JSON.stringify(a.assets), `[${key}] 引用的图片/样式资源完全一致（${a.assets.length} 个）`);
  ok(b.cssHash === a.cssHash, `[${key}] <style> 内容零改动（${a.cssLen} 字符，hash ${a.cssHash}）`);
}

/* ---------- 数据正确性 ---------- */
console.log('\n=== 数据与页面脚本比对（防手敲错）===');
const hm = fs.readFileSync(OUT + '/home-after.html', 'utf8');
const am = fs.readFileSync(OUT + '/about-after.html', 'utf8');
ok(hm.includes(`<span id="statAvg">${HD.avg}</span>`), `首页 statAvg = 脚本算出的 ${HD.avg}`);
ok(hm.includes(`<span id="statMax">${HD.max}</span>`), `首页 statMax = 脚本算出的 ${HD.max}`);
ok(am.includes(`id="statCount">${AD.count}<small>`), `about statCount = 脚本算出的 ${AD.count}`);
ok(am.includes(`id="statAvg">+${AD.avg}<small>`), `about statAvg = 脚本算出的 +${AD.avg}`);

/* ---------- 链接与备案号 ---------- */
console.log('\n=== 链接 / 备案号 ===');
ok(hm.includes(`href="/about"`), '首页出现 /about 内链');
ok(hm.includes(`href="/about#services"`), '首页出现 /about#services 内链');
ok(!hm.includes(`href="#about"`), '首页不再有自指锚点 #about');
ok(am.includes('冀ICP备2026028285号-1'), 'about 备案号已补 -1');
ok(!am.includes('冀ICP备2026028285号</a>'), 'about 旧的短备案号已不存在');

/* ---------- 换行符 ---------- */
console.log('\n=== 换行符保持 ===');
ok(fs.readFileSync(OUT + '/home-after.html', 'utf8').includes('\r\n'), 'home-after 保持 CRLF');
ok(!fs.readFileSync(OUT + '/about-after.html', 'utf8').includes('\r\n'), 'about-after 保持 LF');

console.log('\n' + (fail === 0 ? '全部通过 ✅' : `有 ${fail} 项未通过 ❌`));
process.exit(fail === 0 ? 0 : 1);
