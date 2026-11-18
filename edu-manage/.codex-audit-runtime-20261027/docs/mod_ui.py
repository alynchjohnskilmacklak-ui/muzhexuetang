# -*- coding: utf-8 -*-
"""home.html UI 修复 3-12 项：批量精确替换，每处断言唯一"""
import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATH = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html"
with io.open(PATH, "r", encoding="utf-8") as f:
    html = f.read()

# (label, old, new, expected_count)
PAIRS = [
# ---------- 5. 对比度：token 与颜色 ----------
("ink-faint 加深",
 "--ink-faint:#A39684;", "--ink-faint:#6B5F52;", 1),
("新增深色 token",
 "--seal:#B23A2E;\n    --wrap-w:1320px;",
 "--seal:#B23A2E;\n    --primary-deep:#C2541F;\n    --primary-deep-2:#A84A1F;\n    --gain-g:#1E7A33;\n    --gain-g2:#1A6E2E;\n    --gain-o:#B06A1F;\n    --gain-o2:#945416;\n    --radius-sm:12px;\n    --radius-lg:24px;\n    --shadow-lg:0 24px 60px rgba(23,16,9,.30);\n    --wrap-w:1320px;", 1),
("全局焦点环 + 标题防孤行",
 "a{color:inherit;text-decoration:none}",
 "a{color:inherit;text-decoration:none}\n  :focus-visible{outline:2px solid var(--primary-deep);outline-offset:2px}\n  h1,h2,h3{text-wrap:balance}", 1),
("nav 登录按钮深橙",
 "background:var(--primary);color:#fff;\n    padding:9px 22px;border-radius:12px;font-weight:700;",
 "background:linear-gradient(135deg,var(--primary-deep),var(--primary-deep-2));color:#fff;\n    padding:9px 22px;border-radius:12px;font-weight:700;", 1),
("nav 登录 hover",
 ".nav .login:hover{background:var(--primary-dark);color:#fff;transform:translateY(-1px)}",
 ".nav .login:hover{background:var(--primary-deep-2);color:#fff;transform:translateY(-1px)}", 1),
("nav 链接 hover 深橙",
 ".nav a:hover{color:var(--primary)}", ".nav a:hover{color:var(--primary-deep)}", 1),
("hero eyebrow 深橙",
 "color:var(--primary);margin-bottom:18px;font-weight:600;",
 "color:var(--primary-deep);margin-bottom:18px;font-weight:600;", 1),
("section-title tag 深橙",
 "color:var(--primary);margin-bottom:8px;",
 "color:var(--primary-deep);margin-bottom:8px;", 1),
("progress p-tag 深橙",
 "color:var(--primary);margin-bottom:10px;",
 "color:var(--primary-deep);margin-bottom:10px;", 1),
("service-item active 深橙",
 "background:linear-gradient(135deg,#EE8B5C,#D96438);color:#fff;border-color:transparent;",
 "background:linear-gradient(135deg,var(--primary-deep),var(--primary-deep-2));color:#fff;border-color:transparent;", 1),
("p-tab active 深橙",
 ".p-tab.active{\n    background:var(--primary);color:#fff;border-color:var(--primary);\n    box-shadow:0 6px 16px rgba(232,120,74,.35);\n  }",
 ".p-tab.active{\n    background:linear-gradient(135deg,var(--primary-deep),var(--primary-deep-2));color:#fff;border-color:transparent;\n    box-shadow:0 6px 16px rgba(200,84,31,.35);\n  }", 1),
("p-gain 深绿",
 "background:linear-gradient(135deg,#27a644,#1E8B3A);",
 "background:linear-gradient(135deg,var(--gain-g),var(--gain-g2));", 1),
("p-gain.big 深金",
 "background:linear-gradient(135deg,#E8A05A,#D9783C);",
 "background:linear-gradient(135deg,var(--gain-o),var(--gain-o2));", 1),
("p-more hover 深橙",
 ".p-more:hover{background:var(--primary);color:#fff;border-color:var(--primary)}",
 ".p-more:hover{background:linear-gradient(135deg,var(--primary-deep),var(--primary-deep-2));color:#fff;border-color:transparent}", 1),
("p-stat 大数字色",
 "font-size:clamp(26px,3.6vw,34px);font-weight:800;color:var(--primary);",
 "font-size:clamp(26px,3.6vw,34px);font-weight:800;color:#D9643C;", 1),
("p-type 深橙+12px",
 "font-size:10.5px;color:var(--primary-dark);",
 "font-size:12px;color:var(--primary-deep);", 1),
("portal 按钮文字深橙",
 "background:#fff;color:var(--primary-dark);\n    font-size:17px;",
 "background:#fff;color:var(--primary-deep);\n    font-size:17px;", 1),
("visit 链接深橙",
 ".visit .items a{color:var(--primary)}", ".visit .items a{color:var(--primary-deep)}", 1),
("footer 链接 hover 深橙",
 ".footer a:hover{color:var(--primary)}", ".footer a:hover{color:var(--primary-deep)}", 1),
("ph-main-stat 深橙渐变",
 "background:linear-gradient(135deg,#E8784A,#D9643C);border:none;box-shadow:0 12px 32px rgba(232,120,74,.3)}",
 "background:linear-gradient(135deg,var(--primary-deep),var(--primary-deep-2));border:none;box-shadow:0 12px 32px rgba(200,84,31,.3)}", 1),
("ph-gain.g 深绿",
 ".ph-gain.g{background:linear-gradient(135deg,#27a644,#1e8b3a)}",
 ".ph-gain.g{background:linear-gradient(135deg,var(--gain-g),var(--gain-g2))}", 1),
("ph-gain.o 深金",
 ".ph-gain.o{background:linear-gradient(135deg,#E8A05A,#D9783C)}",
 ".ph-gain.o{background:linear-gradient(135deg,var(--gain-o),var(--gain-o2))}", 1),
("ph-t-gain 深绿+12px",
 ".ph-t-gain{font-size:10px;color:#27a644;margin-top:2px}",
 ".ph-t-gain{font-size:12px;color:var(--gain-g);margin-top:2px}", 1),
("移动端 p-tab active 深橙",
 ".p-tab.active{background:linear-gradient(135deg,#EE8B5C,#D96438);border-color:transparent}",
 ".p-tab.active{background:linear-gradient(135deg,var(--primary-deep),var(--primary-deep-2));border-color:transparent}", 1),
("移动端 bottom-bar 登录深橙",
 "background:linear-gradient(135deg,#EE8B5C,#D96438);color:#fff;\n      font-size:15px;",
 "background:linear-gradient(135deg,var(--primary-deep),var(--primary-deep-2));color:#fff;\n      font-size:15px;", 1),
("AV_COLORS 加深",
 'const AV_COLORS = ["#E8784A","#27a644","#185FA5","#b7791f","#7c5cd6","#d4537e"];',
 'const AV_COLORS = ["#C2541F","#1E7A33","#185FA5","#8F5A12","#7c5cd6","#B03A5E"];', 1),
# ---------- 6. 小字放大 ----------
("ph-card-exam 12px",
 ".ph-card-exam{font-size:10px;color:#9a8e7a;line-height:1.2}",
 ".ph-card-exam{font-size:12px;color:#9a8e7a;line-height:1.3}", 1),
("p-exam 12px",
 "font-size:10px;color:var(--ink-faint);background:#F3EDE4;",
 "font-size:12px;color:var(--ink-faint);background:#F3EDE4;", 1),
("p-score 12px",
 "font-size:10.5px;color:var(--ink-faint);font-variant-numeric:tabular-nums;",
 "font-size:12px;color:var(--ink-faint);font-variant-numeric:tabular-nums;", 1),
("p-gain span 11px",
 ".p-gain span{font-size:9px;opacity:.92;letter-spacing:.05em}",
 ".p-gain span{font-size:11px;opacity:.92;letter-spacing:.05em}", 1),
("ph-t-name 12px",
 ".ph-t-name{font-size:11px;color:#b9a996;margin-bottom:4px}",
 ".ph-t-name{font-size:12px;color:#b9a996;margin-bottom:4px}", 1),
("ph-label 12px",
 ".ph-label{font-size:11px;color:#b9a996;margin-top:6px}",
 ".ph-label{font-size:12px;color:#b9a996;margin-top:6px}", 1),
("ph-note 12px",
 ".ph-note{text-align:center;font-size:11px;color:#6b5e4e;padding:8px 16px 20px;max-width:1320px;margin:0 auto}",
 ".ph-note{text-align:center;font-size:12px;color:#6b5e4e;padding:8px 16px 20px;max-width:1320px;margin:0 auto}", 1),
# ---------- 7. 断点清理：删除 779-818 重复块 ----------
("删除移动端重复覆盖块",
 re.compile(r"\n    /\* -- 移动端重构：统一节奏、减少堆叠 -- \*/\n    body\{.*?\n  \}\n", re.S),
 "\n", 1),
("p-tabs 移动端横滑（并入主块）",
 ".p-tabs{margin-bottom:14px;gap:8px}",
 ".p-tabs{margin-bottom:14px;gap:8px;flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;padding-bottom:6px;-webkit-overflow-scrolling:touch;scrollbar-width:none}\n    .p-tabs::-webkit-scrollbar{display:none}", 1),
# ---------- 8. 胶囊副题允许换行 ----------
("service-item sub 换行",
 ".service-item .sub{font-size:12px;color:var(--ink-soft);white-space:nowrap}",
 ".service-item .sub{font-size:12px;color:var(--ink-soft);white-space:normal}", 1),
# ---------- 9. 圆角体系 ----------
("services 圆角",
 "border-radius:28px;\n    margin:0 24px;",
 "border-radius:var(--radius-lg);\n    margin:0 24px;", 1),
("services 阴影 token",
 "box-shadow:0 24px 60px rgba(23,16,9,.30);",
 "box-shadow:var(--shadow-lg);", 1),
("progress 圆角",
 "border-radius:26px;padding:44px 34px 32px;",
 "border-radius:var(--radius-lg);padding:44px 34px 32px;", 1),
("progress-hero 圆角+阴影",
 "border-radius:26px;padding:40px 28px 28px;box-shadow:0 24px 60px rgba(26,18,8,.35);",
 "border-radius:var(--radius-lg);padding:40px 28px 28px;box-shadow:var(--shadow-lg);", 1),
("p-stat 圆角 14",
 "border-radius:16px;padding:20px 16px;text-align:center;",
 "border-radius:var(--radius-sm);padding:20px 16px;text-align:center;", 1),
("ph-stat 圆角 14",
 "border-radius:18px;padding:20px 12px;text-align:center}",
 "border-radius:var(--radius-sm);padding:20px 12px;text-align:center}", 1),
("ph-card 圆角 14",
 "border-radius:16px;padding:14px 12px;display:flex;",
 "border-radius:var(--radius-sm);padding:14px 12px;display:flex;", 1),
("c3d-card 圆角 16",
 "border-radius:20px;overflow:hidden;\n    box-shadow:0 30px 60px rgba(0,0,0,.5);",
 "border-radius:16px;overflow:hidden;\n    box-shadow:0 30px 60px rgba(0,0,0,.5);", 1),
("移动端 services 圆角 20(1)",
 "border-radius:24px;padding:30px 0 26px;",
 "border-radius:20px;padding:30px 0 26px;", 1),
("移动端 services 圆角 20(2)",
 ".services{margin:0 10px;padding:22px 0 18px;border-radius:18px}",
 ".services{margin:0 10px;padding:22px 0 18px;border-radius:20px}", 1),
# ---------- 10. 点击目标 ----------
("arrow-btn 44",
 "width:38px;height:38px;border-radius:50%;",
 "width:44px;height:44px;border-radius:50%;", 1),
("thumb 高 44",
 "width:52px;height:38px;border-radius:8px;overflow:hidden;",
 "width:52px;height:44px;border-radius:8px;overflow:hidden;", 1),
# ---------- 3. 暂停控件 + reduced-motion ----------
("carousel-top 加暂停按钮",
 '          <div class="carousel-count"><b id="countCur">01</b> / <span id="countTotal">05</span></div>\n        </div>',
 '          <div class="carousel-count"><b id="countCur">01</b> / <span id="countTotal">05</span></div>\n          <button class="pause-btn" id="pauseBtn" type="button" aria-label="暂停自动播放">❚❚</button>\n        </div>', 1),
("pause-btn 样式",
 ".arrow-btn:hover{background:var(--gold);border-color:var(--gold);color:#241A10}",
 ".arrow-btn:hover{background:var(--gold);border-color:var(--gold);color:#241A10}\n  .pause-btn{width:34px;height:34px;border-radius:50%;flex:none;border:1px solid rgba(245,237,226,.22);background:rgba(255,255,255,.05);color:var(--cream);font-size:14px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .2s,border-color .2s,color .2s}\n  .pause-btn:hover{background:var(--gold);border-color:var(--gold);color:#241A10}", 1),
("ph-hint 加暂停按钮",
 '<div class="ph-hint">↑ 自动滚动 · 可上下滑动浏览 ↑</div>',
 '<div class="ph-hint"><span>↑ 自动滚动 · 可上下滑动浏览 ↑</span><button class="ph-pause-btn" id="phPauseBtn" type="button" aria-label="暂停自动滚动">❚❚ 暂停</button></div>', 1),
("ph-hint 样式+按钮样式",
 ".ph-hint{text-align:center;font-size:10px;color:#6b5e4e;padding:6px 0 10px}",
 ".ph-hint{display:flex;align-items:center;justify-content:center;gap:10px;text-align:center;font-size:12px;color:#6b5e4e;padding:6px 0 10px}\n  .ph-pause-btn{border:1px solid rgba(200,150,90,.4);background:rgba(255,255,255,.72);color:#8a5a2b;font-size:12px;line-height:1;padding:7px 14px;border-radius:999px;cursor:pointer;font-family:inherit;min-height:32px}\n  .ph-pause-btn:hover{background:rgba(232,160,90,.18)}",
 1),
# ---------- 4. 业务胶囊键盘 + thumb aria ----------
("service-item 改 button + 键盘",
 """SERVICES.forEach((s, i) => {
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
});""",
 """SERVICES.forEach((s, i) => {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "service-item" + (i === 0 ? " active" : "");
  item.setAttribute("role", "tab");
  item.setAttribute("aria-selected", i === 0 ? "true" : "false");
  item.tabIndex = i === 0 ? 0 : -1;
  item.innerHTML = `
    <span class="num">${s.id}</span>
    <span class="txt">
      <span class="name">${s.name}</span>
      <span class="sub">${s.sub}</span>
    </span>
    <span class="dot"></span>`;
  item.addEventListener("click", () => selectService(i));
  item.addEventListener("keydown", (e) => {
    const items = Array.from(listEl.querySelectorAll(".service-item"));
    const idx = items.indexOf(item);
    let ni = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") ni = (idx + 1) % items.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") ni = (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") ni = 0;
    else if (e.key === "End") ni = items.length - 1;
    if (ni >= 0){ e.preventDefault(); selectService(ni); items[ni].focus(); }
  });
  listEl.appendChild(item);
});""", 1),
("service-item 字体继承",
 ".service-item{\n    display:flex;align-items:center;gap:10px;",
 ".service-item{\n    font-family:inherit;\n    display:flex;align-items:center;gap:10px;", 1),
("selectService 同步 aria/tabindex",
 'document.querySelectorAll(".service-item").forEach((el, idx) => el.classList.toggle("active", idx === i));',
 'document.querySelectorAll(".service-item").forEach((el, idx) => { el.classList.toggle("active", idx === i); el.setAttribute("aria-selected", idx === i ? "true" : "false"); el.tabIndex = idx === i ? 0 : -1; });', 1),
("thumb aria-label",
 'th.addEventListener("click", () => { goTo(i); restart(); });',
 'th.setAttribute("aria-label", "查看第" + (i + 1) + "张：" + sl.cap);\n    th.addEventListener("click", () => { goTo(i); restart(); });', 1),
# ---------- 3. 轮播 JS：暂停 + reduced-motion ----------
("轮播 JS 加 reduceMotion+paused",
 """let currentService = 0;
let currentSlide = 0;
let timer = null;
const INTERVAL = 3000;""",
 """let currentService = 0;
let currentSlide = 0;
let timer = null;
let paused = false;
const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const INTERVAL = 3000;""", 1),
("play 尊重 reduceMotion",
 """function play(){
  timer = setInterval(() => {""",
 """function play(){
  if (reduceMotion) return;
  timer = setInterval(() => {""", 1),
("restart 尊重 paused/reduceMotion",
 "function restart(){ stop(); play(); }",
 "function restart(){ stop(); if (!paused && !reduceMotion) play(); }", 1),
("mouseleave 尊重 paused/reduceMotion",
 'carouselEl.addEventListener("mouseleave", () => { if (!timer) play(); });',
 'carouselEl.addEventListener("mouseleave", () => { if (!timer && !paused && !reduceMotion) play(); });', 1),
("pauseBtn 事件+初始化 guard",
 """prevBtn.addEventListener("click", () => { prev(); restart(); });
nextBtn.addEventListener("click", () => { next(); restart(); });""",
 """const pauseBtn = document.getElementById("pauseBtn");
function setPaused(p){
  paused = p;
  pauseBtn.textContent = p ? "▶" : "❚❚";
  pauseBtn.setAttribute("aria-label", p ? "继续自动播放" : "暂停自动播放");
  if (p){ stop(); progressEl.classList.remove("run"); } else { restart(); }
}
pauseBtn.addEventListener("click", () => setPaused(!paused));
prevBtn.addEventListener("click", () => { prev(); restart(); });
nextBtn.addEventListener("click", () => { next(); restart(); });""", 1),
# ---------- 3. 进步榜 JS：暂停 + reduced-motion ----------
("进步榜 reduceMotion+暂停",
 """  // 自动滚动 + 手动滑动
  let offset = 0, isDragging = false, startY = 0, startOffset = 0, pauseUntil = 0;
  function cardH(){ return scroller.querySelector(".ph-card").offsetHeight + 12; }
  setInterval(function(){
    if (Date.now() < pauseUntil || isDragging) return;
    offset += 1;
    const total = DATA.length * cardH();
    if (offset >= total) offset = 0;
    scroller.scrollTop = offset;
    document.getElementById("scrollBar").style.width = (offset / total * 100) + "%";
  }, 30);""",
 """  // 自动滚动 + 手动滑动
  let offset = 0, isDragging = false, startY = 0, startOffset = 0, pauseUntil = 0;
  function cardH(){ return scroller.querySelector(".ph-card").offsetHeight + 12; }
  const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let phPaused = reduceMotion;
  const phPauseBtn = document.getElementById("phPauseBtn");
  if (phPaused){ phPauseBtn.textContent = "▶ 继续"; phPauseBtn.setAttribute("aria-label", "继续自动滚动"); }
  phPauseBtn.addEventListener("click", function(){
    phPaused = !phPaused;
    phPauseBtn.textContent = phPaused ? "▶ 继续" : "❚❚ 暂停";
    phPauseBtn.setAttribute("aria-label", phPaused ? "继续自动滚动" : "暂停自动滚动");
  });
  setInterval(function(){
    if (Date.now() < pauseUntil || isDragging || phPaused) return;
    offset += 1;
    const total = DATA.length * cardH();
    if (offset >= total) offset = 0;
    scroller.scrollTop = offset;
    document.getElementById("scrollBar").style.width = (offset / total * 100) + "%";
  }, 30);""", 1),
# ---------- 12. 广告法灰色词 ----------
("08 sub 去高分",
 'sub:"在读硕士高分授课 · 直系学长学姐资源对接",',
 'sub:"在读硕士授课 · 直系学长学姐资源对接",', 1),
("08 cap 去高分",
 'cap:"考研公共课辅导 · 高分师资"},',
 'cap:"考研公共课辅导 · 授课师资"},', 1),
]

ok, fail = 0, 0
for label, old, new, cnt in PAIRS:
    if isinstance(old, re.Pattern):
        found = len(old.findall(html))
    else:
        found = html.count(old)
    if found != cnt:
        print("SKIP  %-28s 期望 %d 实际 %d" % (label, cnt, found))
        fail += 1
        continue
    if isinstance(old, re.Pattern):
        html = old.sub(new, html)
    else:
        html = html.replace(old, new)
    ok += 1
    print("OK    %s" % label)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(html)
print("\n完成 %d 项，跳过 %d 项" % (ok, fail))
