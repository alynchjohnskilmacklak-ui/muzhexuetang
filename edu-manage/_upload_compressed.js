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
  const buf = fs.readFileSync('D:/01muzhexuetang/muzhexuetang/coding/_compressed.pdf');
  const r = await client.put(key, buf);
  console.log('uploaded:', r.name, 'size:', buf.length);
})();
