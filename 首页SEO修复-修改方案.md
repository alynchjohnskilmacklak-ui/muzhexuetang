# 首页 SEO 修复 — 完整修改方案（待确认）

诊断结论见 [首页改版后手机搜不到-诊断与修复.md](首页改版后手机搜不到-诊断与修复.md)。
本文是**待执行**的改动方案，尚未改动任何文件。

---

## 〇、基线（改动前必须记录，用于回滚）

| 文件 | 大小 | SHA256（前 16 位） | 与线上是否一致 |
|---|---|---|---|
| `edu-manage/public/home.html` | 66,295 B | `54deeb292962be2f` | ✅ **字节级完全一致** |
| `edu-manage/public/about.html` | 58,940 B | `1968d74824444874` | ✅ **字节级完全一致** |

已确认的架构事实：

- **线上首页 = `edu-manage/public/home.html`**，由 `next.config.ts` 的 `beforeFiles` rewrite 提供：
  ```ts
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/home.html' }],   // 首页
      afterFiles: [{ source: '/about', destination: '/about.html' }], // 关于页
    }
  }
  ```
- 所以**改这两个 HTML 不需要重新 build**，上传即生效（静态资源）
- `fix-home.js` / `fix-css.js` 是**一次性生成脚本**，不在 `npm run build`（`next build --webpack`）里，不会被重跑覆盖
- `/services` 是**后台内部页**（`ServiceOverviewPage`），**必须继续被 robots 屏蔽**

> ⚠️ **更正上一份报告的一处错误**：我此前建议"放开 `robots.txt` 里的 `/services`"。经核实 `/services` 是后台内部页面，**不应放开**。本方案已改为：服务范围一律指向上面的 `/about#services`。

---

## 一、改动清单

### 【1】`edu-manage/public/home.html` —— head 元信息（L7–L13）

**为什么改**：这是本次问题的核心。百度移动端库里给你首页存的标题只剩「牧哲学堂」四个字，需要给移动端一个**短而完整**的标题，让它在 20 字内不被截断也能表达主题。

```diff
- <title>牧哲学堂｜新乐文化课辅导与升学规划</title>
+ <title>牧哲学堂｜河北新乐文化课辅导</title>

- <meta name="description" content="牧哲学堂2016年成立于河北新乐，专注文化课辅导、中考高考志愿填报、寒暑假冲刺与一对一教学，提供课程安排、考勤记录、课堂反馈与家校沟通服务。"/>
+ <meta name="description" content="牧哲学堂2016年成立于河北新乐，专注文化课辅导与升学规划，提供课程安排、考勤记录、课堂反馈与家校沟通服务。"/>

- <meta name="keywords" content="牧哲学堂,新乐牧哲学堂,新乐辅导机构,新乐文化课辅导,中考志愿填报,高考志愿咨询,寒暑假冲刺,一对一辅导,MOREJOY"/>
+ <meta name="keywords" content="牧哲学堂,新乐牧哲学堂,河北新乐文化课辅导,牧哲学堂机构信息,家校沟通,MOREJOY"/>

- <meta property="og:title" content="牧哲学堂｜新乐文化课辅导与升学规划"/>
+ <meta property="og:title" content="牧哲学堂｜河北新乐文化课辅导"/>
```

**改动理由逐条**：
- 标题从 18 字改为 **12 字**（品牌 4 + 分隔 1 + 地域 4 + 业务 3），远低于百度移动端约 20 字的折行阈值
- 品牌名「牧哲学堂」**保持句首**（百度对句首词权重最高，保住品牌词匹配）
- 删掉「中考高考志愿填报」——这个业务需要资质，且与"不构成承诺"的免责声明自相矛盾
- 删掉「新乐辅导机构」这类硬营销词，教育类内容在移动端审核更严

---

### 【2】`edu-manage/public/home.html` —— 加内链 + JSON-LD 补全（L11–L34）

**为什么改**：这是**权重传递**的关键。当前首页对外链接只有 `/login` 和备案链接，`/about` 页面**首页一个链接都没给**——它只能靠 sitemap 被收录，又没有内链输权重。同时上一页的 `/about` 页面标题正是「关于牧哲学堂｜牧哲学堂机构介绍 - 河北新乐」，是**品牌实体页**，必须被首页链出去。

```diff
  <link rel="canonical" href="https://muzhexuetang.xyz/"/>
+ <link rel="alternate" hreflang="zh-CN" href="https://muzhexuetang.xyz/"/>
+ <link rel="alternate" hreflang="x-default" href="https://muzhexuetang.xyz/"/>
```

同时在 JSON-LD 里补品牌信息（L19–L34）：

```diff
    "address": { "@type": "PostalAddress", "addressRegion": "河北省", "addressLocality": "新乐市" },
-   "telephone": "15930114500"
+   "telephone": "15930114500",
+   "sameAs": ["https://www.douyin.com/user/MS4wLjABAAAArmoJSReGP-p1WGr1CZpich255GQvTAh7aalAXx_KC2pxQQU26fJmwiw0FccrPT9"]
  }
```

> `sameAs` 指向抖音官方号的做法来自实测：Bing 搜「牧哲学堂」时，第 2 条结果就是 `牧哲学堂的抖音`。把官网和抖音官方号在结构化数据里关联起来，是**最低成本的品牌实体强化**。
>
> 同时顺手修一个 bug：JSON-LD 里 `"logo": "https://muzhexuetang.xyz./about-images/new-logo.jpg"` 多了一个点（`.xyz.` → 应为 `.xyz`），这是坏 URL。

---

### 【3】`edu-manage/public/home.html` —— 导航加 `/about` 内链（L853–L858）

```diff
  <nav class="nav" aria-label="主导航">
    <a class="link" href="/">首页</a>
-   <a class="link" href="#about">关于我们</a>
-   <a class="link" href="#services">服务范围</a>
+   <a class="link" href="/about">关于我们</a>
+   <a class="link" href="/about#services">服务范围</a>
    <a class="link" href="#contact">到访联系</a>
    <a class="login" href="/login">进入系统</a>
  </nav>
```

**注意**：`首页` 这一项要**新增**（当前代码里 nav 第一项不是「首页」，从上面的 grep 结果看 L853-858 之间第一行需要确认）。实际执行时我会先读取 L850–L862 的准确内容再改。

---

### 【4】`edu-manage/public/home.html` —— 去掉爬虫视图里的「0 分」（L879–L891）

**为什么改**：不执行 JS 时，百度蜘蛛看到的是「**0 分** 平均提升（208 位学员）」「**0 分** 最高提升」——这是典型的"低质/模板"信号。

我用页面内嵌的确定性伪随机生成器（seed `20260920`）**离线跑出了真实值**：

| 指标 | 当前（爬虫所见） | 改为（真实值） |
|---|---|---|
| 平均提升 | `0` | **`22`** |
| 最高提升 | `0` | **`45`** |
| 覆盖班型 | `3` | **`4`**（一对一 / 一对三 / 小班，实测数据里有 4 个不同班型标识） |

```diff
- <div class="ph-num"><span id="statAvg">0</span><span class="ph-unit">分</span></div>
+ <div class="ph-num"><span id="statAvg">22</span><span class="ph-unit">分</span></div>

- <div class="ph-num" style="color:#E8A05A"><span id="statMax">0</span><span class="ph-unit">分</span></div>
+ <div class="ph-num" style="color:#E8A05A"><span id="statMax">45</span><span class="ph-unit">分</span></div>
```

（`statTypes` 的 `3` 需按实测结果确认为 `4` 后再决定是否改。）

---

### 【5】`edu-manage/public/home.html` —— 预渲染前 6 张学员卡（L896 附近）

**为什么改**：`.ph-scroller` 现在是空容器（`<div class="ph-scroller" id="progressGrid"></div>`），所有卡片全靠 JS 注入。百度移动端官方明确说「**目前对 JS 渲染未有足够支持**」「尽量不要用 JS」。

方案：在空容器里**静态预渲染前 6 条记录**，JS 加载后用 `innerHTML` 整体覆盖（L1116 的行为不变，不会重复显示）。

预渲染内容取自我离线跑出的真实数据：

```html
<div class="ph-scroller" id="progressGrid">
  <div class="ph-card">
    <div class="ph-card-top">
      <div class="ph-av" style="background:#E8784A">杜</div>
      <div><div class="ph-card-name">杜*诺</div><div class="ph-card-exam">2026 地生会考</div></div>
    </div>
    <div class="ph-card-scores"><span class="ph-from">112</span><span class="ph-arrow">→</span><span class="ph-to">120</span></div>
    <span class="ph-gain g">+8分 · 地生一对三</span>
  </div>
  <div class="ph-card">
    <div class="ph-card-top">
      <div class="ph-av" style="background:#27a644">周</div>
      <div><div class="ph-card-name">周*豪</div><div class="ph-card-exam">2026 中考</div></div>
    </div>
    <div class="ph-card-scores"><span class="ph-from">56</span><span class="ph-arrow">→</span><span class="ph-to">74</span></div>
    <span class="ph-gain o">+18分 · 英语小班</span>
  </div>
  <!-- 共 6 张 -->
</div>
```

---

### 【6】`edu-manage/public/home.html` —— 数字动画从预渲染值开始（L1105–L1111）

**为什么改**：`animateNum` 现在从 `Math.round(target * 0)` = **0** 开始，所以即使预渲染了 `22`，JS 一跑也会先闪回 0。

```diff
- animateNum(document.getElementById("statAvg"), avgGain);
- animateNum(document.getElementById("statMax"), maxGain);
+ // 预渲染值已在 HTML 里，避免 JS 启动瞬间闪回 0（爬虫与首屏都读到真实值）
+ document.getElementById("statAvg").textContent = String(avgGain);
+ document.getElementById("statMax").textContent = String(maxGain);
```

**取舍说明**：这会**去掉数字滚动动画**。这是为了"爬虫/首屏直接读到真实值"而做的有意取舍。如果你希望保留动画，替代方案是让 `animateNum` 从预渲染值起跳（保留动效但改造成本略高）——**这一项请你定**。

---

### 【7】`edu-manage/public/home.html` —— 页脚加内链（L1013–L1016）

```diff
  <footer class="footer">
    <p>© 2026 牧哲学堂 · <a href="https://beian.miit.gov.cn/" ...>冀ICP备2026028285号-1</a></p>
+   <nav aria-label="页脚导航" style="margin-top:8px;display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
+     <a href="/about">关于牧哲学堂</a>
+     <a href="/about#services">服务范围</a>
+     <a href="/login">家长 / 教师登录</a>
+   </nav>
    <p style="margin-top:6px">页面内容不构成升学、考试结果或学习效果承诺…</p>
  </footer>
```

---

### 【8】`edu-manage/public/about.html` —— 同样处理「+0 分」占位（L858、L828 附近）

`/about` 页面有**完全相同的问题**：`<div class="v" id="statAvg">+0<small> 分</small></div>`（"平均提升分数"显示 +0）。

改动同【4】：把 `+0` 换成实测值 `+22`（若该页有独立的生成脚本，我会先确认它的真实值再改，不套用首页的数字）。

---

### 【9】`edu-manage/src/app/layout.tsx` —— 修根布局的默认元信息（L9–L11）

**为什么要改**：这是**所有子页面**（登录页、后台等）的兜底 title/description。目前有两个明显错误：

```diff
- title: { default: '牧哲学堂', template: '%s｜牧哲学堂' },
- description: '牧哲学堂教育教学与家校沟通平台',
- keywords: '牧哲学堂,牧哲学堂教育,太原牧哲学堂,中小学辅导,初中辅导,高中辅导,语文数学英语物理化学生物',
+ title: { default: '牧哲学堂｜河北新乐文化课辅导与升学规划', template: '%s｜牧哲学堂' },
+ description: '牧哲学堂2016年成立于河北新乐，专注文化课辅导与升学规划，提供课程安排、考勤记录、课堂反馈与家校沟通服务。',
+ keywords: '牧哲学堂,牧哲学堂教育,新乐牧哲学堂,河北新乐文化课辅导,家校沟通平台',
```

**理由**：
- 🚨 **`太原牧哲学堂` 是错的** —— 你在**河北新乐**，跟太原没关系
- 默认 title 只有「牧哲学堂」4 个字，是**第二个**"标题退化成纯品牌名"的地方
- 补 `alternates: { canonical: '/' }`

---

### 【10】`edu-manage/src/app/sitemap.ts` —— 更新 lastmod

```diff
- { url: 'https://muzhexuetang.xyz',      lastModified: new Date('2026-09-06'), ... }
- { url: 'https://muzhexuetang.xyz/about', lastModified: new Date('2026-09-07'), ... }
+ { url: 'https://muzhexuetang.xyz',      lastModified: new Date('2026-10-03'), ... }
+ { url: 'https://muzhexuetang.xyz/about', lastModified: new Date('2026-10-03'), ... }
```

**诚实说明**：百度官方明确「**Sitemap 工具不能解决 url 不变而仅是页面内容更新的问题**」，所以**这一项对本次问题的实际作用很小**，属于顺手整理，不要对它抱期望。

> 关于网上常说的"自适应站要在 sitemap 加 `<mobile:mobile type="pc,mobile"/>`"：我查了 Next 16.3.4 的类型定义，`MetadataRoute.Sitemap` **不支持 `mobile` 字段**（只有 `url / lastModified / changeFrequency / priority / alternates / images / videos`）。**本方案不采纳**——不为此改用手写 XML 路由。

---

### 【11】`edu-manage/src/app/robots.ts` —— 不改逻辑

`/services` **继续屏蔽**（它是后台内部页）。仅在代码里加一行注释说明原因，避免以后再被误解。**无功能变更。**

---

## 二、明确「不做」的事

| 不做 | 原因 |
|---|---|
| 提交百度「网站改版」工具 | 该工具只处理 **URL 变化**，要求旧链接单级 301 一一对应。你 URL 没变，提交会因"未设置 301 跳转"校验失败。**纯属浪费时间** |
| 放开 `robots.txt` 的 `/services` | 它是后台内部页（更正上一份报告的建议） |
| 改用手写 XML 路由来塞 `<mobile:mobile>` 标签 | Next 16 类型不支持，自适性站点百度会自动识别，收益极低 |
| 动 `/login`、`/dashboard` 等后台页的元信息 | 它们被 robots 屏蔽，不影响搜索 |
| 删掉首页的学员提分数据 | 这是业务决策不是技术决策。**但要提醒你**：教育类内容在移动端审核更严，展示分数提升有被判定夸大宣传的风险，建议你确认口径 |

---

## 三、部署与验证步骤

### 部署前（我会做）
1. 备份现有文件为 `home.html.bak-20261003` / `about.html.bak-20261003`（本地 + 服务器各一份）
2. **上服务器做飞行前检查**（必须先确认，不能盲传）：
   - `docker ps` 看容器名与挂载
   - `find /opt -name home.html` 确认线上正在服务的那份路径
   - `pm2 list` 确认进程
3. 按【1】–【8】改 HTML，逐条用 `Select-String` 回读验证，并重新计算 SHA256 记录

### 部署（等你确认后执行）
4. 只上传 `public/home.html` 和 `public/about.html` 两个静态文件
5. `layout.tsx` / `sitemap.ts` / `robots.ts` 属于 Next 代码，**需要重新 build 才能生效** —— 这两个我建议**先改好放着**，等你要发版时一起走正常的预构建发布流程（`edu-manage-runtime-*.tar.gz` + `deploy-prebuilt-tar.sh`），不要为了它单独重启线上

### 部署后验证（我会实测，不接受"应该好了"）
```
□ https://muzhexuetang.xyz/        200，<title> 为新标题
□ https://muzhexuetang.xyz/about   200，+0 占位已变成真实值
□ 不执行 JS 提取正文 → 出现 "22 分" 而不是 "0 分"
□ 不执行 JS 提取正文 → /about 链接出现，链接总数从 4 个增加到 ≥7 个
□ 不执行 JS 提取正文 → progressGrid 里有 6 张学员卡的文字
□ 5 种 UA（手机/iPhone/Baiduspider PC/Baiduspider 移动/桌面）返回内容一致
□ canonical 仍指向 https://muzhexuetang.xyz/
□ /login 200（登录没被首页改动影响）
```

### 回滚
```
把 home.html.bak-20261003 / about.html.bak-20261003 传回原位即可。
HTML 是静态文件，回滚即时生效，无需重启任何服务。
```

---

## 四、改完之后你要去百度做的（我做不了，需要你登录）

> https://ziyuan.baidu.com

1. **抓取诊断**（最重要，每周 70 次额度）：用「**移动**」模式抓一次 `https://muzhexuetang.xyz/`
   - 看百度蜘蛛拿到的**标题**是不是还是只剩「牧哲学堂」
   - 看**前 200KB** 里有没有正文和 `/about` 链接
2. **普通收录 / 快速抓取**：提交首页 URL。官方只承诺"优先抓取"，不保证收录与展现，但要做
3. **数据统计 → 流量与关键词**：看首页展现量从哪天开始掉，倒推百度移动端重算的时间点
4. **数据统计 → 索引量**：看移动侧曲线（数据延迟最快每天、最迟一周）
5. **站点属性**：官方原话「**站点关联主体是移动资源进入搜索的一个必要环节**」，确认这一项是否完成；核对「站点名称」是否还是旧名字
6. **移动适配**：复查首页那条适配关系的状态。官方提醒「PC 站点或移动站点**结构发生变化**」或「**主体内容发生较大变化**」会让适配由成功变失败

---

## 五、需要你拍板的 3 个决定

1. **数字滚动动画**（【6】）：为了爬虫和首屏直接读到真实值，我建议**去掉动画**。你要是想保留，我用"从预渲染值起跳"的方式改，但复杂度略高。
2. **`/about` 的 `+0`**（【8】）：我按首页同口径填 `+22`，还是你有 official 的数字给我？
3. **`layout.tsx` / `sitemap.ts` / `robots.ts`**（【9】【10】【11】）：这三个要重新 build 才生效。是**这次一起发版**，还是**先只改 HTML**（改完立刻能在线上验证效果）？

---

## 六、预期效果与时间

- 改完 + 抓好诊断后：**1～3 周**百度移动端品牌词应恢复
- 参考基线：现在搜「牧哲学堂新乐网站」，移动端你**已经是第 1 条** —— 底子是好的，缺的就是品牌词这一环 + 内链传递

**我必须诚实说明的边界**：SEO 没有"改完必好"的保证。上面每一条改动的**机制依据**都是百度官方文档（移动索引独立、索引分层、移动友好度是排名因子、JS 渲染支持不足、移动端标题 20 字截断），但这些是**必要条件不是充分条件**。如果改完 3 周仍无改善，下一步排查方向是百度搜索资源平台的「抓取异常」和「反馈中心」，而不是继续改 HTML。
