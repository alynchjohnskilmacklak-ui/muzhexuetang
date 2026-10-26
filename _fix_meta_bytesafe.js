/* 二进制安全地只改 meta 一行：以 67044 版本为基准，保持 CRLF 不变 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '_preview', '_home_67044.html');   // 线上正确的 67044 版本
const OUT  = path.join(__dirname, '_preview', 'home-after.html');
const SRC  = path.join(__dirname, 'edu-manage', 'public', 'home.html');

const OLD_CODE = '3f17ed1785b9a82fd4176b64ecffb169_1791013602';
const NEW_CODE = '3f17ed1785b9a82fd4176b64ecffb169_1791014088';

// 1. 以二进制读入基准
const buf = fs.readFileSync(BASE);
console.log(`基准文件: ${buf.length} B`);
const crlfBefore = (buf.toString('utf8').match(/\r\n/g) || []).length;
console.log(`  CRLF 数: ${crlfBefore}`);

// 2. 只替换 meta 里那一段（不触碰任何换行）
const text = buf.toString('utf8');
if (!text.includes(OLD_CODE)) {
  console.error(`  ✗ 基准文件里找不到旧码 ${OLD_CODE}`);
  process.exit(1);
}
const n = (text.split(OLD_CODE).length - 1);
console.log(`  旧码出现 ${n} 次（应为 1）`);
const fixed = text.replace(OLD_CODE, NEW_CODE);

// 3. 以二进制写回（utf8 编码字符串 → Buffer，不做任何换行转换）
const outBuf = Buffer.from(fixed, 'utf8');
fs.writeFileSync(OUT, outBuf);
fs.writeFileSync(SRC, outBuf);

// 4. 校验
const check = fs.readFileSync(OUT);
const crlfAfter = (check.toString('utf8').match(/\r\n/g) || []).length;
const lfOnly = (check.toString('utf8').match(/(?<!\r)\n/g) || []).length;
console.log(`\n输出文件: ${check.length} B  (应为 67044，因为两个码等长)`);
console.log(`  CRLF 数 : ${crlfAfter}  ${crlfAfter === crlfBefore ? '✓ 未变' : '✗ 变了'}`);
console.log(`  单独 LF : ${lfOnly}  ${lfOnly === 0 ? '✓ 无' : '✗ 有'}`);
console.log(`  含新码  : ${check.toString('utf8').includes(NEW_CODE) ? '✓' : '✗'}`);
console.log(`  残留旧码: ${check.toString('utf8').includes(OLD_CODE) ? '✗ 仍有' : '✓ 已清除'}`);

// 5. 与基准做行级 diff，确认只差 1 行
const a = buf.toString('utf8').split('\r\n');
const b = check.toString('utf8').split('\r\n');
console.log(`\n行数: 基准 ${a.length} → 输出 ${b.length}  ${a.length === b.length ? '✓ 相同' : '✗ 不同'}`);
const diffs = [];
for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diffs.push(i + 1);
console.log(`差异行号: ${diffs.join(', ')}  ${diffs.length === 1 ? '✓ 只差 1 行' : '✗ 差 ' + diffs.length + ' 行'}`);
if (diffs.length <= 3) diffs.forEach((ln) => {
  console.log(`  L${ln} 旧: ${(a[ln - 1] || '').trim()}`);
  console.log(`  L${ln} 新: ${(b[ln - 1] || '').trim()}`);
});

// 6. 同步更新改动清单里的记录
const crypto = require('crypto');
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex').slice(0, 16);
console.log(`\nSHA256(前16): 基准=${sha(buf)}  输出=${sha(check)}`);
