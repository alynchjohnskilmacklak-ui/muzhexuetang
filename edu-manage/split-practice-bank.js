const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const inputFile = path.join(rootDir, 'src/data/parent-practice-bank-backup.ts');
const outputDir = path.join(rootDir, 'src/data/practice-sets');

console.log('正在读取原文件...');
const content = fs.readFileSync(inputFile, 'utf8');
console.log(`文件大小: ${(content.length / 1024 / 1024).toFixed(2)} MB`);

// 匹配每个小节的开始位置
// 只有顶级小节才有 grade 和 subject
// 模式：id: 'xxx-xxx-xxx', grade: 'xxx', subject: 'xxx',
const sectionStartPattern = /id: '([^']+)', grade: '[^']+', subject: '[^']+'/g;

const matches = [];
let match;
while ((match = sectionStartPattern.exec(content)) !== null) {
  const id = match[1];
  
  // 从id提取学科前缀
  const idParts = id.split('-');
  let idPrefix;
  if (idParts[0] === 'g') {
    // g开头的id，第二段才是真正的学科
    idPrefix = idParts[1];
  } else {
    idPrefix = idParts[0];
  }
  
  // 往前找，找到这个小节的开始 {
  let start = match.index;
  while (start > 0 && content[start] !== '{') {
    start--;
  }
  // start 现在指向 {，保留它，不要++
  
  matches.push({
    subjectPrefix: idPrefix,
    start: start,
  });
}

console.log(`找到 ${matches.length} 个小节`);

// 学科前缀到文件名和变量名的映射（包含所有别名）
const subjectMap = {
  // 数学
  'math': { filename: 'math-questions.ts', varName: 'mathQuestions' },
  'g': { filename: 'math-questions.ts', varName: 'mathQuestions' },
  // 语文
  'chinese': { filename: 'chinese-questions.ts', varName: 'chineseQuestions' },
  'chi': { filename: 'chinese-questions.ts', varName: 'chineseQuestions' },
  // 英语
  'english': { filename: 'english-questions.ts', varName: 'englishQuestions' },
  'eng': { filename: 'english-questions.ts', varName: 'englishQuestions' },
  // 物理
  'physics': { filename: 'physics-questions.ts', varName: 'physicsQuestions' },
  'phy': { filename: 'physics-questions.ts', varName: 'physicsQuestions' },
  'phys': { filename: 'physics-questions.ts', varName: 'physicsQuestions' },
  // 化学
  'chemistry': { filename: 'chemistry-questions.ts', varName: 'chemistryQuestions' },
  'chem': { filename: 'chemistry-questions.ts', varName: 'chemistryQuestions' },
  'che': { filename: 'chemistry-questions.ts', varName: 'chemistryQuestions' },
  // 历史
  'history': { filename: 'history-questions.ts', varName: 'historyQuestions' },
  'his': { filename: 'history-questions.ts', varName: 'historyQuestions' },
  'hist': { filename: 'history-questions.ts', varName: 'historyQuestions' },
  // 地理
  'geography': { filename: 'geography-questions.ts', varName: 'geographyQuestions' },
  'geo': { filename: 'geography-questions.ts', varName: 'geographyQuestions' },
  // 生物
  'biology': { filename: 'biology-questions.ts', varName: 'biologyQuestions' },
  'bio': { filename: 'biology-questions.ts', varName: 'biologyQuestions' },
  // 政治
  'politics': { filename: 'politics-questions.ts', varName: 'politicsQuestions' },
  'pol': { filename: 'politics-questions.ts', varName: 'politicsQuestions' },
};

// 按学科前缀分组（先映射到统一学科）
const subjectData = {};
for (let i = 0; i < matches.length; i++) {
  const { subjectPrefix, start } = matches[i];
  const end = i + 1 < matches.length ? matches[i + 1].start : content.length;
  
  // 映射到统一学科key
  const map = subjectMap[subjectPrefix];
  if (!map) {
    console.log(`⚠️  未知前缀: ${subjectPrefix}，跳过`);
    continue;
  }
  const unifiedKey = map.filename; // 用文件名作为统一key
  
  if (!subjectData[unifiedKey]) {
    subjectData[unifiedKey] = [];
  }
  subjectData[unifiedKey].push(content.slice(start, end));
}

console.log('\n=== 各学科统计 ===');
for (const [subject, items] of Object.entries(subjectData)) {
  const totalSize = items.reduce((sum, item) => sum + item.length, 0);
  console.log(`${subject}: ${items.length} 节, ${(totalSize / 1024).toFixed(1)} KB`);
}

// 创建输出目录
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 清理旧文件
console.log('\n=== 清理旧文件 ===');
for (const f of fs.readdirSync(outputDir)) {
  fs.unlinkSync(path.join(outputDir, f));
  console.log(`删除: ${f}`);
}

// 写入每个学科的文件
console.log('\n=== 正在写入拆分文件 ===');
for (const [filename, items] of Object.entries(subjectData)) {
  const filePath = path.join(outputDir, filename);
  
  // 从文件名推断变量名
  const varName = filename.replace('-questions.ts', '') + 'Questions';
  
  let fileContent = `// 题库\n`;
  fileContent += `export const ${varName} = [\n`;
  fileContent += items.join('');
  fileContent += `];\n`;
  
  fs.writeFileSync(filePath, fileContent, 'utf8');
  const size = fs.statSync(filePath).size / 1024;
  console.log(`写入 ${filename}: ${size.toFixed(1)} KB (${items.length} 节)`);
}

console.log('\n✅ 拆分完成！');
