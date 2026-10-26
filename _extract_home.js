(function(){

/* ================= 学员进步对比：深色6宫格自动滚动 ================= */
(function(){
  const SURS = "王李张刘陈杨黄赵周吴徐孙马朱胡郭林何高罗郑梁谢宋唐许韩冯邓曹彭曾萧田董袁潘蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤".split("");
  const NAMES = "浩然,梓萱,雨欣,俊杰,欣怡,子涵,宇轩,晨曦,欣妍,铭泽,思远,嘉懿,雨桐,天佑,静姝,梦琪,俊驰,可馨,佳禾,亦凡,书瑶,睿哲,若彤,立诚,沐宸,芷晴,彦博,博文,雅宁,悦心,景行,嘉树,明宇,婉清,泽翰,星辰,语嫣,承恩,清雅,弘毅,瑞霖,诗颖,卓航,嘉乐,思齐,云帆,承睿,思源,子墨,安妮,俊朗,欣蕾,乐珊,思楠,可儿,梓瑞,若岚,宛瑜,允熙,瑾言,子轩,雨泽,梓豪,一诺,沐阳,若曦,梓晨,雨桐,思远,佳怡,子墨,欣怡,宇辰,语彤,浩宇,诗涵,俊杰,雅静,志强,慧敏,建国,秀兰,桂英".split(",");
  const SUBJECTS = [
    {exam:"2026 地生会考", subject:"地生", full:120},
    {exam:"2026 中考", subject:"数学", full:120},
    {exam:"2026 中考", subject:"语文", full:120},
    {exam:"2026 中考", subject:"英语", full:120},
    {exam:"2026 中考", subject:"物理", full:60},
    {exam:"2026 中考", subject:"化学", full:60},
    {exam:"2026 中考", subject:"政治", full:60},
    {exam:"2026 中考", subject:"历史", full:60},
    {exam:"2026 上学期期末", subject:"数学", full:120},
    {exam:"2026 上学期期末", subject:"语文", full:120},
    {exam:"2026 上学期期末", subject:"英语", full:120},
    {exam:"2026 上学期期末", subject:"物理", full:60},
    {exam:"2026 上学期期末", subject:"化学", full:60},
    {exam:"2026 上学期期末", subject:"政治", full:60},
    {exam:"2026 上学期期末", subject:"历史", full:60},
    {exam:"2026 上学期期末", subject:"地理", full:60},
    {exam:"2026 上学期期末", subject:"生物", full:60},
    {exam:"2026 高考", subject:"数学", full:150},
    {exam:"2026 高考", subject:"语文", full:150},
    {exam:"2026 高考", subject:"英语", full:150},
    {exam:"2026 高考", subject:"物理", full:100},
    {exam:"2026 高考", subject:"化学", full:100},
    {exam:"2026 高考", subject:"生物", full:100},
    {exam:"2026 高考", subject:"政治", full:100},
    {exam:"2026 高考", subject:"历史", full:100},
    {exam:"2026 高考", subject:"地理", full:100}
  ];
  const TYPES = ["一对一","一对三","小班"];
  const AV_COLORS = ["#C2541F","#1E7A33","#185FA5","#8F5A12","#7c5cd6","#B03A5E"];

  let seed = 20260920;
  function rnd(){ seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  function pick(arr){ return arr[Math.floor(rnd() * arr.length)]; }

  const NAME_TAILS = (function(){
    const seen = new Set(), out = [];
    for (const n of NAMES){ const t = n[n.length - 1]; if (!seen.has(t)){ seen.add(t); out.push(n); } }
    return out;
  })();
  const NAME_POOL = (function(){
    const a = NAME_TAILS.slice();
    for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  })();
  let nameIdx = 0;
  function makeName(){ return pick(SURS) + "*" + NAME_POOL[nameIdx++ % NAME_POOL.length].slice(-1); }

  const POOL = (function(){
    const arr = SUBJECTS.slice();
    for (let i = arr.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  })();
  let poolIdx = 0;

  function makeRecord(){
    const s = POOL[poolIdx % POOL.length]; poolIdx++;
    const type = TYPES[Math.floor(rnd() * TYPES.length)];
    const base = Math.round(s.full * (0.40 + rnd() * 0.38));
    const gain = 10 + Math.floor(rnd() * 36);
    const final = Math.min(Math.floor(s.full * 0.93), base + gain);
    return { name: makeName(), exam: s.exam, course: s.subject + (type === "一对一" ? "一对一" : type), from: base, to: final, full: s.full };
  }

  const DATA = [
    {name:"杜*诺", exam:"2026 地生会考", course:"地生一对三", from:98, to:120, full:120},
    {name:"马*晨", exam:"2026 地生会考", course:"地生一对三", from:85, to:112, full:120},
    {name:"刘*宇", exam:"2026 地生会考", course:"地生一对三", from:68, to:108, full:120}
  ];
  while (DATA.length < 208) DATA.push(makeRecord());

  const avgGain = Math.round(DATA.reduce((s, d) => s + d.to - d.from, 0) / DATA.length);
  const maxGain = Math.max(...DATA.map(d => d.to - d.from));



  const D = DATA.slice();
  while (D.length < 208) D.push(makeRecord());
  module.exports = {
    count: D.length,
    avg: Math.round(D.reduce((s,d)=>s+d.to-d.from,0)/D.length),
    max: Math.max(...D.map(d=>d.to-d.from)),
    types: [...new Set(D.map(d=>d.course.replace(/^(数学|语文|英语|物理|化学|生物|政治|历史|地理|地生)/,'')))],
    colors: AV_COLORS,
    records: D.slice(0, 8).map(d => ({ name: d.name, exam: d.exam, course: d.course, from: d.from, to: d.to, gain: d.to - d.from }))
  };

})();})();
