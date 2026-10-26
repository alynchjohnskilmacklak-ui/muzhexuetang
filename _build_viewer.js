/* 生成自包含的三视图预览器：改动前 / 改动后 / 差异对照 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '_preview');
const changes = JSON.parse(fs.readFileSync(path.join(OUT, '_changes.json'), 'utf8'));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- 行级 LCS diff ---------- */
function lineDiff(aText, bText) {
  const a = aText.split(/\r?\n/), b = bText.split(/\r?\n/);
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push(['=', a[i], j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(['-', a[i], j]); i++; }
    else { ops.push(['+', b[j], j]); j++; }
  }
  while (i < n) ops.push(['-', a[i++], j]);
  while (j < m) ops.push(['+', b[j++], j]);
  return ops;
}

/* ---------- 把 diff 组织成带上下文的 hunk ---------- */
function buildHunks(ops, ctx = 4) {
  const mark = new Array(ops.length).fill(false);
  ops.forEach((o, k) => { if (o[0] !== '=') mark[k] = true; });
  const keep = new Array(ops.length).fill(false);
  ops.forEach((_, k) => {
    if (!mark[k]) return;
    for (let d = -ctx; d <= ctx; d++) { const t = k + d; if (t >= 0 && t < ops.length) keep[t] = true; }
  });
  const hunks = [];
  let cur = null;
  ops.forEach((o, k) => {
    if (keep[k]) {
      if (!cur) { cur = []; hunks.push(cur); }
      cur.push(o);
    } else { cur = null; }
  });
  return hunks;
}

/* ---------- 逐文件处理 ---------- */
function processFile(key, label, hrefBefore, hrefAfter) {
  const before = fs.readFileSync(path.join(OUT, `${key}-before.html`), 'utf8');
  const after = fs.readFileSync(path.join(OUT, `${key}-after.html`), 'utf8');
  const hunks = buildHunks(lineDiff(before, after));

  // 给每个 hunk 起一个 id，并算出「改动后」中第一条新增行的行号，用于 iframe 定位
  const afterLines = after.split(/\r?\n/);
  const hunkMeta = hunks.map((h, idx) => {
    const id = `${key}-h${idx + 1}`;
    const firstPlus = h.find((o) => o[0] === '+');
    return { id, addedCount: h.filter((o) => o[0] === '+').length, removedCount: h.filter((o) => o[0] === '-').length, firstPlusLine: firstPlus ? firstPlus[2] : null };
  });

  const rows = hunks.map((h, idx) => {
    const meta = hunkMeta[idx];
    const body = h.map(([t, text]) => {
      const cls = t === '+' ? 'add' : t === '-' ? 'del' : 'ctx';
      const sign = t === '=' ? ' ' : t;
      return `<div class="dl ${cls}"><span class="sign">${sign}</span><span class="code">${esc(text) || '&nbsp;'}</span></div>`;
    }).join('');
    return `<div class="hunk" id="${meta.id}">
      <div class="hunk-head">第 ${idx + 1} 处 · +${meta.addedCount} 行 / −${meta.removedCount} 行</div>
      <div class="hunk-body">${body}</div>
    </div>`;
  }).join('\n');

  return { key, label, hrefBefore, hrefAfter, hunks: rows, meta: hunkMeta, beforeLen: Buffer.byteLength(before, 'utf8'), afterLen: Buffer.byteLength(after, 'utf8') };
}

const files = [
  processFile('home', '首页 home.html', 'home-before.html', 'home-after.html'),
  processFile('about', '关于页 about.html', 'about-before.html', 'about-after.html'),
];

/* ---------- 改动项清单（人话版） ---------- */
const itemsByPage = {
  home: changes.home.map((c) => ({ name: c.name })),
  about: changes.about.map((c) => ({ name: c.name })),
};

/* ---------- 生成 HTML ---------- */
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>牧哲学堂 · 首页与关于页 SEO 改动预览</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --ink:#1A1201; --ink-soft:#7A6E60; --line:#E8E1D6; --bg:#FBFAF7; --card:#fff;
    --primary:#E8784A; --primary-deep:#C2541F; --green:#1E7A33; --red:#B3261E; --amber:#B06A1F;
  }
  body{font:14px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--bg);height:100vh;display:flex;flex-direction:column;overflow:hidden}
  header.top{padding:12px 20px;background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:16px;flex-wrap:wrap;flex-shrink:0}
  header.top h1{font-size:15px;font-weight:700}
  header.top .meta{font-size:12px;color:var(--ink-soft)}
  .tabs{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap}
  .tabs button{border:1px solid var(--line);background:#fff;color:var(--ink-soft);padding:6px 14px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:600;transition:.15s}
  .tabs button:hover{border-color:var(--primary);color:var(--primary-deep)}
  .tabs button.on{background:var(--primary);border-color:var(--primary);color:#fff}
  .main{flex:1;display:flex;min-height:0}
  aside{width:330px;flex-shrink:0;border-right:1px solid var(--line);background:var(--card);overflow-y:auto;padding:14px}
  aside h2{font-size:12px;letter-spacing:.08em;color:var(--ink-soft);text-transform:uppercase;margin:14px 0 8px}
  aside h2:first-child{margin-top:0}
  .item{padding:9px 11px;border-radius:10px;border:1px solid transparent;cursor:pointer;font-size:13px;line-height:1.5;display:flex;gap:9px;align-items:flex-start;transition:.12s}
  .item:hover{background:#FFF6F0;border-color:#F5D9C8}
  .item.on{background:#FFF1E8;border-color:var(--primary)}
  .item .no{flex-shrink:0;width:19px;height:19px;border-radius:6px;background:#F2ECE3;color:var(--ink-soft);font-size:11px;font-weight:700;display:grid;place-items:center;margin-top:1px}
  .item.on .no{background:var(--primary);color:#fff}
  .stage{flex:1;min-width:0;display:flex;flex-direction:column;background:#EFEAE2}
  .bar{padding:8px 14px;background:var(--card);border-bottom:1px solid var(--line);font-size:12px;color:var(--ink-soft);display:flex;gap:14px;align-items:center;flex-wrap:wrap;flex-shrink:0}
  .bar b{color:var(--ink)}
  iframe{flex:1;width:100%;border:0;background:#fff}
  .diffWrap{flex:1;overflow-y:auto;padding:16px;display:none}
  .hunk{background:var(--card);border:1px solid var(--line);border-radius:12px;margin-bottom:14px;overflow:hidden;scroll-margin-top:12px}
  .hunk.flash{box-shadow:0 0 0 3px rgba(232,120,74,.35)}
  .hunk-head{padding:7px 13px;background:#F7F3EC;border-bottom:1px solid var(--line);font-size:11.5px;color:var(--ink-soft);font-weight:600}
  .hunk-body{font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,"Courier New",monospace}
  .dl{display:flex;gap:10px;padding:1px 13px;white-space:pre-wrap;word-break:break-all}
  .dl.add{background:#E9F6EC}
  .dl.del{background:#FDECEA}
  .dl.ctx{color:#9A9086}
  .sign{flex-shrink:0;width:10px;color:#A79C90;user-select:none}
  .dl.add .sign{color:var(--green);font-weight:700}
  .dl.del .sign{color:var(--red);font-weight:700}
  .dl.add .code{color:#14532D}
  .dl.del .code{color:#7F1D1D;text-decoration:line-through;text-decoration-color:rgba(179,38,30,.35)}
  .note{margin:0 0 14px;padding:11px 14px;background:#FFF8E9;border:1px solid #F0DFB8;border-radius:11px;font-size:12.5px;color:#6B5423;line-height:1.7}
  .note b{color:#4A3A15}
  .stat{font-weight:700;color:var(--ink)}
  .legend{display:flex;gap:14px;font-size:11.5px;color:var(--ink-soft)}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}
  @media(max-width:900px){aside{width:230px}}
</style>
</head>
<body>
<header class="top">
  <h1>牧哲学堂 · 首页 / 关于页 SEO 改动预览</h1>
  <span class="meta">共 <b>${changes.home.length + changes.about.length}</b> 处改动 · 只读预览，线上文件未被修改</span>
  <div class="tabs">
    <button data-tab="before">改动前</button>
    <button data-tab="after" class="on">改动后</button>
    <button data-tab="diff">差异对照</button>
  </div>
</header>

<div class="main">
  <aside>
    <h2>首页 home.html · ${itemsByPage.home.length} 处</h2>
    ${itemsByPage.home.map((it, i) => `<div class="item" data-page="home" data-idx="${i}"><span class="no">${i + 1}</span><span>${esc(it.name)}</span></div>`).join('\n    ')}
    <h2>关于页 about.html · ${itemsByPage.about.length} 处</h2>
    ${itemsByPage.about.map((it, i) => `<div class="item" data-page="about" data-idx="${i}"><span class="no">${i + 1}</span><span>${esc(it.name)}</span></div>`).join('\n    ')}
  </aside>

  <div class="stage">
    <div class="bar">
      <span>当前查看：<b id="curName">首页 home.html · 改动后</b></span>
      <span id="sizeInfo" class="meta"></span>
      <span class="legend"><span><i style="background:#E9F6EC;border:1px solid #BFE3C8"></i>新增</span><span><i style="background:#FDECEA;border:1px solid #F3C9C4"></i>删除</span></span>
    </div>
    <iframe id="frame" src="home-after.html"></iframe>
    <div class="diffWrap" id="diffWrap">
      <div class="note">
        <b>怎么看这份差异：</b>下面按「处」列出所有变动，<span style="color:#14532D;font-weight:700">绿色 = 新增</span>，<span style="color:#7F1D1D;font-weight:700">红色删除线 = 删除</span>。
        左侧点任意一条会跳到对应位置。标注「需你拍板」的项我还没有最终决定。右侧 iframe 里可以直接操作，<b>滚动、轮播、点击切换、数字动画都保持原样</b>。
      </div>
      <div class="note" style="background:#EAF6EC;border-color:#BFE3C8;color:#1E4A22">
        <b>本版已按「不动 UI + 保留动态效果」收窄：</b>只改 <b>文字 / meta / JSON-LD / 链接目标</b>，不改任何样式、布局、图片与 DOM 结构。
        已实测证明：<b>结构指纹（标签+class+id+内联样式）改动前后 0 差异</b>，所有动画元素与动画 JS 数量 0 差异。
        <br>为守这条约束，以下 5 项已从方案中<b>移除</b>：
        ① 页脚新增导航块（会新增视觉元素）
        ② logo 图片路径修正（动资源）
        ③ 首页学员卡静态预渲染 6 条（<code>.ph-scroller</code> 高度写死 420px，多出的卡会在 JS 接管前露出）
        ④ about 学员卡静态预渲染 3 条（同上）
        ⑤ about 八类服务胶囊静态化（动列表结构与外观）
        <br><b>代价要说清楚：</b>撤掉 ③④⑤ 后，<b>爬虫在不执行 JS 时看到的学员数据与服务清单会变少</b>（回到现状）。这次的收益集中在标题、描述、结构化数据、内链与统计数字这五项上。
      </div>
      <div class="note" style="background:#EEF5FB;border-color:#C8DEF0;color:#1E4A6E">
        <b>两个页面换行符不一样（实测）：</b>home.html 是 CRLF，about.html 是 LF。这本身不是错误，但意味着<b>不能对两个文件用同一套替换规则</b>——我第一次生成预览时就因此漏改了 about 的 4 处，已修正。
      </div>
      ${files.map((f) => `<h2 style="font-size:14px;margin:18px 0 10px">${f.label} <span style="font-weight:400;color:var(--ink-soft);font-size:12px">${f.beforeLen} → ${f.afterLen} 字节 · ${f.meta.length} 处变动</span></h2>${f.hunks}`).join('\n')}
    </div>
  </div>
</div>

<script>
const files = ${JSON.stringify(files.map((f) => ({ key: f.key, label: f.label, before: f.hrefBefore, after: f.hrefAfter, beforeLen: f.beforeLen, afterLen: f.afterLen, meta: f.meta })))};
const changes = ${JSON.stringify(changes)};

let tab = 'after';
let page = 'home';
let sel = null;

const frame = document.getElementById('frame');
const diffWrap = document.getElementById('diffWrap');
const curName = document.getElementById('curName');
const sizeInfo = document.getElementById('sizeInfo');

function fileOf(p) { return files.find((f) => f.key === p); }

function render() {
  const f = fileOf(page);
  if (tab === 'diff') {
    frame.style.display = 'none';
    diffWrap.style.display = 'block';
  } else {
    frame.style.display = 'block';
    diffWrap.style.display = 'none';
    frame.src = tab === 'before' ? f.before : f.after;
  }
  curName.textContent = f.label + ' · ' + (tab === 'before' ? '改动前' : tab === 'after' ? '改动后' : '差异对照');
  sizeInfo.textContent = 'HTML 体积 ' + f.beforeLen + ' → ' + f.afterLen + ' 字节';
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
}

document.querySelectorAll('.tabs button').forEach((b) => {
  b.onclick = () => { tab = b.dataset.tab; render(); };
});

document.querySelectorAll('.item').forEach((el) => {
  el.onclick = () => {
    page = el.dataset.page;
    sel = Number(el.dataset.idx);
    document.querySelectorAll('.item').forEach((x) => x.classList.remove('on'));
    el.classList.add('on');
    const f = fileOf(page);
    const hunkId = f.key + '-h' + (sel + 1);
    if (tab === 'diff') {
      const target = document.getElementById(hunkId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('flash');
        setTimeout(() => target.classList.remove('flash'), 1400);
      }
      render();
    } else {
      // 在 iframe 里按文本定位：改动后页面里插入的锚点 span
      tab = 'after';
      frame.src = f.after;
      frame.onload = () => {
        try {
          const a = frame.contentDocument.getElementById('chg-' + page + '-' + sel);
          if (a) {
            a.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const host = a.parentElement;
            if (host) {
              const old = host.style.boxShadow;
              host.style.transition = 'box-shadow .25s';
              host.style.boxShadow = '0 0 0 3px rgba(232,120,74,.55)';
              setTimeout(() => { host.style.boxShadow = old; }, 1600);
            }
          }
        } catch (e) { /* 忽略 */ }
      };
      render();
    }
  };
});

render();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(OUT, '预览.html'), html, 'utf8');
console.log('预览器已生成: _preview/预览.html');
console.log('  内含 ' + files.reduce((s, f) => s + f.meta.length, 0) + ' 个差异块');
console.log('  home : ' + files[0].meta.length + ' 处');
console.log('  about: ' + files[1].meta.length + ' 处');
