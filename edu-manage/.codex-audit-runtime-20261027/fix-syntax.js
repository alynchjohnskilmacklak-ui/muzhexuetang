const fs = require('fs');

console.log('正在读取文件...');
let content = fs.readFileSync('src/data/parent-practice-bank.ts', 'utf8');
const lines = content.split('\n');

console.log(`总行数: ${lines.length}`);

let fixedCount = 0;

// 逐行修复
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // 计算单引号数量（排除转义的）
  const quotes = (line.match(/(?<!\\)'/g) || []).length;
  
  if (quotes % 2 !== 0) {
    // 这行有奇数个单引号，说明有字符串没闭合
    // 策略：在行尾的逗号前面补上一个单引号
    // 或者，在最后一个单引号后面补一个
    
    // 先找最后一个单引号的位置
    let lastQuote = line.lastIndexOf("'");
    if (lastQuote > 0) {
      // 在最后一个单引号后面补一个单引号
      line = line.substring(0, lastQuote + 1) + "'" + line.substring(lastQuote + 1);
      lines[i] = line;
      fixedCount++;
    }
  }
}

console.log(`修复了 ${fixedCount} 行`);

// 写回文件
const newContent = lines.join('\n');
fs.writeFileSync('src/data/parent-practice-bank-fixed.ts', newContent, 'utf8');
console.log('已保存到 parent-practice-bank-fixed.ts');
