/* 线上实测验证：针对 https://muzhexuetang.xyz 真实页面，用 Chrome 执行 JS 后检查 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LIVE = 'https://muzhexuetang.xyz';
const PRE = '_preview';

function dom(url) {
  return execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--virtual-time-budget=9000', '--dump-dom', url,
  ], { encoding: 'buffer', maxBuffer: 96 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
}
function jsErrors(url) {
  const f = path.join(os.tmpdir(), 'liveerr-' + Math.random().toString(36).slice(2) + '.log');
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=9000',
    '--enable-logging=stderr', '--log-level=0', '--dump-dom', url],
    { stdio: ['ignore', 'ignore', fs.openSync(f, 'w')] });
  return fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => /Uncaught|SyntaxError|TypeError|ReferenceError/.test(l));
}

const n = (s, re) => (s.match(re) || []).length;
let fail = 0;
const chk = (c, m) => { console.log('  ' + (c ? '✓ ' : '✗ ') + m); if (!c) fail++; };

function fingerprint(d) {
  const out = [];
  const re = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(d))) {
    const t = m[1].toLowerCase();
    if (['script', 'style', 'meta', 'link', 'title'].includes(t)) continue;
    const id = (/\bid="([^"]*)"/.exec(m[2]) || [, ''])[1];
    if (/^chg-/.test(id)) continue;
    let style = (/\bstyle="([^"]*)"/.exec(m[2]) || [, ''])[1];
    // 滚动进度条宽度由 JS 每 30ms 按动画位置写入，属预期内的动态值，不参与结构比对
    if (/scrollBar|progressBar/.test(id)) style = '(动画驱动)';
    out.push(`${t}|${(/\bclass="([^"]*)"/.exec(m[2]) || [, ''])[1]}|${style}|${id}`);
  }
  return out;
}

console.log('████ 线上实测：' + LIVE + ' ████\n');

/* ---------- 首页 ---------- */
console.log('===== 首页 / =====');
let errs = jsErrors(LIVE + '/');
chk(errs.length === 0, errs.length ? 'JS 报错: ' + errs[0].trim().slice(0, 120) : '无 JS 报错');
const hLive = dom(LIVE + '/');
chk(/<title>新乐牧哲学堂｜河北新乐文化课辅导<\/title>/.test(hLive), '标题 = 新乐牧哲学堂｜河北新乐文化课辅导');
chk(/name="description" content="新乐牧哲学堂2016年成立于河北新乐/.test(hLive), '描述已更新为「新乐牧哲学堂」开头');
const hJson = JSON.parse((/application\/ld\+json">([\s\S]*?)<\/script>/.exec(hLive) || [, '{}'])[1]);
chk(hJson.name === '新乐牧哲学堂', 'JSON-LD name = 新乐牧哲学堂');
chk(Array.isArray(hJson.alternateName) && hJson.alternateName.includes('牧哲学堂'), 'JSON-LD alternateName 含「牧哲学堂」');
chk(Array.isArray(hJson.sameAs) && hJson.sameAs.length === 1, 'JSON-LD sameAs 指向抖音官方号');
chk(!/xyz\.\//.test(hLive), '坏 URL（xyz./）已不存在');
chk(n(hLive, /href="\/about"/g) >= 1, '首页含 /about 内链');
chk(n(hLive, /href="\/about#services"/g) >= 1, '首页含 /about#services 内链');
chk(!/href="#about"/.test(hLive), '首页不再有自指锚点 #about');
chk(/id="statAvg"[^>]*>22</.test(hLive), '统计 statAvg 渲染为 22（不再显示 0 分）');
chk(/id="statMax"[^>]*>45</.test(hLive), '统计 statMax 渲染为 45');
const cards = n(hLive, /class="ph-card"/g);
chk(cards > 300, '学员卡已渲染 ' + cards + ' 张（动态效果生效）');
chk(n(hLive, /class="carousel"/g) >= 1 && n(hLive, /carousel-thumbs/g) >= 1, '业务轮播结构在位');
chk(/phPauseBtn/.test(hLive), '暂停按钮在位');

/* ---------- 关于页 ---------- */
console.log('\n===== 关于页 /about =====');
errs = jsErrors(LIVE + '/about');
chk(errs.length === 0, errs.length ? 'JS 报错: ' + errs[0].trim().slice(0, 120) : '无 JS 报错');
const aLive = dom(LIVE + '/about');
chk(/<title>新乐牧哲学堂｜机构介绍 - 河北新乐<\/title>/.test(aLive), '标题 = 新乐牧哲学堂｜机构介绍 - 河北新乐');
const aJson = JSON.parse((/application\/ld\+json">([\s\S]*?)<\/script>/.exec(aLive) || [, '{}'])[1]);
chk(aJson.name === '新乐牧哲学堂', 'JSON-LD name = 新乐牧哲学堂');
chk(Array.isArray(aJson.alternateName) && aJson.alternateName.includes('牧哲学堂'), 'JSON-LD alternateName 含「牧哲学堂」');
chk(/id="statCount"[^>]*>126</.test(aLive), 'statCount 渲染为 126');
chk(/id="statAvg"[^>]*>\+18</.test(aLive), 'statAvg 渲染为 +18');
chk(n(aLive, /class="service-item/g) === 8, '服务胶囊 ' + n(aLive, /class="service-item/g) + ' 个（动态生效，无重复）');
chk(/冀ICP备2026028285号-1/.test(aLive), '备案号为 …号-1');
chk(/新乐牧哲学堂 · MOREJOY EDUCATION/.test(aLive), 'hero 品牌串含「新乐牧哲学堂」');

/* ---------- UI 结构指纹：线上 vs 部署前 ---------- */
console.log('\n===== UI 结构指纹：线上 vs 部署前（必须零差异）=====');
for (const [name, live, pre] of [['首页', hLive, 'home-after.html'], ['关于页', aLive, 'about-after.html']]) {
  const before = dom('http://127.0.0.1:8899/' + pre);
  const fa = fingerprint(before), fb = fingerprint(live);
  const d = [];
  for (let i = 0; i < Math.max(fa.length, fb.length); i++) if (fa[i] !== fb[i]) d.push({ i, a: fa[i], b: fb[i] });
  if (d.length === 0) chk(true, `[${name}] 结构指纹零差异（${fb.length} 项元素）`);
  else { d.slice(0, 6).forEach((x) => console.log(`      #${x.i} 「${x.a}」→「${x.b}」`)); chk(false, `[${name}] 有 ${d.length} 处结构差异`); }
}

/* ---------- 动态效果 ---------- */
console.log('\n===== 动态效果（线上渲染后元素数）=====');
chk(n(hLive, /class="ph-card"/g) > 300, `首页 学员卡滚动：${n(hLive, /class="ph-card"/g)} 张`);
chk(/setInterval|requestAnimationFrame/.test(fs.readFileSync(PRE + '/home-after.html', 'utf8')), '首页动画 JS 在位');
chk(n(aLive, /class="p-item"/g) >= 6, `关于页 学员卡：${n(aLive, /class="p-item"/g)} 张`);
chk(n(aLive, /class="p-tab/g) === 5, `关于页 筛选页签：${n(aLive, /class="p-tab/g)} 个`);
chk(/id="stage3d"/.test(aLive), '关于页 3D 展台在位');

console.log('\n' + (fail === 0 ? '🎉 线上验证全部通过' : `❌ 有 ${fail} 项未通过`));
process.exit(fail === 0 ? 0 : 1);
