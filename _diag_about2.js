const fs = require('fs');
const a = fs.readFileSync('edu-manage/public/about.html','utf8');
console.log('about.html 行尾: ' + (a.includes('\r\n') ? 'CRLF' : 'LF'));
console.log();
const show = (label, key) => {
  const i = a.indexOf(key);
  console.log('--- ' + label + ' (' + key + ') -> ' + (i>=0 ? '@'+i : 'NOT FOUND'));
  if (i>=0) console.log(JSON.stringify(a.substring(Math.max(0,i-120), i+400)));
  console.log();
};
show('og 区', 'og:title');
show('JSON-LD', '"alternateName"');
show('统计', 'id="statCount"');
show('动画', 'getElementById("statCount").innerHTML');
