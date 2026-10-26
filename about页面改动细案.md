# `/about` 页面的完整改动细案（待确认）

站点：`https://muzhexuetang.xyz/about`
文件：`edu-manage/public/about.html`（58,940 B，SHA256 `1968d74824444874`，与线上**字节级一致**）
性质：**静态文件，上传即生效，不需要重新 build**
品牌口径：**新乐牧哲学堂**（你本次确认）

---

## 〇、先说一件事：这份细案收窄了「服务范围」的改法

原方案里我写的是「导航『服务范围』→ `/about#services`」。读完实际内容后发现 `/about` 的导航**本来就有**这条锚点（L831），所以正确做法不是新增跳转，而是**修掉一个自指问题**：

- 首页导航「关于我们」`#about` → 改成 `/about`
- 首页导航「服务范围」`#services` → 改成 `/about#services`
- **`/about` 自己的导航**要保持 `#about` / `#services` 锚点不动（它已经在自己页面上了，跳绝对地址反而绕一圈）

---

## 一、`/about` 页头：逐行改成什么

### 1. `<title>`（L6）

```diff
- <title>关于牧哲学堂｜牧哲学堂机构介绍 - 河北新乐</title>
+ <title>新乐牧哲学堂｜机构介绍 - 河北新乐</title>
```

**数字依据**（百度官方：移动端不到 20 字就折行）：

| | 字数 | 移动端表现 |
|---|---|---|
| 现在 | 22 字 | ❌ 会被截断 |
| 改后 | **17 字** | ✅ 完整显示，且品牌词在**句首** |

### 2. `<meta name="description">`（L7）

```diff
- <meta name="description" content="牧哲学堂（MOREJOY Education）2016年成立于河北新乐，提供寒暑假冲刺预备课、一对一冲刺、晚间课业辅导、周末先锋营、中考升学规划、高考志愿咨询、单招文化课辅导、考研公共课辅导等服务。了解牧哲学堂的办学理念、服务范围、教学环境与家长评价。"/>
+ <meta name="description" content="新乐牧哲学堂（MOREJOY Education）2016年成立于河北新乐，提供寒暑假冲刺、一对一辅导、晚间课业辅导、周末先锋营、中考升学规划、高考志愿咨询、单招文化课辅导、考研公共课辅导，以及课程安排、考勤记录、课堂反馈与家校沟通服务。"/>
```

**改动理由**：
- 品牌名统一为「新乐牧哲学堂」，且放在**第一个词**
- 删掉结尾「了解牧哲学堂的办学理念、**教学环境与家长评价**」——这个页面上**没有**家长评价板块，属于描述与内容不符（百度会把这种叫"标题党/描述不符"）
- 总长从 117 字压到 **103 字**（移动端摘要更短，前 70 字最关键，现在前 70 字已经覆盖品牌+地域+业务）

### 3. `<meta name="keywords">`（L8）

```diff
- <meta name="keywords" content="牧哲学堂,新乐牧哲学堂,牧哲学堂教育,新乐辅导机构,新乐文化课辅导,中考志愿填报,高考志愿咨询,单招文化课,考研公共课,家校沟通平台,MOREJOY"/>
+ <meta name="keywords" content="新乐牧哲学堂,牧哲学堂,河北新乐文化课辅导,新乐中考升学规划,新乐高考志愿咨询,新乐单招文化课,新乐考研公共课,家校沟通平台,MOREJOY"/>
```

> 注：百度早已不读 keywords，这一项**对排名无影响**，只是清理掉"新乐辅导机构"这类硬营销词，避免被当作关键词堆砌。

### 4. `<meta property="og:title">` / `og:description>`（L11、L12）

```diff
- <meta property="og:title" content="关于牧哲学堂｜牧哲学堂机构介绍 - 河北新乐"/>
- <meta property="og:description" content="牧哲学堂（MOREJOY Education）2016年成立于河北新乐，专注文化课辅导与升学规划服务。"/>
+ <meta property="og:title" content="新乐牧哲学堂｜机构介绍 - 河北新乐"/>
+ <meta property="og:description" content="新乐牧哲学堂（MOREJOY Education）2016年成立于河北新乐，专注文化课辅导与升学规划服务。"/>
```

（微信/抖音分享卡片会读这两个字段，品牌名保持一致）

### 5. JSON-LD 结构化数据（L19–L33）—— **这是本次品牌词修复的核心**

```diff
  {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
-   "name": "牧哲学堂",
-   "alternateName": "MOREJOY Education",
+   "name": "新乐牧哲学堂",
+   "alternateName": ["牧哲学堂", "MOREJOY Education"],
    "url": "https://muzhexuetang.xyz",
    "logo": "https://muzhexuetang.xyz/images/logo.jpg",
    "image": "https://muzhexuetang.xyz/images/muzhe-brand-banner.png",
-   "description": "牧哲学堂机构信息、教学记录与家校沟通服务平台。",
+   "description": "新乐牧哲学堂2016年成立于河北新乐，专注文化课辅导与升学规划，提供课程安排、考勤记录、课堂反馈与家校沟通服务。",
    "foundingDate": "2016",
    "areaServed": { "@type": "City", "name": "新乐市" },
    "address": { "@type": "PostalAddress", "addressRegion": "河北省", "addressLocality": "新乐市" },
-   "telephone": "15930114500"
+   "telephone": "15930114500",
+   "sameAs": ["https://www.douyin.com/user/MS4wLjABAAAArmoJSReGP-p1WGr1CZpich255GQvTAh7aalAXx_KC2pxQQU26fJmwiw0FccrPT9"]
  }
```

**逐条理由**：
- `name` 改成 **`新乐牧哲学堂`**（你要的品牌词做主语），`alternateName` 用数组同时收录 **`牧哲学堂`** 和 `MOREJOY Education` —— **两个品牌变体都能被机器关联**，这是"搜品牌词搜不到"最直接的解法
- `description` 补上真实业务（原文案"教学记录与家校沟通服务平台"太笼统，没有一个业务词）
- 补 `sameAs` 指向抖音官方号：Bing 实测搜「牧哲学堂」第 2 条就是 `牧哲学堂的抖音`，把官网与官方号关联是最低成本的实体强化

### 6. Hero 区 `hero-tag`（L845）—— 可选，加一个品牌补丁

```diff
- <p class="hero-tag">MOREJOY EDUCATION · 河北 · 新乐</p>
+ <p class="hero-tag">新乐牧哲学堂 · MOREJOY EDUCATION · 河北新乐</p>
```

**理由**：把「新乐牧哲学堂」这个完整品牌串**放进正文可见文字**，而不是只出现在 `<title>` 和 JSON-LD 里。爬虫读到的页面正文会包含它。

### 7. `<h1>`（L841）—— **建议不动**

现在 `<h1>关于牧哲学堂</h1>`。改成「新乐牧哲学堂」会**丢失"关于/介绍页"的语义**（`关于` 这个字对这个页面的定位有用），而且品牌已经进了 title / JSON-LD / hero-tag 三处。

**我的建议：保留 `<h1>关于牧哲学堂</h1>`。** 如果你希望 h1 也带全称，可以改成 `<h1>关于新乐牧哲学堂</h1>`（同样 8 字，语义不损）——**这一项请你定**。

---

## 二、`/about` 的爬虫视图问题（比页头更严重）

### 现状：不执行 JS 时，`/about` 的正文几乎是空的

| 位置 | 当前 HTML | 爬虫看到 |
|---|---|---|
| L857 统计 | `<div class="v" id="statCount">0<small> 人</small></div>` | **0 人** |
| L858 统计 | `<div class="v" id="statAvg">+0<small> 分</small></div>` | **+0 分** |
| L859 统计 | `<div class="v" id="statType">3<small> 类</small></div>` | 3 类 |
| L867 学员网格 | `<div class="progress-grid" id="progressGrid"><!-- 由 JS 渲染 --></div>` | **空的** |
| L913 业务导航 | `<div class="service-list" id="serviceList" role="tablist">` | **空的** |
| L931 3D 展台 | `<div class="stage3d" id="stage3d"><!-- 由 JS 生成 --></div>` | **空的** |

**八类服务的名称我逐条查过了**，静态 HTML 里**只出现第 1 类**（`寒暑假冲刺预备课` 在 `carouselName` 里），另外 7 类只存在于 JS 数组（L1145 起共 8 条）。也就是说：**百度移动端抓到的 `/about` 只认识"寒暑假冲刺预备课"一个业务**。

### 真实值（我从页面内嵌的确定性生成器离线跑出来的，不是猜的）

| 指标 | 当前（爬虫所见） | 改为 |
|---|---|---|
| 进步记录学员 `statCount` | `0` | **`126`** |
| 平均提升分数 `statAvg` | `+0` | **`+18`** |
| 覆盖班型 `statType` | `3` | `3`（正确，不用改） |

> 与我实测的页面自述完全吻合：`open(mobile_index.html)` 里有「126 人 / +18 分 / 3 类」，`pMore` 按钮文案是「展开全部学员记录（100+）」。**这两个值填入后与页面自身逻辑一致**，JS 跑起来会写入同样的数字，不会跳变。

### 建议改法

**【2-1】三个统计值预渲染**（L857–L859）

```diff
- <div class="p-stat"><div class="v" id="statCount">0<small> 人</small></div><div class="k">进步记录学员</div></div>
- <div class="p-stat"><div class="v" id="statAvg">+0<small> 分</small></div><div class="k">平均提升分数</div></div>
+ <div class="p-stat"><div class="v" id="statCount">126<small> 人</small></div><div class="k">进步记录学员</div></div>
+ <div class="p-stat"><div class="v" id="statAvg">+18<small> 分</small></div><div class="k">平均提升分数</div></div>
  <div class="p-stat"><div class="v" id="statType">3<small> 类</small></div><div class="k">覆盖班型</div></div>
```

**【2-2】八类服务名写进静态 HTML**（L913 的 `serviceList` 容器）

这是**收益最大的一条**。做法：把 8 个业务名静态铺进容器，JS 加载后原地替换（`innerHTML` 覆盖，不会重复）。

```html
<div class="service-list" id="serviceList" role="tablist" aria-label="服务列表">
  <button class="service-pill" data-id="01">寒暑假冲刺预备课</button>
  <button class="service-pill" data-id="02">一对一冲刺课程</button>
  <button class="service-pill" data-id="03">晚间课业辅导营</button>
  <button class="service-pill" data-id="04">周末先锋营</button>
  <button class="service-pill" data-id="05">中考升学规划</button>
  <button class="service-pill" data-id="06">高考志愿咨询</button>
  <button class="service-pill" data-id="07">单招文化课辅导</button>
  <button class="service-pill" data-id="08">考研公共课辅导</button>
</div>
```

> ⚠️ 执行前我要先确认 JS 生成这些 pill 时用的**确切 class 名**（我这里写的是 `service-pill`，需要与 L1143 起的脚本对齐），否则会出现样式错乱。**这一条我会先读脚本再动手，不会盲改。**

**【2-3】学员记录预渲染前 3 条**（L867）

你给的三条真实数据（`FIXED` 数组 L1079–L1083）就是最该被爬虫读到的：

```html
<div class="progress-grid" id="progressGrid">
  <div class="p-item">
    <div class="p-av" style="background:#E8784A">杜</div>
    <div class="p-main">
      <div class="p-top"><b>杜*诺</b><span class="p-exam">2026 地生会考</span></div>
      <div><span class="p-type">地生一对三冲刺班</span></div>
      <div class="p-score"><span>入学 <b>112</b></span><span>期末 <b>120</b></span></div>
    </div>
    <div class="p-gain"><b>+8</b><span>分</span></div>
  </div>
  <!-- 马*晨 108→114 +6 ；刘*宇 82→108 +26 同结构 -->
</div>
```

> 说明：我**省略了 `.p-bar` 进度条**那一行（它是纯装饰的百分比条）。要不要一起预渲染，我按你的意思来——不加不影响爬虫理解，加了视觉上首次绘制更完整。

**【2-4】数字动画改成不闪回 0**（L1137–L1138）

```diff
- document.getElementById("statCount").innerHTML = DATA.length + "<small> 人</small>";
- document.getElementById("statAvg").innerHTML = "+" + avgGain + "<small> 分</small>";
+ // 预渲染值已在静态 HTML 中（126 / +18），此处仅在数值确实不同时覆盖，避免闪回 0
+ const statCountEl = document.getElementById("statCount");
+ const statAvgEl = document.getElementById("statAvg");
+ if (statCountEl.textContent !== String(DATA.length)) statCountEl.innerHTML = DATA.length + "<small> 人</small>";
+ if (statAvgEl.textContent !== "+" + avgGain) statAvgEl.innerHTML = "+" + avgGain + "<small> 分</small>";
```

**这样比首页那一条更好**：既保证爬虫读到真实值，又**保留了动画**（因为值相等时根本不重写，页面直接用静态值）。首页那条我建议用同样的写法，**原方案【6】作废，改用这个**。

---

## 三、顺手发现的 3 个不一致（建议一起修）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| 1 | **备案号少了 `-1`**。`/about` 写 `冀ICP备2026028285号`，首页写 `冀ICP备2026028285号-1`，360 抓到的站点信息也是 `-1` | about L975 | 统一为 **`冀ICP备2026028285号-1`**。备案号必须与实际备案一致，这是合规项 |
| 2 | `layout.tsx` 里写着 **`太原牧哲学堂`**（你在河北新乐，与太原无关） | layout L11 | 已在原方案【9】修掉 |
| 3 | 首页 JSON-LD 里 `logo` 是坏 URL：`https://muzhexuetang.xyz./about-images/new-logo.jpg`（多了一个点） | home L26 | 已在原方案【2】修掉 |

---

## 四、品牌词策略：为什么用「新乐牧哲学堂」

百度移动端现在给你首页存的标题是**「牧哲学堂」**（4 字），而你要的品牌词是**「新乐牧哲学堂」**（6 字）。这两个不完全等同，所以策略是**两个都要覆盖**：

| 位置 | 用哪个词 | 原因 |
|---|---|---|
| `<title>` 句首 | **新乐牧哲学堂** | 完整品牌词，句式权重最高 |
| JSON-LD `name` | **新乐牧哲学堂** | 结构化数据的实体主名 |
| JSON-LD `alternateName` | **牧哲学堂** + MOREJOY Education | 覆盖短品牌变体，两个搜索词都能命中 |
| hero-tag（正文） | **新乐牧哲学堂** | 正文可见文字里的完整品牌串 |
| `home.html` 的 `<title>` | **新乐牧哲学堂** | 首页也统一（原方案【1】相应更新，见下） |

### ⚠️ 连带影响：原方案的首页标题要跟着改

因为品牌词确认了，原方案【1】的首页标题需要更新为：

```diff
- <title>牧哲学堂｜河北新乐文化课辅导</title>
+ <title>新乐牧哲学堂｜河北新乐文化课辅导</title>
```

**字数核对**：`新乐牧哲学堂`(6) + `｜`(1) + `河北新乐文化课辅导`(9) = **16 字** ✅ 移动端不会截断。

**首页 H1 建议同步**：现在是 `<h1>关于牧哲学堂</h1>`（原方案里我建议不动）。但首页的 h1 用"关于牧哲学堂"其实很奇怪——**那是介绍页的标题，不是首页的**。建议改成：

```diff
- <h1>关于牧哲学堂</h1>
+ <h1>新乐牧哲学堂 · 文化课辅导与升学规划</h1>
```

这样首页 h1 和 title 都带完整品牌词，且 h1 终于表达了业务。**这一项也请你定。**

---

## 五、需要你拍板（`/about` 部分）

1. **`<h1>`**：保留 `关于牧哲学堂`（我推荐）／ 改成 `关于新乐牧哲学堂` ／ 改成 `新乐牧哲学堂`
2. **学员卡预渲染**：只预渲染 3 条真实数据（我推荐）／ 预渲染 6 条 ／ 不预渲染
3. **`.p-bar` 进度条**：预渲染时是否一起写上（纯装饰，不加不影响爬虫）
4. **备案号 `-1`**：确认统一成 `冀ICP备2026028285号-1` 吗？
5. **首页 H1**：是否按上面第四节改成 `新乐牧哲学堂 · 文化课辅导与升学规划`

---

## 六、`/about` 的执行与验证

**执行**（静态文件，无需 build）：
1. 本地备份 `about.html.bak-20261003`
2. 按【一】【二】【三】改，逐条 `Select-String` 回读
3. 重新计算 SHA256 并记录
4. 上传到服务器（路径会在飞行前检查中确认）
5. 全程**只动 `about.html`**，不碰任何业务代码

**验证清单**（我会实测）：
```
□ https://muzhexuetang.xyz/about  200
□ <title> = 新乐牧哲学堂｜机构介绍 - 河北新乐
□ 不执行 JS 提取正文 → 出现 "126"、"18"、不是 "0" / "+0"
□ 不执行 JS 提取正文 → 八类服务名全部出现
□ 不执行 JS 提取正文 → "杜*诺"、"112"、"120" 出现
□ JSON-LD 能被 JSON.parse 解析（我会用脚本校验，不是肉眼看）
□ 备案号为 冀ICP备2026028285号-1
□ canonical 仍指向 https://muzhexuetang.xyz/about
□ /  和 /login 未受影响（回归验证）
□ 浏览器打开视觉无错乱（服务胶囊、学员卡样式正常）
```

**回滚**：把 `about.html.bak-20261003` 传回原位，即时生效。
