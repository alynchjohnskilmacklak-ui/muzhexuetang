const fs = require('fs');
const c = fs.readFileSync('public/home.html', 'utf8');
// 找 .logo CSS
var idx = c.indexOf('.logo{');
console.log('.logo CSS:');
console.log(c.substring(idx, idx + 400));
console.log('---');
// 找 header CSS
var hidx = c.indexOf('.header{');
console.log('.header CSS:');
console.log(c.substring(hidx, hidx + 300));
