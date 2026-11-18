const fs = require('fs');

const content = fs.readFileSync('src/data/parent-practice-bank-backup.ts', 'utf8');
console.log('文件长度:', content.length);

// 测试几种正则
const patterns = [
  /\n  \{\n    id: '[^']+', grade: '[^']+', subject: '([^']+)'/g,
  /id: '[^']+', grade: '[^']+', subject: '([^']+)'/g,
  /subject: '([^']+)'/g,
];

for (const pattern of patterns) {
  const matches = content.match(pattern);
  console.log(`正则 ${pattern.source}: 找到 ${matches ? matches.length : 0} 个匹配`);
  if (matches && matches.length > 0) {
    console.log('  第一个:', matches[0].substring(0, 100));
  }
}
