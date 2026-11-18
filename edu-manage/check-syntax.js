const fs = require('fs');

const content = fs.readFileSync('src/data/parent-practice-bank.ts', 'utf8');
const lines = content.split('\n');

console.log(`总行数: ${lines.length}`);

// 找出所有可能的未闭合字符串
// 简单检测：每行的单引号数量应该是偶数
let errors = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // 计算单引号数量（排除转义的）
  const quotes = (line.match(/(?<!\\)'/g) || []).length;
  if (quotes % 2 !== 0) {
    errors.push({ line: i + 1, text: line.trim().substring(0, 80), quotes });
  }
}

console.log(`\n可能有 ${errors.length} 行未闭合字符串:`);
errors.slice(0, 20).forEach(e => {
  console.log(`  第${e.line}行: ${e.text}... (${e.quotes}个单引号)`);
});
