/* 精确对比：我的预渲染卡 vs JS 生成的卡，确认结构完全一致、且确实被覆盖 */
const { execFileSync } = require('child_process');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const dom = execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  '--virtual-time-budget=7000', '--dump-dom', 'http://127.0.0.1:8899/home-after.html',
], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');

// 取出 progressGrid 容器内的所有卡
const start = dom.indexOf('id="progressGrid"');
const endMark = dom.indexOf('ph-scrollbar', start);
const grid = dom.slice(start, endMark);
const cards = [...grid.matchAll(/<div class="ph-card">[\s\S]*?<\/div><\/div>\s*<\/div>/g)].map((m) => m[0]);
console.log('progressGrid 内卡片数 = ' + cards.length);
console.log();
console.log('=== 第 1 张卡（DOM 实际内容，压缩空白）===');
console.log(cards[0] ? cards[0].replace(/\s+/g, ' ') : '(无)');
console.log();
console.log('=== 第 2 张卡 ===');
console.log(cards[1] ? cards[1].replace(/\s+/g, ' ') : '(无)');
console.log();
console.log('=== 第 7 张卡（应已进入 JS 生成区）===');
console.log(cards[6] ? cards[6].replace(/\s+/g, ' ') : '(无)');
console.log();
console.log('=== 第 208 / 209 / 416 / 417 张 ===');
[207, 208, 415, 416].forEach((i) => {
  console.log('  第 ' + (i + 1) + ' 张: ' + (cards[i] ? cards[i].replace(/\s+/g, ' ').slice(0, 150) : '(不存在)'));
});
console.log();
// 检查是否出现"预渲染卡 + JS 卡"交替的结构差异
const preRendered = cards.slice(0, 6).map((c) => {
  const n = /ph-card-name">([^<]+)</.exec(c);
  return n ? n[1] : '?';
});
console.log('前 6 张的学员名 = ' + preRendered.join(' , '));
const dup = cards.slice(6).map((c) => (/ph-card-name">([^<]+)</.exec(c) || [])[1]);
console.log('第 7 张起的第 1 个名字 = ' + dup[0] + '   （若与第 1 张同名，说明 416 张是 DATA×2 且预渲染已被覆盖）');
console.log();
console.log('总卡数 = ' + cards.length + '  → 期望 416（208 × 2）');
console.log(cards.length === 416 ? '✓ 预渲染的 6 张已被 JS 正确覆盖' : '✗ 数量异常，可能有残留');
