const OSS = require('ali-oss');
const client = new OSS({
  region: 'oss-cn-hangzhou',
  bucket: 'muzhe-uploads',
  endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
  accessKeyId: 'LTAI5t7rAcTk7uAw6PrwPLW2',
  accessKeySecret: 'qqV1euAfOFMqtpunooNSLyKTK0bSRl',
});
(async () => {
  const key = 'materials/material-1782487173326-sq1shn.pdf';
  try {
    const meta = await client.head(key);
    console.log('HEAD OK', JSON.stringify({ status: meta.res && meta.res.status, headers: meta.res && meta.res.headers }, null, 2));
  } catch (e) {
    console.log('HEAD FAIL status=', e.status, 'code=', e.code, 'message=', e.message);
  }
  try {
    const r = await client.get(key, null, { headers: { Range: 'bytes=0-1023' } });
    console.log('GET range OK, first bytes len=', r.content.length);
  } catch (e) {
    console.log('GET FAIL status=', e.status, 'code=', e.code, 'message=', e.message);
  }
})();
