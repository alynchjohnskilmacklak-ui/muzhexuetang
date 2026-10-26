const fs = require('fs');
const L = fs.readFileSync('edu-manage/public/home.html','utf8').split(/\r?\n/);
['const SURS =','const DATA = [','while (DATA.length < 208)','const avgGain','animateNum(document'].forEach(k=>{
  const i = L.findIndex(l=>l.includes(k));
  console.log(k + ' -> 第 ' + (i+1) + ' 行');
});
console.log('总行数 =', L.length);
console.log('\n第 1035-1058 行:');
L.slice(1034,1058).forEach((l,i)=>console.log('  '+(1035+i)+': '+l));
