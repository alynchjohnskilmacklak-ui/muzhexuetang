
/* ================= 学员进步对比：深色6宫格自动滚动 ================= */
(function(){
  const SURS = "王李张刘陈杨黄赵周吴徐孙马朱胡郭林何高罗郑梁谢宋唐许韩冯邓曹彭曾萧田董袁潘蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤".split("");
  const NAMES = "浩然,梓萱,雨欣,俊杰,欣怡,子涵,宇轩,晨曦,欣妍,铭泽,思远,嘉懿,雨桐,天佑,静姝,梦琪,俊驰,可馨,佳禾,亦凡,书瑶,睿哲,若彤,立诚,沐宸,芷晴,彦博,博文,雅宁,悦心,景行,嘉树,明宇,婉清,泽翰,星辰,语嫣,承恩,清雅,弘毅,瑞霖,诗颖,卓航,嘉乐,思齐,云帆,承睿,思源,子墨,安妮,俊朗,欣蕾,乐珊,思楠,可儿,梓瑞,若岚,宛瑜,允熙,瑾言,子轩,雨泽,梓豪,一诺,沐阳,若曦,梓晨,雨桐,思远,佳怡,子墨,欣怡,宇辰,语彤,浩宇,诗涵,俊杰,雅静,志强,慧敏,建国,秀兰,桂英".split(",");
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
    const gain = 10 + Math.floor(rnd() * 36);
    const final = Math.min(Math.floor(s.full * 0.93), base + gain);
    return { name: makeName(), exam: s.exam, course: s.subject + (type === "一对一" ? "一对一" : type), from: base, to: final, full: s.full };
  }

  const DATA = [
    {name:"杜*诺", exam:"2026 地生会考", course:"地生一对三", from:98, to:120, full:120},
    {name:"马*晨", exam:"2026 地生会考", course:"地生一对三", from:85, to:112, full:120},
    {name:"刘*宇", exam:"2026 地生会考", course:"地生一对三", from:68, to:108, full:120}
  ];
  while (DATA.length < 208) DATA.push(makeRecord());

  const avgGain = Math.round(DATA.reduce((s, d) => s + d.to - d.from, 0) / DATA.length);
  const maxGain = Math.max(...DATA.map(d => d.to - d.from));

  // 数字滚动
  function animateNum(el, target, dur){
    dur = dur || 1500; const start = performance.now();
    function tick(now){ const p = Math.min(1, (now - start) / dur); const e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(target * e); if (p < 1) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }
  animateNum(document.getElementById("statAvg"), avgGain);
  animateNum(document.getElementById("statMax"), maxGain);

  // 渲染6宫格（复制两份实现无缝滚动）
  const scroller = document.getElementById("progressGrid");
  const allItems = [...DATA, ...DATA];
  scroller.innerHTML = allItems.map((c, i) => {
    const gain = c.to - c.from;
    const color = AV_COLORS[i % AV_COLORS.length];
    return `<div class="ph-card">
      <div class="ph-card-top">
        <div class="ph-av" style="background:${color}">${c.name[0]}</div>
        <div><div class="ph-card-name">${c.name}</div><div class="ph-card-exam">${c.exam}</div></div>
      </div>
      <div class="ph-card-scores">
        <span class="ph-from">${c.from}</span><span class="ph-arrow">→</span><span class="ph-to">${c.to}</span>
      </div>
      <span class="ph-gain ${gain >= 20 ? 'o' : 'g'}">+${gain}分 · ${c.course}</span>
    </div>`;
  }).join("");

  // 自动滚动 + 手动滑动
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


/* ================= 业务数据 ================= */
const SERVICES = [
  {
    id:"01", name:"寒暑假冲刺预备课", sub:"集中学习 · 系统复习 · 查漏补缺 · 专项训练",
    slides:[
      {src:"./about-images/01-1.png", cap:"寒暑假冲刺预备课 · 招生说明"},
      {src:"./about-images/01-2.png", cap:"寒暑假冲刺预备课 · 课程设置"},
      {src:"./about-images/01-3.png", cap:"寒暑假冲刺预备课 · 年级与科目"},
      {src:"./about-images/01-4.png", cap:"寒暑假冲刺预备课 · 服务亮点"},
      {src:"./about-images/01-5.png", cap:"寒暑假冲刺预备课 · 校区服务"}
    ]
  },
  {
    id:"02", name:"一对一冲刺课程", sub:"课后即反馈 · 学情报告 · 学习留痕 · 量身定制",
    slides:[
      {src:"./about-images/02-1.png", cap:"一对一冲刺课程 · 个性化教学"},
      {src:"./about-images/02-2.png", cap:"一对一冲刺课程 · 课堂反馈"},
      {src:"./about-images/02-3.png", cap:"一对一冲刺课程 · 学情报告"},
      {src:"./about-images/02-4.png", cap:"一对一冲刺课程 · 学习留痕"},
      {src:"./about-images/02-5.png", cap:"一对一冲刺课程 · 量身定制冲刺"}
    ]
  },
  {
    id:"03", name:"晚间课业辅导营", sub:"当天问题当天讲 · 作业前后对比可查",
    slides:[
      {src:"./about-images/03-1.png", cap:"晚间课业辅导营 · 晚间学习场景"},
      {src:"./about-images/03-2.png", cap:"晚间课业辅导营 · 作业辅导"},
      {src:"./about-images/03-3.png", cap:"晚间课业辅导营 · 答疑讲解"},
      {src:"./about-images/03-4.png", cap:"晚间课业辅导营 · 作业前后对比"}
    ]
  },
  {
    id:"04", name:"周末先锋营", sub:"本周疑难点及时解决 · 下周新知识提前预备",
    slides:[
      {src:"./about-images/04-1.png", cap:"周末先锋营 · 周末学习安排"},
      {src:"./about-images/04-2.png", cap:"周末先锋营 · 疑难点专项讲解"},
      {src:"./about-images/04-3.png", cap:"周末先锋营 · 查漏补缺"},
      {src:"./about-images/04-4.png", cap:"周末先锋营 · 提前预备新知识"}
    ]
  },
  {
    id:"05", name:"中考升学规划", sub:"新乐首家志愿填报模拟平台 · 92 所高中信息",
    slides:[
      {src:"./about-images/05-1.png", cap:"中考升学规划 · 志愿填报模拟平台"},
      {src:"./about-images/05-2.png", cap:"中考升学规划 · 分数定位"},
      {src:"./about-images/05-3.png", cap:"中考升学规划 · 志愿结构"},
      {src:"./about-images/05-4.png", cap:"中考升学规划 · 冲稳保方案"}
    ]
  },
  {
    id:"06", name:"高考志愿咨询", sub:"人工手工填报 · 就业导向选专业 · 最少 3 人审核",
    slides:[
      {src:"./about-images/06-1.png", cap:"高考志愿咨询 · 志愿填报指导"},
      {src:"./about-images/06-2.png", cap:"高考志愿咨询 · 专业选择"},
      {src:"./about-images/06-3.png", cap:"高考志愿咨询 · 就业研判"},
      {src:"./about-images/06-4.png", cap:"高考志愿咨询 · 多人审核"},
      {src:"./about-images/06-5.png", cap:"高考志愿咨询 · 交档讲解"}
    ]
  },
  {
    id:"07", name:"单招文化课辅导", sub:"单招在职教师授课 · 6 人小班 · 紧扣考纲",
    slides:[
      {src:"./about-images/07-1.png", cap:"单招文化课辅导 · 单招专项"},
      {src:"./about-images/07-2.png", cap:"单招文化课辅导 · 6 人小班"},
      {src:"./about-images/07-3.png", cap:"单招文化课辅导 · 紧扣考纲"},
      {src:"./about-images/07-4.png", cap:"单招文化课辅导 · 阶段测试"},
      {src:"./about-images/07-5.png", cap:"单招文化课辅导 · 提分看得见"}
    ]
  },
  {
    id:"08", name:"考研公共课辅导", sub:"在读硕士高分授课 · 直系学长学姐资源对接",
    slides:[
      {src:"./about-images/08-1.png", cap:"考研公共课辅导 · 高分师资"},
      {src:"./about-images/08-2.png", cap:"考研公共课辅导 · 数学体系"},
      {src:"./about-images/08-3.png", cap:"考研公共课辅导 · 英语方法"},
      {src:"./about-images/08-4.png", cap:"考研公共课辅导 · 复习规划"},
      {src:"./about-images/08-5.png", cap:"考研公共课辅导 · 学长学姐对接"},
      {src:"./about-images/08-6.png", cap:"考研公共课辅导 · 服务对比"}
    ]
  }
];

/* ================= 状态 ================= */
let currentService = 0;
let currentSlide = 0;
let timer = null;
const INTERVAL = 3000;

/* ================= DOM 引用 ================= */
const listEl = document.getElementById("serviceList");
const stageEl = document.getElementById("stage3d");
const thumbsEl = document.getElementById("carouselThumbs");
const nameEl = document.getElementById("carouselName");
const subEl = document.getElementById("carouselSub");
const countCurEl = document.getElementById("countCur");
const countTotalEl = document.getElementById("countTotal");
const progressEl = document.getElementById("progressBar");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

/* ================= 渲染列表 ================= */
SERVICES.forEach((s, i) => {
  const item = document.createElement("div");
  item.className = "service-item" + (i === 0 ? " active" : "");
  item.setAttribute("role", "tab");
  item.innerHTML = `
    <span class="num">${s.id}</span>
    <span class="txt">
      <span class="name">${s.name}</span>
      <span class="sub">${s.sub}</span>
    </span>
    <span class="dot"></span>`;
  item.addEventListener("click", () => selectService(i));
  listEl.appendChild(item);
});

/* ================= 渲染 3D 卡片 ================= */
function renderCards(service){
  stageEl.innerHTML = "";
  thumbsEl.innerHTML = "";
  service.slides.forEach((sl, i) => {
    const displaySrc = sl.src.replace(/\.png$/, ".webp");
    const thumbnailSrc = sl.src.replace(/\.png$/, "-thumb.webp");
    const card = document.createElement("div");
    card.className = "c3d-card";
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-img"><img src="${displaySrc}" alt="${sl.cap}" loading="${i === 0 ? "eager" : "lazy"}" decoding="async" fetchpriority="${i === 0 ? "high" : "low"}"/></div>
        <div class="card-cap">${sl.cap}</div>
      </div>`;
    stageEl.appendChild(card);

    const th = document.createElement("button");
    th.className = "thumb";
    th.innerHTML = `<img src="${thumbnailSrc}" alt="" loading="lazy" decoding="async"/>`;
    th.addEventListener("click", () => { goTo(i); restart(); });
    thumbsEl.appendChild(th);
  });
  countTotalEl.textContent = String(service.slides.length).padStart(2, "0");
  layoutCards();
}

/* 3D 斜角布局：当前卡片正面居中，两侧卡片旋转倾斜 */
function layoutCards(){
  const cards = stageEl.querySelectorAll(".c3d-card");
  const n = cards.length;
  cards.forEach((card, i) => {
    let off = i - currentSlide;
    if (off > n / 2) off -= n;
    if (off < -n / 2) off += n;
    const abs = Math.abs(off);
    card.style.zIndex = String(20 - abs);
    card.style.visibility = abs > 2 ? "hidden" : "visible";
    if (off === 0){
      card.classList.add("active");
      card.style.transform = "translateX(-50%) rotateY(0deg) scale(1)";
      card.style.opacity = 1;
    } else {
      card.classList.remove("active");
      const dir = off > 0 ? 1 : -1;
      const rot = dir * 34;
      const tx = dir * (58 + (abs - 1) * 8);
      const sc = Math.max(0.70, 1 - abs * 0.15);
      const op = Math.max(0.22, 1 - abs * 0.28);
      card.style.transform = `translateX(calc(-50% + ${tx}%)) rotateY(${rot}deg) scale(${sc})`;
      card.style.opacity = op;
    }
  });
  const thumbs = thumbsEl.querySelectorAll(".thumb");
  thumbs.forEach((t, i) => t.classList.toggle("active", i === currentSlide));
  countCurEl.textContent = String(currentSlide + 1).padStart(2, "0");
  progressEl.classList.remove("run");
  void progressEl.offsetWidth;
  progressEl.classList.add("run");
}

function goTo(i){
  const svc = SERVICES[currentService];
  currentSlide = (i + svc.slides.length) % svc.slides.length;
  layoutCards();
}
function next(){ goTo(currentSlide + 1); }
function prev(){ goTo(currentSlide - 1); }

function selectService(i){
  if (currentService === i) return;
  currentService = i;
  currentSlide = 0;
  const svc = SERVICES[i];
  nameEl.textContent = svc.name;
  subEl.textContent = svc.sub;
  document.querySelectorAll(".service-item").forEach((el, idx) => el.classList.toggle("active", idx === i));
  renderCards(svc);
  restart();
}

/* ================= 自动播放 ================= */
function play(){
  timer = setInterval(() => {
    const svc = SERVICES[currentService];
    if (currentSlide >= svc.slides.length - 1){
      // 当前业务放映完毕 → 自动切换下一个业务继续放映
      selectService((currentService + 1) % SERVICES.length);
    } else {
      next();
    }
  }, INTERVAL);
}
function stop(){ clearInterval(timer); timer = null; }
function restart(){ stop(); play(); }

prevBtn.addEventListener("click", () => { prev(); restart(); });
nextBtn.addEventListener("click", () => { next(); restart(); });

const carouselEl = document.querySelector(".carousel");
carouselEl.addEventListener("mouseenter", stop);
carouselEl.addEventListener("mouseleave", () => { if (!timer) play(); });

/* 滑动切换（触摸 + 鼠标拖拽统一，Pointer Events） */
let dragX = null, dragY = null;
stageEl.addEventListener("pointerdown", (e) => { dragX = e.clientX; dragY = e.clientY; stop(); }, {passive:true});
stageEl.addEventListener("pointerup", (e) => {
  if (dragX === null) return;
  const dx = e.clientX - dragX;
  const dy = e.clientY - dragY;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)){ dx < 0 ? next() : prev(); restart(); }
  dragX = null;
});

/* ================= 初始化 ================= */
renderCards(SERVICES[0]);
play();
