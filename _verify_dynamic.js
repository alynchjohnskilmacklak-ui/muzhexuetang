/* 证明「动态效果」全部保留：对比改动前后的可动元素数量 */
const { execFileSync } = require('child_process');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://127.0.0.1:8899/';

function dom(file) {
  return execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--virtual-time-budget=8000', '--dump-dom', BASE + file,
  ], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
}

const n = (s, re) => (s.match(re) || []).length;

let fail = 0;
const chk = (c, m) => { console.log('  ' + (c ? '✓ ' : '✗ ') + m); if (!c) fail++; };

// 首页可动元素
const hb = dom('home-before.html'), ha = dom('home-after.html');
console.log('===== 首页 动态元素对比（改动前 → 改动后）=====');
const volProbes = [
  ['学员卡 .ph-card（纵向滚动动画）', /class="ph-card"/g],
  ['滚动条 .ph-scrollbar', /class="ph-scrollbar"/g],
  ['暂停按钮 phPauseBtn', /id="phPauseBtn"/g],
  ['业务轮播容器 .carousel', /class="carousel"/g],
  ['轮播箭头 .carousel-arrows', /class="carousel-arrows"/g],
  ['轮播缩略图 .carousel-thumbs', /class="carousel-thumbs"/g],
  ['轮播进度条 .carousel-progress', /class="carousel-progress"/g],
  ['轮播标题 carouselName/carouselSub', /id="carousel(?:Name|Sub)"/g],
  ['数字动画目标 statAvg/statMax', /id="stat(?:Avg|Max)"/g],
];
for (const [label, re] of volProbes) {
  const b = n(hb, re), a = n(ha, re);
  chk(a === b && a > 0, `${label}：${b} → ${a}`);
}

// about 可动元素
const ab = dom('about-before.html'), aa = dom('about-after.html');
console.log('\n===== about 动态元素对比 =====');
const aboutProbes = [
  ['服务胶囊 .service-item（点击切换+自动放映）', /class="service-item/g],
  ['3D 展台 stage3d（JS 生成卡片）', /id="stage3d"/g],
  ['轮播缩略图 carouselThumbs', /id="carouselThumbs"/g],
  ['左右切换按钮 prevBtn/nextBtn', /id="(?:prevBtn|nextBtn)"/g],
  ['自动放映进度条 progressBar', /id="progressBar"/g],
  ['筛选页签 .p-tab', /class="p-tab/g],
  ['展开按钮 pMore', /id="pMore"/g],
  ['数字动画目标 statCount/statAvg', /id="stat(?:Count|Avg|Type)"/g],
  ['学员卡 .p-item', /class="p-item"/g],
];
for (const [label, re] of aboutProbes) {
  const b = n(ab, re), a = n(aa, re);
  chk(a === b && a > 0, `${label}：${b} → ${a}`);
}

/* 动画 JS 必须从「源码文件」判断——--dump-dom 不返回脚本文本 */
const fs = require('fs');
const rawHomeB = fs.readFileSync('_preview/home-before.html', 'utf8');
const rawHomeA = fs.readFileSync('_preview/home-after.html', 'utf8');
const rawAboutB = fs.readFileSync('_preview/about-before.html', 'utf8');
const rawAboutA = fs.readFileSync('_preview/about-after.html', 'utf8');
console.log('\n===== 动画 JS 是否保留（比对 HTML 源码）=====');
const jsProbes = [
  ['首页 setInterval 自动滚动', rawHomeB, rawHomeA, /setInterval/g],
  ['首页 requestAnimationFrame', rawHomeB, rawHomeA, /requestAnimationFrame/g],
  ['首页 pointerdown 手动拖动', rawHomeB, rawHomeA, /pointerdown/g],
  ['首页 animateNum 数字滚动', rawHomeB, rawHomeA, /animateNum/g],
  ['首页 prefers-reduced-motion', rawHomeB, rawHomeA, /prefers-reduced-motion/g],
  ['about setInterval 自动放映', rawAboutB, rawAboutA, /setInterval/g],
  ['about CSS transition 过渡', rawAboutB, rawAboutA, /transition:/g],
  ['about addEventListener click', rawAboutB, rawAboutA, /addEventListener\("click"/g],
  ['about pointer 事件（拖动/滑动）', rawAboutB, rawAboutA, /pointer(?:down|move|up)/g],
];
for (const [label, b, a, re] of jsProbes) {
  const nb = n(b, re), na = n(a, re);
  chk(na === nb && na > 0, `${label}：${nb} → ${na}`);
}

console.log('\n' + (fail === 0 ? '动态效果全部保留 ✅' : '有 ' + fail + ' 项异常 ❌'));
process.exit(fail === 0 ? 0 : 1);
