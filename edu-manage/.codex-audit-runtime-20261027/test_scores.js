// 模拟验证分数生成逻辑
const SURS = "王李张刘陈杨黄赵周吴徐孙马朱胡郭林何高罗郑梁谢宋唐许韩冯邓曹彭曾萧田董袁潘蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤默".split("");
const NAME_TAILS = "浩然,梓萱,雨欣,俊杰,欣怡,子涵,宇轩,晨曦,欣妍,铭泽,思远,嘉懿,雨桐,天佑,静姝,梦琪,俊驰,可馨,佳禾,亦凡,书瑶,睿哲,若彤,立诚,沐宸,芷晴,彦博,博文,雅宁,悦心,景行,嘉树,明宇,婉清,泽翰,星辰,语嫣,承恩,清雅,弘毅,瑞霖,诗颖,卓航,嘉乐,思齐,云帆,承睿,思源,子墨,安妮,俊朗,欣蕾,乐珊,思楠,可儿,梓瑞,若岚,宛瑜,允熙,瑾言,子轩,雨泽,梓豪,一诺,沐阳,若曦,梓晨,宇辰,语彤,浩宇,诗涵,雅静,志强,慧敏,建国,秀兰,桂英".split(",");
const EXAMS = ["2026 中考","2026 上学期期末","2026 地生会考","2026 高考"];
const COURSES = {
  "一对一":["英语一对一","数学一对一","物理一对一","语文一对一","化学一对一","历史一对一"],
  "一对三":["地生一对三","数学一对三","物理一对三","英语一对三","化学一对三"],
  "小班":["全科小班（四科）","全科小班（四科）","数学小班","英语小班","语文小班"]
};
const GAIN_TARGET = {"一对一":13,"一对三":10,"小班":23};
function pickFull(exam, course) {
  if (course.indexOf("全科") >= 0) {
    if (exam.indexOf("中考") >= 0) return 800;
    if (exam.indexOf("高考") >= 0) return 750;
    return 600;
  }
  if (exam.indexOf("高考") >= 0) return /数学|语文|英语/.test(course) ? 150 : 100;
  return 120;
}
function randRecs(type) {
  const arr = [], n = 24;
  for (let i = 0; i < n; i++) {
    const name = SURS[Math.floor(Math.random()*SURS.length)] + "*" + NAME_TAILS[Math.floor(Math.random()*NAME_TAILS.length)].slice(-1);
    const exam = EXAMS[Math.floor(Math.random()*EXAMS.length)];
    const course = COURSES[type][Math.floor(Math.random()*COURSES[type].length)];
    const full = pickFull(exam, course);
    const target = GAIN_TARGET[type];
    const gain = Math.max(3, target-5+Math.floor(Math.random()*11));
    let from;
    if (full >= 600) { from = Math.round(full*0.62)+Math.floor(Math.random()*Math.round(full*0.10)); }
    else if (full >= 150) { from = Math.round(full*0.55)+Math.floor(Math.random()*Math.round(full*0.18)); }
    else { from = Math.round(full*0.50)+Math.floor(Math.random()*Math.round(full*0.25)); }
    const to = Math.min(full, from+gain);
    arr.push([name, exam, course, type, from, to, gain, full]);
  }
  return arr;
}
for (const t of Object.keys(COURSES)) {
  const rs = randRecs(t);
  const avg = Math.round(rs.reduce((a, r) => a + (r[5]-r[4]), 0) / rs.length);
  console.log('=== ' + t + ' 平均提升:' + avg + ' ===');
  rs.slice(0, 6).forEach(r => console.log('  ' + r[1] + ' ' + r[2] + ' ' + r[4] + ' → ' + r[5] + ' (+' + (r[5]-r[4]) + ')' + ' 满分' + r[7]));
}
