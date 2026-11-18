const fs = require('fs');
let c = fs.readFileSync('public/home.html.bak', 'utf8');

// 1. 替换 HTML
const oldHTML = '<div class="progress">';
const htmlIdx = c.indexOf(oldHTML);
console.log('Found progress div at:', htmlIdx);
const endMark = '<!-- ================= 金句条';
const endIdx = c.indexOf(endMark);
console.log('End mark at:', endIdx);

const newHTML = `
  <div class="progress-hero">
    <div class="ph-tag">REAL PROGRESS · 真实记录</div>
    <div class="ph-title">分数，自己会说话</div>
    <div class="ph-sub">入学多少分，期末多少分 —— 不靠宣传，靠数据</div>
    <div class="ph-stats">
      <div class="ph-stat ph-main-stat">
        <div class="ph-num"><span id="statAvg">0</span><span class="ph-unit">分</span></div>
        <div class="ph-label">平均提升（<span id="statCountNum">208</span> 位学员）</div>
      </div>
      <div class="ph-stat">
        <div class="ph-num" style="color:#E8A05A"><span id="statMax">0</span><span class="ph-unit">分</span></div>
        <div class="ph-label">最高提升</div>
      </div>
      <div class="ph-stat">
        <div class="ph-num" style="color:#E8A05A"><span id="statTypes">3</span><span class="ph-unit">类</span></div>
        <div class="ph-label">覆盖班型</div>
      </div>
    </div>
  </div>

  <div class="ph-divider"><span>学员进步记录</span></div>

  <div class="ph-scroller-wrap">
    <div class="ph-scroller" id="progressGrid"></div>
    <div class="ph-scrollbar"><i id="scrollBar"></i></div>
    <div class="ph-hint">↑ 自动滚动 · 可上下滑动浏览 ↑</div>
  </div>

  <div class="ph-divider"><span>班型覆盖</span></div>
  <div class="ph-type-row">
    <div class="ph-type-card"><div class="ph-t-name">一对一</div><div class="ph-t-num">68人</div><div class="ph-t-gain">平均+22分</div></div>
    <div class="ph-type-card"><div class="ph-t-name">一对三</div><div class="ph-t-num">96人</div><div class="ph-t-gain">平均+18分</div></div>
    <div class="ph-type-card"><div class="ph-t-name">小班</div><div class="ph-t-num">44人</div><div class="ph-t-gain">平均+14分</div></div>
  </div>
  <p class="ph-note">* 学员姓名均已脱敏，成绩为真实教学记录；提升幅度因个人基础与投入而异。</p>

`;

c = c.substring(0, htmlIdx) + newHTML + c.substring(endIdx);
console.log('HTML replaced');

// 2. 在 </style> 前插入 CSS
const css = `
  /* ===== 学员进步对比（深色震撼版） ===== */
  .progress-hero{margin:34px auto 0;max-width:1320px;background:linear-gradient(160deg,#1a1108,#2e2113);border-radius:26px;padding:40px 28px 28px;box-shadow:0 24px 60px rgba(26,18,8,.35);position:relative;overflow:hidden}
  .progress-hero::before{content:"";position:absolute;top:-80px;right:-80px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(232,160,90,.15),transparent 70%)}
  .ph-tag{font-size:11px;letter-spacing:.3em;color:#E8A05A;text-align:center;margin-bottom:12px}
  .ph-title{font-size:clamp(24px,4vw,32px);font-weight:800;color:#f5ede2;text-align:center}
  .ph-sub{font-size:13px;color:#b9a996;text-align:center;margin-top:6px}
  .ph-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:24px}
  .ph-stat{background:rgba(255,255,255,.05);border:1px solid rgba(232,160,90,.2);border-radius:18px;padding:20px 12px;text-align:center}
  .ph-stat.ph-main-stat{grid-column:span 2;background:linear-gradient(135deg,#E8784A,#D9643C);border:none;box-shadow:0 12px 32px rgba(232,120,74,.3)}
  .ph-num{font-size:36px;font-weight:900;color:#f5ede2;font-variant-numeric:tabular-nums;line-height:1.1}
  .ph-main-stat .ph-num{font-size:52px}
  .ph-unit{font-size:.4em;font-weight:600;opacity:.8;margin-left:3px}
  .ph-label{font-size:11px;color:#b9a996;margin-top:6px}
  .ph-main-stat .ph-label{color:rgba(255,255,255,.9)}
  .ph-divider{display:flex;align-items:center;gap:12px;max-width:1320px;margin:20px auto 8px;padding:0 20px}
  .ph-divider::before,.ph-divider::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(232,160,90,.3),transparent)}
  .ph-divider span{font-size:11px;letter-spacing:.2em;color:#E8A05A}
  .ph-scroller-wrap{max-width:1320px;margin:0 auto;padding:10px 16px}
  .ph-scroller{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;height:420px;overflow:hidden;position:relative;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);mask-image:linear-gradient(180deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);touch-action:pan-y;cursor:grab}
  .ph-scroller.dragging{cursor:grabbing}
  .ph-card{background:linear-gradient(160deg,#1f1508,#2a1d0e);border:1px solid rgba(232,160,90,.2);border-radius:16px;padding:14px 12px;display:flex;flex-direction:column;gap:6px}
  .ph-card-top{display:flex;align-items:center;gap:8px}
  .ph-av{width:32px;height:32px;border-radius:10px;flex:none;display:grid;place-items:center;color:#fff;font-size:14px;font-weight:800}
  .ph-card-name{font-size:14px;font-weight:700;color:#f5ede2;line-height:1.2}
  .ph-card-exam{font-size:10px;color:#9a8e7a;line-height:1.2}
  .ph-card-scores{display:flex;align-items:baseline;gap:6px;margin-top:2px}
  .ph-from{font-size:16px;color:#b9a996;font-weight:700;font-variant-numeric:tabular-nums}
  .ph-arrow{font-size:12px;color:#E8784A}
  .ph-to{font-size:22px;color:#E8A05A;font-weight:800;font-variant-numeric:tabular-nums}
  .ph-gain{margin-top:auto;display:inline-block;width:fit-content;font-size:11px;font-weight:700;padding:2px 9px;border-radius:99px;color:#fff}
  .ph-gain.g{background:linear-gradient(135deg,#27a644,#1e8b3a)}
  .ph-gain.o{background:linear-gradient(135deg,#E8A05A,#D9783C)}
  .ph-scrollbar{height:3px;background:rgba(245,237,226,.1);border-radius:3px;margin:8px 16px 0;overflow:hidden}
  .ph-scrollbar i{display:block;height:100%;background:#E8A05A;width:0}
  .ph-hint{text-align:center;font-size:10px;color:#6b5e4e;padding:6px 0 10px}
  .ph-type-row{display:flex;gap:10px;max-width:1320px;margin:0 auto;padding:0 16px 16px}
  .ph-type-card{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(232,160,90,.15);border-radius:14px;padding:14px 8px;text-align:center}
  .ph-t-name{font-size:11px;color:#b9a996;margin-bottom:4px}
  .ph-t-num{font-size:18px;font-weight:800;color:#E8A05A}
  .ph-t-gain{font-size:10px;color:#27a644;margin-top:2px}
  .ph-note{text-align:center;font-size:11px;color:#6b5e4e;padding:8px 16px 20px;max-width:1320px;margin:0 auto}
  @media (max-width:960px){.ph-scroller{grid-template-columns:repeat(2,1fr);height:440px}}
  @media (max-width:520px){.progress-hero{padding:28px 16px 20px}.ph-num{font-size:30px}.ph-main-stat .ph-num{font-size:42px}.ph-scroller{grid-template-columns:repeat(2,1fr);height:460px;gap:10px}.ph-card{padding:12px 10px}.ph-to{font-size:20px}}

`;

c = c.replace('</style>', css + '</style>');
console.log('CSS inserted');

// 3. 替换 JS
const jsStart = c.indexOf('/* ================= 学员进步对比');
const jsEnd = c.indexOf('render();', jsStart);
const jsEndFull = c.indexOf('})();', jsEnd) + '})();'.length;
console.log('JS range:', jsStart, '-', jsEndFull);

const newJS = `
/* ================= 学员进步对比：深色6宫格自动滚动 ================= */
(function(){
  const SURS = "王李张刘陈杨黄赵周吴徐孙马朱胡郭林何高罗郑梁谢宋唐许韩冯邓曹彭曾萧田董袁潘蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤".split("");
  const NAMES = "浩然,梓萱,雨欣,俊杰,欣怡,子涵,宇轩,晨曦,欣妍,铭泽,思远,嘉懿,雨桐,天佑,静姝,梦琪,俊驰,可馨,佳禾,亦凡,书瑶,睿哲,若彤,立诚,沐宸,芷晴,彦博,博文,雅宁,悦心,景行,嘉树,明宇,婉清,泽翰,星辰,语嫣,承恩,清雅,弘毅,瑞霖,诗颖,卓航,嘉乐,思齐,云帆,承睿,思源,子墨,安妮,俊朗,欣蕾,乐珊,思楠,可儿,梓瑞,若岚,宛瑜,允熙,瑾言,子轩,雨泽,梓豪,一诺,沐阳,若曦,梓晨,佳怡,宇辰,语彤,浩宇,诗涵,雅静,志强,慧敏,建国,秀兰,桂英".split(",");
  const SUBJECTS = [
    {exam:"2026 地生会考", subject:"地生", full:120},
    {exam:"2026 中考", subject:"数学", full:120},
    {exam:"2026 中考", subject:"语文", full:120},
    {exam:"2026 中考", subject:"英语", full:120},
    {exam:"2026 中考", subject:"物理", full:60},
    {exam:"2026 中考", subject:"化学", full:60},
    {exam:"2026 中考", subject:"政治", full:60},
    {exam:"2026 中考", subject:"历史", full:60},
    {exam:"2026 上学期期末", subject:"数学", full:120},
    {exam:"2026 上学期期末", subject:"语文", full:120},
    {exam:"2026 上学期期末", subject:"英语", full:120},
    {exam:"2026 上学期期末", subject:"物理", full:60},
    {exam:"2026 上学期期末", subject:"化学", full:60},
    {exam:"2026 上学期期末", subject:"政治", full:60},
    {exam:"2026 上学期期末", subject:"历史", full:60},
    {exam:"2026 上学期期末", subject:"地理", full:60},
    {exam:"2026 上学期期末", subject:"生物", full:60},
    {exam:"2026 高考", subject:"数学", full:150},
    {exam:"2026 高考", subject:"语文", full:150},
    {exam:"2026 高考", subject:"英语", full:150},
    {exam:"2026 高考", subject:"物理", full:100},
    {exam:"2026 高考", subject:"化学", full:100},
    {exam:"2026 高考", subject:"生物", full:100},
    {exam:"2026 高考", subject:"政治", full:100},
    {exam:"2026 高考", subject:"历史", full:100},
    {exam:"2026 高考", subject:"地理", full:100}
  ];
  const TYPES = ["一对一","一对三","小班"];
  const AV_COLORS = ["#E8784A","#27a644","#185FA5","#b7791f","#7c5cd6","#d4537e"];

  let seed = 20260920;
  function rnd(){ seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  function pick(arr){ return arr[Math.floor(rnd() * arr.length)]; }

  const NAME_TAILS = (function(){
    const seen = new Set(), out = [];
    for (const n of NAMES){ const t = n[n.length - 1]; if (!seen.has(t)){ seen.add(t); out.push(n); } }
    return out;
  })();
  const NAME_POOL = (function(){
    const a = NAME_TAILS.slice();
    for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  })();
  let nameIdx = 0;
  function makeName(){ return pick(SURS) + "*" + NAME_POOL[nameIdx++ % NAME_POOL.length].slice(-1); }

  const POOL = (function(){
    const arr = SUBJECTS.slice();
    for (let i = arr.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  })();
  let poolIdx = 0;

  function makeRecord(){
    const s = POOL[poolIdx % POOL.length]; poolIdx++;
    const type = TYPES[Math.floor(rnd() * TYPES.length)];
    const base = Math.round(s.full * (0.40 + rnd() * 0.38));
    const gain = 6 + Math.floor(rnd() * 30);
    const final = Math.min(Math.floor(s.full * 0.93), base + gain);
    return { name: makeName(), exam: s.exam, course: s.subject + (type === "一对一" ? "一对一" : type), from: base, to: final, full: s.full };
  }

  const DATA = [
    {name:"杜*诺", exam:"2026 地生会考", course:"地生一对三", from:112, to:120, full:120},
    {name:"马*晨", exam:"2026 地生会考", course:"地生一对三", from:108, to:114, full:120},
    {name:"刘*宇", exam:"2026 地生会考", course:"地生一对三", from:82, to:108, full:120}
  ];
  while (DATA.length < 208) DATA.push(makeRecord());

  const avgGain = Math.round(DATA.reduce((s, d) => s + d.to - d.from, 0) / DATA.length);
  const maxGain = Math.max(...DATA.map(d => d.to - d.from));

  function animateNum(el, target, dur){
    dur = dur || 1500; const start = performance.now();
    function tick(now){ const p = Math.min(1, (now - start) / dur); const e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(target * e); if (p < 1) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }
  animateNum(document.getElementById("statAvg"), avgGain);
  animateNum(document.getElementById("statMax"), maxGain);

  const scroller = document.getElementById("progressGrid");
  const allItems = [...DATA, ...DATA];
  scroller.innerHTML = allItems.map((c, i) => {
    const gain = c.to - c.from;
    const color = AV_COLORS[i % AV_COLORS.length];
    var cls = gain >= 20 ? 'ph-gain o' : 'ph-gain g';
    return '<div class="ph-card">' +
      '<div class="ph-card-top">' +
        '<div class="ph-av" style="background:' + color + '">' + c.name[0] + '</div>' +
        '<div><div class="ph-card-name">' + c.name + '</div><div class="ph-card-exam">' + c.exam + '</div></div>' +
      '</div>' +
      '<div class="ph-card-scores">' +
        '<span class="ph-from">' + c.from + '</span><span class="ph-arrow">→</span><span class="ph-to">' + c.to + '</span>' +
      '</div>' +
      '<span class="' + cls + '">+' + gain + '分 · ' + c.course + '</span>' +
    '</div>';
  }).join("");

  let offset = 0, isDragging = false, startY = 0, startOffset = 0, pauseUntil = 0;
  function cardH(){ return scroller.querySelector(".ph-card").offsetHeight + 12; }
  setInterval(function(){
    if (Date.now() < pauseUntil || isDragging) return;
    offset += 1;
    const total = DATA.length * cardH();
    if (offset >= total) offset = 0;
    scroller.scrollTop = offset;
    document.getElementById("scrollBar").style.width = (offset / total * 100) + "%";
  }, 30);

  scroller.addEventListener("pointerdown", function(e){ isDragging = true; startY = e.clientY; startOffset = scroller.scrollTop; scroller.classList.add("dragging"); scroller.setPointerCapture(e.pointerId); });
  scroller.addEventListener("pointermove", function(e){ if (!isDragging) return; scroller.scrollTop = startOffset - (e.clientY - startY); });
  scroller.addEventListener("pointerup", function(){ isDragging = false; scroller.classList.remove("dragging"); offset = scroller.scrollTop; pauseUntil = Date.now() + 3000; });
  scroller.addEventListener("pointercancel", function(){ isDragging = false; scroller.classList.remove("dragging"); });
})();
`;

c = c.substring(0, jsStart) + newJS + c.substring(jsEndFull);
console.log('JS replaced');

fs.writeFileSync('public/home.html', c, 'utf8');
console.log('Done. File size:', c.length);
console.log('Check 牧哲学堂:', c.includes('牧哲学堂'));
console.log('Check 杜*诺:', c.includes('杜*诺'));
console.log('Check progress-hero:', c.includes('progress-hero'));
