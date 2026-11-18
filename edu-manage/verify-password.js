const bcrypt = require('bcryptjs');

const hash = '$2b$10$C5fn9QcurH.zX8sM6OFQ2.7lfBBDRPLwzSlpm6.Vak.iXYkajpg7S';
const password = 'wangqihan';

const result = bcrypt.compareSync(password, hash);
console.log('密码是否正确：', result);
