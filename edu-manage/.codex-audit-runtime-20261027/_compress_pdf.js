const OSS = require('ali-oss');
const fs = require('fs');
const client = new OSS({
  region: 'oss-cn-hangzhou',
  bucket: 'muzhe-uploads',
  endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
  accessKeyId: 'LTAI5t7rAcTk7uAw6PrwPLW2',
  accessKeySecret: 'qqV1euAfOFMqtpunooNSLyKTK0bSRl',
});
(async () => {
  const key = 'materials/material-1782487173326-sq1shn.pdf';
  const r = await client.get(key);
  fs.writeFileSync('D:/01muzhexuetang/muzhexuetang/coding/_orig.pdf', r.content);
  console.log('downloaded', r.content.length, 'bytes');
})();
