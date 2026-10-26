/* 生成首页 / about 的「改动前·改动后·差异」三视图预览（只读，不改线上文件） */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUB = path.join(ROOT, 'edu-manage', 'public');
const OUT = path.join(ROOT, '_preview');
fs.mkdirSync(OUT, { recursive: true });

const read = (p) => fs.readFileSync(p, 'utf8');

/* 真实数据来源：直接执行两个页面自带的脚本导出，绝不手敲数字 */
const { homeData, aboutData } = require('./_data_source.js');
const HD = homeData();   // 首页：208 条，avg 22，max 45
const AD = aboutData();  // about：126 条，avg +18

const report = [];
const changes = { home: [], about: [] };

/** 逐文件自动适配换行符（home.html 是 CRLF，about.html 是 LF） */
function makePatcher(page, src) {
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const N = (s) => s.replace(/\r?\n/g, eol);

  /** 收集所有 <script>/<style>/<title> 的「原始文本区」范围，锚点绝不能插进去 */
  function rawTextRanges(hay) {
    const ranges = [];
    const re = /<(script|style|title)\b[^>]*>[\s\S]*?<\/\1>/gi;
    let m;
    while ((m = re.exec(hay))) ranges.push([m.index, m.index + m[0].length]);
    return ranges;
  }
  const inRawText = (ranges, pos) => ranges.some(([a, b]) => pos >= a && pos < b);

  /**
   * 找一个「安全」的锚点插入位置。
   * 关键：替换内容里的文字可能既出现在正文，也出现在脚本里
   * （例如 "statAvg" 既是预渲染的 span id，也出现在 animateNum(...) 里）。
   * 上一版就是因此把锚点插进了 <script>，直接造成 Uncaught SyntaxError。
   */
  function anchorPosition(hay, fromText) {
    const ranges = rawTextRanges(hay);
    let searchFrom = 0;
    for (;;) {
      const at = hay.indexOf(fromText, searchFrom);
      if (at < 0) return null;
      searchFrom = at + 1;
      if (inRawText(ranges, at)) continue;              // 落在脚本/样式里，跳过
      if (/^[ \t]*</.test(fromText)) return at;          // 以标签开头，安全
      const before = hay.lastIndexOf('<', at);
      if (before < 0 || inRawText(ranges, before)) continue;
      if (/^<(script|style|title)[\s>]/i.test(hay.slice(before, before + 12))) continue;
      const lineStart = hay.lastIndexOf('\n', before) + 1;
      if (lineStart > before) continue;                  // 不在行首，插进去会截断标签
      return before;
    }
  }

  return function patch(s, name, from, to, { required = true } = {}) {
    const F = N(from);
    const T = N(to);
    // 前后完全一致的「空改动」不计入清单
    if (F === T) {
      report.push({ page, name, status: '– 跳过(无实际变化)', count: 0 });
      return s;
    }
    const n = s.split(F).length - 1;
    if (n === 0) {
      report.push({ page, name, status: '✗ 未匹配', count: 0 });
      return s;
    }
    const idx = changes[page].length;
    changes[page].push({ name, before: F, after: T });

    const pos = anchorPosition(s, F);
    let out;
    if (pos === null) {
      report.push({ page, name, status: n === 1 ? '✓ (无锚点)' : `⚠ 匹配${n}处(只改第1处,无锚点)`, count: n });
      out = s.replace(F, T);
    } else {
      const anchor = `<span id="chg-${page}-${idx}"></span>` + eol;
      report.push({ page, name, status: n === 1 ? '✓' : `⚠ 匹配${n}处(只改第1处)`, count: n });
      out = s.slice(0, pos) + anchor + s.slice(pos);
      out = out.replace(F, T);
    }
    return out;
  };
}

/* ============================ 首页 ============================ */
let home0 = read(path.join(PUB, 'home.html'));
let home = home0;
const ph = makePatcher('home', home0);
const PH = (name, from, to, opt) => { home = ph(home, name, from, to, opt); };

PH('标题：18字 → 16字，品牌词改「新乐牧哲学堂」',
  `<title>牧哲学堂｜新乐文化课辅导与升学规划</title>`,
  `<title>新乐牧哲学堂｜河北新乐文化课辅导</title>`);

PH('描述：删掉「中考高考志愿填报」等表述',
  `<meta name="description" content="牧哲学堂2016年成立于河北新乐，专注文化课辅导、中考高考志愿填报、寒暑假冲刺与一对一教学，提供课程安排、考勤记录、课堂反馈与家校沟通服务。"/>`,
  `<meta name="description" content="新乐牧哲学堂2016年成立于河北新乐，专注文化课辅导与升学规划，提供课程安排、考勤记录、课堂反馈与家校沟通服务。"/>`);

PH('关键词：清掉硬营销词',
  `<meta name="keywords" content="牧哲学堂,新乐牧哲学堂,新乐辅导机构,新乐文化课辅导,中考志愿填报,高考志愿咨询,寒暑假冲刺,一对一辅导,MOREJOY"/>`,
  `<meta name="keywords" content="新乐牧哲学堂,牧哲学堂,河北新乐文化课辅导,牧哲学堂机构信息,家校沟通,MOREJOY"/>`);

PH('og:title 同步',
  `<meta property="og:title" content="牧哲学堂｜新乐文化课辅导与升学规划"/>`,
  `<meta property="og:title" content="新乐牧哲学堂｜河北新乐文化课辅导"/>`);

PH('新增 hreflang 声明',
  `<link rel="canonical" href="https://muzhexuetang.xyz/"/>`,
  `<link rel="canonical" href="https://muzhexuetang.xyz/"/>
<link rel="alternate" hreflang="zh-CN" href="https://muzhexuetang.xyz/"/>
<link rel="alternate" hreflang="x-default" href="https://muzhexuetang.xyz/"/>`);

PH('JSON-LD：品牌主名「新乐牧哲学堂」+ 短品牌别名',
  `  "name": "牧哲学堂",
  "alternateName": "MOREJOY Education",`,
  `  "name": "新乐牧哲学堂",
  "alternateName": ["牧哲学堂", "MOREJOY Education"],`);

PH('JSON-LD：修复坏 URL（多一个点 + 指向不存在的文件）',
  `"logo": "https://muzhexuetang.xyz./about-images/new-logo.jpg"`,
  `"logo": "https://muzhexuetang.xyz/images/logo.jpg"`);

PH('JSON-LD：补 sameAs 指向抖音官方号',
  `  "telephone": "15930114500"
}`,
  `  "telephone": "15930114500",
  "sameAs": ["https://www.douyin.com/user/MS4wLjABAAAArmoJSReGP-p1WGr1CZpich255GQvTAh7aalAXx_KC2pxQQU26fJmwiw0FccrPT9"]
}`);

PH('导航：锚点 → /about 真实内链（权重传递的关键）',
  `      <a class="link" href="#about">关于我们</a>
      <a class="link" href="#services">服务范围</a>`,
  `      <a class="link" href="/about">关于我们</a>
      <a class="link" href="/about#services">服务范围</a>`);

PH('首页 H1：改成品牌 + 业务（纯文字替换，不动布局）',
  `<h1>关于牧哲学堂</h1>`,
  `<h1>新乐牧哲学堂 · 文化课辅导与升学规划</h1>`);

PH(`统计数字：0 → ${HD.avg}（爬虫视图不再看到「0 分」）`,
  `<div class="ph-num"><span id="statAvg">0</span><span class="ph-unit">分</span></div>`,
  `<div class="ph-num"><span id="statAvg">${HD.avg}</span><span class="ph-unit">分</span></div>`);

PH(`统计数字：0 → ${HD.max}`,
  `<div class="ph-num" style="color:#E8A05A"><span id="statMax">0</span><span class="ph-unit">分</span></div>`,
  `<div class="ph-num" style="color:#E8A05A"><span id="statMax">${HD.max}</span><span class="ph-unit">分</span></div>`);

PH(`统计班型：3 → ${HD.types.length}`,
  `<div class="ph-num" style="color:#E8A05A"><span id="statTypes">3</span><span class="ph-unit">类</span></div>`,
  `<div class="ph-num" style="color:#E8A05A"><span id="statTypes">${HD.types.length}</span><span class="ph-unit">类</span></div>`,
  { required: false });

PH('数字动画：改成「值不同才覆盖」，不闪回 0（动画保留）',
  `  animateNum(document.getElementById("statAvg"), avgGain);
  animateNum(document.getElementById("statMax"), maxGain);`,
  `  // 静态 HTML 已预渲染真实值（22 / 45），仅在数值不同时才覆盖，避免闪回 0
  const statAvgEl = document.getElementById("statAvg");
  const statMaxEl = document.getElementById("statMax");
  if (statAvgEl.textContent !== String(avgGain)) animateNum(statAvgEl, avgGain);
  if (statMaxEl.textContent !== String(maxGain)) animateNum(statMaxEl, maxGain);`);

/* ============================================================
   【已按「不动 UI」要求移除的改动】
   1) 页脚新增导航块            —— 会新增视觉元素
   2) logo 图片路径修改          —— 动到资源（./about-images/new-logo.jpg → /images/logo.jpg）
   3) 首页学员卡静态预渲染 6 条   —— .ph-scroller 高度写死 420px，多出的卡会在 JS 接管前露出
   4) about 学员卡静态预渲染 3 条  —— 同上，动 DOM 结构
   5) about 八类服务胶囊静态化    —— 动 serviceList 结构与列表外观
   保留的改动全部是「文字 / meta / JSON-LD / 链接目标」，不改任何样式、布局、图片、DOM 结构。
   ============================================================ */

/* ============================ about ============================ */
let about0 = read(path.join(PUB, 'about.html'));
let about = about0;
const pa = makePatcher('about', about0);
const PA = (name, from, to, opt) => { about = pa(about, name, from, to, opt); };

PA('标题：22字 → 17字，品牌词前置',
  `<title>关于牧哲学堂｜牧哲学堂机构介绍 - 河北新乐</title>`,
  `<title>新乐牧哲学堂｜机构介绍 - 河北新乐</title>`);

PA('描述：删掉页面上并不存在的「家长评价」',
  `<meta name="description" content="牧哲学堂（MOREJOY Education）2016年成立于河北新乐，提供寒暑假冲刺预备课、一对一冲刺、晚间课业辅导、周末先锋营、中考升学规划、高考志愿咨询、单招文化课辅导、考研公共课辅导等服务。了解牧哲学堂的办学理念、服务范围、教学环境与家长评价。"/>`,
  `<meta name="description" content="新乐牧哲学堂（MOREJOY Education）2016年成立于河北新乐，提供寒暑假冲刺、一对一辅导、晚间课业辅导、周末先锋营、中考升学规划、高考志愿咨询、单招文化课辅导、考研公共课辅导，以及课程安排、考勤记录、课堂反馈与家校沟通服务。"/>`);

PA('关键词：品牌词前置',
  `<meta name="keywords" content="牧哲学堂,新乐牧哲学堂,牧哲学堂教育,新乐辅导机构,新乐文化课辅导,中考志愿填报,高考志愿咨询,单招文化课,考研公共课,家校沟通平台,MOREJOY"/>`,
  `<meta name="keywords" content="新乐牧哲学堂,牧哲学堂,河北新乐文化课辅导,新乐中考升学规划,新乐高考志愿咨询,新乐单招文化课,新乐考研公共课,家校沟通平台,MOREJOY"/>`);

PA('og 标题与描述同步',
  `<meta property="og:title" content="关于牧哲学堂｜牧哲学堂机构介绍 - 河北新乐"/>
<meta property="og:description" content="牧哲学堂（MOREJOY Education）2016年成立于河北新乐，专注文化课辅导与升学规划服务。"/>`,
  `<meta property="og:title" content="新乐牧哲学堂｜机构介绍 - 河北新乐"/>
<meta property="og:description" content="新乐牧哲学堂（MOREJOY Education）2016年成立于河北新乐，专注文化课辅导与升学规划服务。"/>`);

PA('JSON-LD：品牌主名 + 别名数组 + sameAs（本次核心）',
  `  "name": "牧哲学堂",
  "alternateName": "MOREJOY Education",
  "url": "https://muzhexuetang.xyz",
  "logo": "https://muzhexuetang.xyz/images/logo.jpg",
  "image": "https://muzhexuetang.xyz/images/muzhe-brand-banner.png",
  "description": "牧哲学堂机构信息、教学记录与家校沟通服务平台。",
  "foundingDate": "2016",
  "areaServed": { "@type": "City", "name": "新乐市" },
  "address": { "@type": "PostalAddress", "addressRegion": "河北省", "addressLocality": "新乐市" },
  "telephone": "15930114500"`,
  `  "name": "新乐牧哲学堂",
  "alternateName": ["牧哲学堂", "MOREJOY Education"],
  "url": "https://muzhexuetang.xyz",
  "logo": "https://muzhexuetang.xyz/images/logo.jpg",
  "image": "https://muzhexuetang.xyz/images/muzhe-brand-banner.png",
  "description": "新乐牧哲学堂2016年成立于河北新乐，专注文化课辅导与升学规划，提供课程安排、考勤记录、课堂反馈与家校沟通服务。",
  "foundingDate": "2016",
  "areaServed": { "@type": "City", "name": "新乐市" },
  "address": { "@type": "PostalAddress", "addressRegion": "河北省", "addressLocality": "新乐市" },
  "telephone": "15930114500",
  "sameAs": ["https://www.douyin.com/user/MS4wLjABAAAArmoJSReGP-p1WGr1CZpich255GQvTAh7aalAXx_KC2pxQQU26fJmwiw0FccrPT9"]`);

PA('hero 品牌串：正文可见文字里也出现完整品牌词',
  `<p class="hero-tag">MOREJOY EDUCATION · 河北 · 新乐</p>`,
  `<p class="hero-tag">新乐牧哲学堂 · MOREJOY EDUCATION · 河北新乐</p>`);

PA(`统计数字：0人 / +0分 → ${AD.count}人 / +${AD.avg}分`,
  `<div class="p-stat"><div class="v" id="statCount">0<small> 人</small></div><div class="k">进步记录学员</div></div>
      <div class="p-stat"><div class="v" id="statAvg">+0<small> 分</small></div><div class="k">平均提升分数</div></div>`,
  `<div class="p-stat"><div class="v" id="statCount">${AD.count}<small> 人</small></div><div class="k">进步记录学员</div></div>
      <div class="p-stat"><div class="v" id="statAvg">+${AD.avg}<small> 分</small></div><div class="k">平均提升分数</div></div>`);

PA('统计动画：值相同则不覆盖（动画保留，不闪回 0）',
  `  document.getElementById("statCount").innerHTML = DATA.length + "<small> 人</small>";
  document.getElementById("statAvg").innerHTML = "+" + avgGain + "<small> 分</small>";`,
  `  // 静态 HTML 已预渲染真实值（126 / +18），仅在数值不同时才覆盖
  const statCountEl = document.getElementById("statCount");
  const statAvgEl = document.getElementById("statAvg");
  if (statCountEl.textContent !== String(DATA.length)) statCountEl.innerHTML = DATA.length + "<small> 人</small>";
  if (statAvgEl.textContent !== "+" + avgGain) statAvgEl.innerHTML = "+" + avgGain + "<small> 分</small>";`);

/* 【已按「不动 UI」要求移除】
   5) about 学员卡静态预渲染 —— 动 DOM 结构
   6) about 八类服务胶囊静态预渲染 + JS 去重 —— 动 DOM 结构与列表外观
*/

PA('备案号：补上 -1（与首页、与 360 抓取结果一致）',
  `冀ICP备2026028285号</a>`,
  `冀ICP备2026028285号-1</a>`);

/* ============================ 输出 ============================ */
fs.writeFileSync(path.join(OUT, 'home-before.html'), home0, 'utf8');
fs.writeFileSync(path.join(OUT, 'home-after.html'), home, 'utf8');
fs.writeFileSync(path.join(OUT, 'about-before.html'), about0, 'utf8');
fs.writeFileSync(path.join(OUT, 'about-after.html'), about, 'utf8');
fs.writeFileSync(path.join(OUT, '_changes.json'), JSON.stringify(changes), 'utf8');

console.log('=== 生成结果 ===');
console.log('home :', Buffer.byteLength(home0, 'utf8'), '->', Buffer.byteLength(home, 'utf8'), '字节');
console.log('about:', Buffer.byteLength(about0, 'utf8'), '->', Buffer.byteLength(about, 'utf8'), '字节');
console.log('\n=== 改动项 ===');
for (const r of report) console.log(`  [${r.status}] ${r.page.padEnd(5)} ${r.name}`);
const failed = report.filter((r) => r.status.startsWith('✗'));
console.log('\n未匹配项: ' + failed.length);
