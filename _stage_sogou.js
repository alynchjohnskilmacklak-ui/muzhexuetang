/* 字节安全：把搜狗验证文件写到本地 public */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = 'C:\\Users\\Administrator\\.dsh\\attachments\\v1\\files\\02\\0270cd776b513b7f3f2f2dc0b7d0941b39fe67e3319a66bf6b437cc0f626b4e3\\sogousiteverification.txt';
const NAME = 'sogousiteverification.txt';
const LOCAL = path.join(__dirname, 'edu-manage', 'public', NAME);

const raw = fs.readFileSync(SRC);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
console.log('=== 源文件 ===');
console.log(`  字节数: ${raw.length}`);
console.log(`  sha256: ${sha(raw).slice(0, 16)}`);
console.log(`  尾部字节: ${[...raw.slice(-3)].map((b) => b.toString(16).padStart(2, '0')).join(' ')}`);
console.log(`  以换行结尾: ${raw[raw.length - 1] === 0x0a ? '是' : '否'}`);
console.log(`  内容: ${JSON.stringify(raw.toString('utf8'))}`);

if (fs.existsSync(LOCAL)) fs.writeFileSync(LOCAL + '.bak', fs.readFileSync(LOCAL));
fs.writeFileSync(LOCAL, raw);
const check = fs.readFileSync(LOCAL);
console.log(`\n  已写入 ${LOCAL}`);
console.log(`  ${check.length} B  sha=${sha(check).slice(0, 16)}  字节一致: ${sha(check) === sha(raw) ? '✓' : '✗'}`);
