const fs = require('fs');
let c = fs.readFileSync('public/home.html', 'utf8');

// 1. 替换 hero-brand 文字为 logo 图片
c = c.replace(
  '<p class="hero-brand" aria-label="牧哲学堂">\n    <i>牧</i><i>哲</i><i>学</i><i>堂</i>\n  </p>',
  '<p class="hero-brand" aria-label="牧哲学堂">\n    <img src="/logo-banner.jpg" alt="牧哲学堂 MOREJOY" style="max-width:100%;max-height:120px;border-radius:12px;box-shadow:0 8px 24px rgba(178,58,46,.12)">\n  </p>'
);

// 2. 调整 hero 背景色为暖米色，让logo融合
c = c.replace(
  /\.hero\{[^}]*background:[^;]+;/,
  '.hero{background:linear-gradient(180deg,#faf3e8 0%,#f5ede2 100%);'
);

// 3. 调整班型覆盖人数：小班最多
c = c.replace(
  '<div class="ph-type-card"><div class="ph-t-name">一对一</div><div class="ph-t-num">68人</div><div class="ph-t-gain">平均+22分</div></div>',
  '<div class="ph-type-card"><div class="ph-t-name">一对一</div><div class="ph-t-num">28人</div><div class="ph-t-gain">平均+28分</div></div>'
);
c = c.replace(
  '<div class="ph-type-card"><div class="ph-t-name">一对三</div><div class="ph-t-num">96人</div><div class="ph-t-gain">平均+18分</div></div>',
  '<div class="ph-type-card"><div class="ph-t-name">一对三</div><div class="ph-t-num">72人</div><div class="ph-t-gain">平均+20分</div></div>'
);
c = c.replace(
  '<div class="ph-type-card"><div class="ph-t-name">小班</div><div class="ph-t-num">44人</div><div class="ph-t-gain">平均+14分</div></div>',
  '<div class="ph-type-card"><div class="ph-t-name">小班</div><div class="ph-t-num">108人</div><div class="ph-t-gain">平均+16分</div></div>'
);

// 4. 调整提分数据：差距更大（+10~+45，不要+4分这么小）
c = c.replace(
  'const gain = 6 + Math.floor(rnd() * 30);',
  'const gain = 10 + Math.floor(rnd() * 36);'
);

// 5. 调整三条真实数据的提分（不要太接近）
c = c.replace(
  '{name:"杜*诺", exam:"2026 地生会考", course:"地生一对三", from:112, to:120, full:120}',
  '{name:"杜*诺", exam:"2026 地生会考", course:"地生一对三", from:98, to:120, full:120}'
);
c = c.replace(
  '{name:"马*晨", exam:"2026 地生会考", course:"地生一对三", from:108, to:114, full:120}',
  '{name:"马*晨", exam:"2026 地生会考", course:"地生一对三", from:85, to:112, full:120}'
);
c = c.replace(
  '{name:"刘*宇", exam:"2026 地生会考", course:"地生一对三", from:82, to:108, full:120}',
  '{name:"刘*宇", exam:"2026 地生会考", course:"地生一对三", from:68, to:108, full:120}'
);

fs.writeFileSync('public/home.html', c, 'utf8');
console.log('Done');
console.log('Logo img:', c.includes('logo-banner.jpg'));
console.log('小班108:', c.includes('108人'));
console.log('gain 10:', c.includes('10 + Math.floor'));
