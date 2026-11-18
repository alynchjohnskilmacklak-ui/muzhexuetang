const fs = require('fs');
let c = fs.readFileSync('public/home.html', 'utf8');

// 1. 恢复 hero 区域的大字（把 img 换回原来的 i 标签）
c = c.replace(
  '<p class="hero-brand" aria-label="牧哲学堂">\n    <img src="/about-images/logo-banner.jpg" alt="牧哲学堂 MOREJOY" style="max-width:100%;max-height:120px;border-radius:12px;box-shadow:0 8px 24px rgba(178,58,46,.12)">\n  </p>',
  '<p class="hero-brand" aria-label="牧哲学堂">\n    <i>牧</i><i>哲</i><i>学</i><i>堂</i>\n  </p>'
);

// 2. 找导航栏 logo 位置
var navIdx = c.indexOf('nav');
// 找 header 或 nav 里的 logo
var headerIdx = c.indexOf('<header');
if (headerIdx === -1) headerIdx = c.indexOf('<nav');
console.log('Header/nav at:', headerIdx);
console.log(c.substring(headerIdx, headerIdx + 500));

fs.writeFileSync('public/home.html', c, 'utf8');
