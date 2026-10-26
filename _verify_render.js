/* 用 Chrome 实测渲染后的真实 DOM，并检查 JS 是否报错 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://127.0.0.1:8899/';

function dumpDom(file) {
  const out = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--virtual-time-budget=7000', '--dump-dom', BASE + file,
  ], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  return out.toString('utf8');
}

function jsErrors(file) {
  const logFile = path.join(os.tmpdir(), 'err-' + file + '.log');
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--virtual-time-budget=7000', '--enable-logging=stderr', '--log-level=0',
    '--dump-dom', BASE + file,
  ], { stdio: ['ignore', 'ignore', fs.openSync(logFile, 'w')] });
  const log = fs.readFileSync(logFile, 'utf8');
  return log.split(/\r?\n/).filter((l) => /Uncaught|SyntaxError|TypeError|ReferenceError/.test(l));
}

/**
 * 提取「结构指纹」：所有元素标签名 + 完整 class 列表 + 内联样式 + id，
 * 但不含任何文字内容。指纹一致 ⇒ 布局/样式结构未被改动。
 * 预览用的锚点 <span id="chg-..."> 直接跳过（它是本预览工具的产物，不属于真实改动）。
 */
function structureFingerprint(dom) {
  const out = [];
  const re = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(dom))) {
    const tag = m[1].toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'link' || tag === 'title') continue;
    const attrs = m[2];
    const id = (/\bid="([^"]*)"/.exec(attrs) || [, ''])[1];
    if (/^chg-(home|about)-\d+$/.test(id)) continue;      // 跳过预览锚点
    const cls = (/\bclass="([^"]*)"/.exec(attrs) || [, ''])[1];
    const style = (/\bstyle="([^"]*)"/.exec(attrs) || [, ''])[1];
    out.push(`${tag}|${cls}|${style}|${id}`);
  }
  return out;
}

function fingerprintDiff(a, b) {
  const max = Math.max(a.length, b.length);
  const diffs = [];
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) diffs.push({ i, before: a[i], after: b[i] });
  }
  return diffs;
}

const count = (s, re) => (s.match(re) || []).length;
let fail = 0;
const chk = (cond, msg) => { console.log('  ' + (cond ? '✓ ' : '✗ ') + msg); if (!cond) fail++; };

for (const file of ['home-after.html', 'about-after.html']) {
  console.log('===== ' + file + ' （JS 执行后）=====');
  const errs = jsErrors(file);
  if (errs.length) { errs.slice(0, 5).forEach((e) => console.log('  ✗ ' + e.trim())); fail++; }
  else console.log('  ✓ 无 JS 报错');

  const dom = dumpDom(file);
  console.log('  DOM ' + dom.length + ' 字符');

  if (file.startsWith('home')) {
    chk(/id="statAvg"[^>]*>22</.test(dom), 'statAvg 渲染为 22');
    chk(/id="statMax"[^>]*>45</.test(dom), 'statMax 渲染为 45');
    const cards = count(dom, /class="ph-card"/g);
    chk(cards > 100, '学员卡已由 JS 渲染 ' + cards + ' 张');
    const nav = [...new Set([...dom.matchAll(/href="(\/about[^"]*)"/g)].map((m) => m[1]))];
    chk(nav.length >= 2, '导航含 /about 内链: ' + nav.join(' , '));
  } else {
    const pills = count(dom, /class="service-item/g);
    chk(pills === 8, '服务胶囊 = ' + pills + ' 个（重复渲染会是 16）');
    chk(/id="statCount"[^>]*>126</.test(dom), 'statCount 渲染为 126');
    chk(/id="statAvg"[^>]*>\+18</.test(dom), 'statAvg 渲染为 +18');
    chk(/冀ICP备2026028285号-1/.test(dom), '备案号为 …号-1');
  }

  // ★ UI 未改动证明：与「改动前」页面的结构指纹逐项比对
  const beforeFile = file.replace('-after', '-before');
  const domBefore = dumpDom(beforeFile);
  const fa = structureFingerprint(domBefore);
  const fb = structureFingerprint(dom);
  const sfDiff = fingerprintDiff(fa, fb);
  console.log(`  结构指纹：改动前 ${fa.length} 项 / 改动后 ${fb.length} 项，差异 ${sfDiff.length} 项`);
  if (sfDiff.length === 0) {
    chk(true, 'UI 结构完全一致（标签/class/id/内联样式零差异）');
  } else {
    sfDiff.slice(0, 12).forEach((d) => console.log(`      #${d.i} 前「${d.before}」→ 后「${d.after}」`));
    chk(false, `UI 结构有 ${sfDiff.length} 处差异（上面列出前 12 处）`);
  }
  console.log();
}

console.log(fail === 0 ? '渲染实测全部通过 ✅' : '有 ' + fail + ' 项未通过 ❌');
process.exit(fail === 0 ? 0 : 1);
