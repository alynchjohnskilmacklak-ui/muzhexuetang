const fs = require('fs');
const a = fs.readFileSync('edu-manage/public/about.html','utf8');
const i = a.indexOf('item.className = "service-item"');
console.log(JSON.stringify(a.substring(i-80, i+700)));
console.log();
// 8 个服务的 name/sub 列表
const svc = [...a.matchAll(/id:"(\d\d)", name:"([^"]+)", sub:"([^"]+)"/g)];
console.log('=== 八类服务（name / sub）===');
svc.forEach(s => console.log(`  ${s[1]}  ${s[2]}  |  ${s[3]}`));
