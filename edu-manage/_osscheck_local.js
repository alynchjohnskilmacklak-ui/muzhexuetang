const OSS = require('ali-oss');
const c = new OSS({
  region: process.env.ALIYUN_OSS_REGION,
  bucket: process.env.ALIYUN_OSS_BUCKET,
  endpoint: process.env.ALIYUN_OSS_ENDPOINT,
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
});
(async () => {
  const keys = [
    'materials/material-1782486427967-8uhq39.pdf',
    'materials/material-1782486514960-gldeml.pdf',
    'materials/material-1782487791998-1lm886.pdf',
    'materials/lesson-previews-1789219572225-7436545d-b37c-4184-8ea4-0623e3dc7818.pdf',
  ];
  for (const k of keys) {
    try {
      const r = await c.head(k);
      console.log('OK', k, r.res.status, r.res.headers['content-length']);
    } catch (e) {
      console.log('FAIL', k, (e && (e.code || e.name)) || String(e), (e && e.status) || '');
    }
  }
  try {
    const list = await c.list({ prefix: 'materials/', 'max-keys': 30 });
    const objs = (list.objects || []).map((o) => o.name);
    console.log('LIST_COUNT', objs.length);
    console.log(objs.join('\n'));
  } catch (e) {
    console.log('LIST_FAIL', (e && (e.code || e.name)) || String(e));
  }
})();
