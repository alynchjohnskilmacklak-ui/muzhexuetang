/* ================= 学员进步对比：示例数据生成（确定性） ================= */
(function(){
  const SURS = "王李张刘陈杨黄赵周吴徐孙马朱胡郭林何高罗郑梁谢宋唐许韩冯邓曹彭曾萧田董袁潘蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤".split("");
  const NAMES = "浩然,梓萱,雨欣,俊杰,欣怡,子涵,宇轩,晨曦,欣妍,铭泽,思远,嘉懿,雨桐,天佑,静姝,梦琪,俊驰,可馨,佳禾,亦凡,书瑶,睿哲,若彤,立诚,沐宸,芷晴,彦博,博文,雅宁,悦心,景行,嘉树,明宇,婉清,泽翰,星辰,语嫣,承恩,清雅,弘毅,瑞霖,诗颖,卓航,嘉乐,思齐,云帆,承睿,思源,子墨,安妮,俊朗,欣蕾,乐珊,思楠,可儿,梓瑞,若岚,宛瑜,允熙,瑾言".split(",");
  // 学科 / 考试 / 满分（河北规则：中考主科120、副科60，地生会考合卷120；高考语数英150、选考科目100）
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

  // 确定性伪随机（种子固定，每次刷新结果一致）
  let seed = 20260907;
  function rnd(){ seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  function pick(arr){ return arr[Math.floor(rnd() * arr.length)]; }

  // 尾字去重池：保证每条记录的名字尾字不重复（60 个唯一尾字，126 条隔 60 条才循环一次）
  const NAME_TAILS = (function(){
    const seen = new Set(), out = [];
    for (const n of NAMES){ const t = n[n.length - 1]; if (!seen.has(t)){ seen.add(t); out.push(n); } }
    return out;
  })();
  const NAME_POOL = (function(){
    const a = NAME_TAILS.slice();
    for (let i = a.length - 1; i > 0; i--){
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  })();
  let nameIdx = 0;
  function makeName(){
    const g = NAME_POOL[nameIdx % NAME_POOL.length];
    nameIdx++;
    return pick(SURS) + "*" + g[g.length - 1];
  }

  // 学科池洗牌后轮询抽取，保证 26 个学科组合全部覆盖
  const POOL = (function(){
    const arr = SUBJECTS.slice();
    for (let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  })();
  let poolIdx = 0;

  // 生成记录：入学分（满分 40%~78%），提升 +6~+35，最终最高 93% 不贴满
  function makeRecord(){
    const s = POOL[poolIdx % POOL.length];
    poolIdx++;
    const type = TYPES[Math.floor(rnd() * TYPES.length)];
    const base = Math.round(s.full * (0.40 + rnd() * 0.38));
    const gain = 6 + Math.floor(rnd() * 30); // +6 ~ +35
    const final = Math.min(Math.floor(s.full * 0.93), base + gain);
    return {
      name: makeName(),
      full: s.full,
      type: type,
      typeLabel: s.subject + (type === "一对一" ? "一对一" : type === "一对三" ? "一对三冲刺班" : "小班冲刺"),
      exam: s.exam,
      base: base,
      final: final,
      gain: final - base
    };
  }

  // 用户提供的三条真实参考数据（固定置顶）
  const FIXED = [
    {name:"杜*诺", type:"一对三", typeLabel:"地生一对三冲刺班", exam:"2026 地生会考", base:112, final:120, gain:8, full:120},
    {name:"马*晨", type:"一对三", typeLabel:"地生一对三冲刺班", exam:"2026 地生会考", base:108, final:114, gain:6, full:120},
    {name:"刘*宇", type:"一对三", typeLabel:"地生一对三冲刺班", exam:"2026 地生会考", base:82,  final:108, gain:26, full:120}
  ];

  const DATA = FIXED.slice();
  while (DATA.length < 126) DATA.push(makeRecord());

  // 平均提升

const D = FIXED.slice();
while (D.length < 126) D.push(makeRecord());
console.log('about 页真实生成的前 8 条：');
D.slice(0,8).forEach((d,i)=>console.log('  '+(i+1)+'. '+d.name+' | '+d.typeLabel+' | '+d.exam+' | '+d.base+'->'+d.final+' | +'+d.gain));
console.log('花括号差额=' + (42-41));

})();
