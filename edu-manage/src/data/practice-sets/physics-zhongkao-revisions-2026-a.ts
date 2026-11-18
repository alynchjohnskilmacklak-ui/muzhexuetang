import type { PracticeQuestion } from '../parent-practice-bank'

const ohmSource = '牧哲学堂原创拓展题/2026-10/河北中考导向/物理/九年级全一册/第十七章欧姆定律/第1节电流与电压、电阻的关系'
const workSource = '牧哲学堂原创拓展题/2026-10/河北中考导向/物理/九年级全一册/第十八章电功率/第1节电能电功'
const safeSource = '牧哲学堂原创拓展题/2026-10/河北中考导向/物理/九年级全一册/第十九章生活用电/第1节安全用电'

/** 河北中考导向改写：保留原题 ID 与知识点映射，补充实验、生活材料和数据分析任务。 */
export const physicsZhongkaoQuestionRevisions2026A: Record<string, Partial<PracticeQuestion>> = {
  // 九年级全一册：第十七章欧姆定律 / 第1节电流与电压、电阻的关系（knowledgePointId: ohm_r）
  'physics-9q-17-1-q1': {
    id: 'physics-9q-17-1-q1', type: 'single_choice', knowledgePointId: 'ohm_r',
    prompt: '小明用电源、定值电阻R、电流表、电压表和滑动变阻器探究“电流与电压的关系”。下列连接和操作方案正确的是（ ）。',
    options: ['电流表与R并联，电压表与R串联，闭合开关后调节滑片', '电流表串联在电路中，电压表并联在R两端，闭合开关前将滑片置于阻值较大处', '电流表和电压表都串联在电路中，改变电源电压获得多组数据', '电流表和电压表都并联在R两端，只需测量一次'], answerIndex: 1,
    explanation: '电流表应串联，电压表应并联在被测电阻两端。闭合开关前应将滑动变阻器接入电路的阻值调到较大处，以减小初始电流、保护电路；实验中再调节滑片改变R两端电压，获得多组数据。',
    difficulty: 'MEDIUM', sourceRef: ohmSource + '#physics-9q-17-1-q1',
  },
  'physics-9q-17-1-q2': {
    id: 'physics-9q-17-1-q2', type: 'fill_blank', knowledgePointId: 'ohm_r', gradingMode: 'exact',
    prompt: '某定值电阻两端电压为2.4 V时，通过它的电流为0.20 A。该电阻的阻值为____Ω。',
    correctAnswer: '12', acceptedAnswers: ['12', '12Ω', '12 Ω'],
    explanation: '由欧姆定律变形式R=U/I，得R=2.4 V÷0.20 A=12 Ω。',
    difficulty: 'MEDIUM', sourceRef: ohmSource + '#physics-9q-17-1-q2',
  },
  'physics-9q-17-1-q3': {
    id: 'physics-9q-17-1-q3', type: 'multiple_choice', knowledgePointId: 'ohm_r',
    prompt: '探究电流与电阻的关系时，电源电压保持不变，分别接入5 Ω、10 Ω和15 Ω电阻，并调节滑动变阻器使每个电阻两端电压均为3.0 V。下列分析正确的有（ ）。',
    options: ['该实验控制了电阻两端电压不变', '三次实验的电流依次为0.60 A、0.30 A、0.20 A', '在电压一定时，电阻增大，电流也增大', '这些数据支持“电压一定时，电流与电阻成反比”'], answerIndices: [0, 1, 3],
    explanation: '三次均保持U=3.0 V。由I=U/R，电流分别为3.0/5=0.60 A、3.0/10=0.30 A、3.0/15=0.20 A；各组R·I均为3.0 V。电阻增大时电流减小，数据支持电压一定时I与R成反比。',
    difficulty: 'EXAM', sourceRef: ohmSource + '#physics-9q-17-1-q3',
  },
  'physics-9q-17-1-q4': {
    id: 'physics-9q-17-1-q4', type: 'single_choice', knowledgePointId: 'ohm_r',
    prompt: '按规范连接电路测量定值电阻R时，闭合开关后发现电流表指针几乎不偏转，而电压表有明显示数且接近电源电压。各接线无松动，最可能的故障是（ ）。',
    options: ['R被短接', '电流表被短接', 'R所在支路断路', '滑动变阻器被短接'], answerIndex: 2,
    explanation: '支路断路时电流几乎为零，电流表不偏转；电压表并联在R两端，可能经电压表和其余电路形成微弱通路，因而显示接近电源电压。若R被短接，R两端电压应接近零。',
    difficulty: 'EXAM', sourceRef: ohmSource + '#physics-9q-17-1-q4',
  },
  'physics-9q-17-1-q5': {
    id: 'physics-9q-17-1-q5', type: 'short_answer', gradingMode: 'self_check', knowledgePointId: 'ohm_r',
    prompt: '某同学用同一段电阻丝进行实验，测得数据为：U/V：1.0、2.0、3.0；I/A：0.10、0.20、0.30。请写出根据数据求电阻的过程，并说明这组数据支持什么结论。',
    correctAnswer: '各次U/I分别为1.0/0.10=10 Ω、2.0/0.20=10 Ω、3.0/0.30=10 Ω，说明电阻丝阻值约为10 Ω；在电阻和温度保持不变时，电流随两端电压增大而按相同比例增大，即I与U成正比。',
    explanation: '每组数据算得U/I=10 Ω，表明被测电阻基本不变；电压增至原来的2倍、3倍时电流也相应增至2倍、3倍。结论应带上“电阻保持不变”的条件。',
    difficulty: 'EXAM', sourceRef: ohmSource + '#physics-9q-17-1-q5',
  },
  'physics-9q-17-1-q6': {
    id: 'physics-9q-17-1-q6', type: 'single_choice', knowledgePointId: 'ohm_r',
    prompt: '在同一坐标系中作出两个定值电阻的I-U图像，图线A比图线B更陡，且两条图线都经过坐标原点。由此可判断（ ）。',
    options: ['A的电阻大于B', 'A的电阻小于B', 'A、B电阻一定相等', '仅凭图线斜率不能比较电阻'], answerIndex: 1,
    explanation: 'I-U图像的斜率为I/U。对定值电阻有I/U=1/R，图线越陡，斜率越大，电阻越小，因此R_A<R_B。',
    difficulty: 'EXAM', sourceRef: ohmSource + '#physics-9q-17-1-q6',
  },
  'physics-9q-17-1-q7': {
    id: 'physics-9q-17-1-q7', type: 'fill_blank', knowledgePointId: 'ohm_r', gradingMode: 'exact',
    prompt: '某电源电压保持6.0 V，接入30 Ω电阻时电流表读数为0.20 A。若换成20 Ω电阻且电源电压不变，电流表示数为____A。',
    correctAnswer: '0.30', acceptedAnswers: ['0.30', '0.3', '0.30A', '0.3A', '0.30 A', '0.3 A'],
    explanation: '电源电压不变，换入20 Ω电阻后I=U/R=6.0 V/20 Ω=0.30 A；也可由R减小为原来的2/3，电流增大为原来的3/2验证。',
    difficulty: 'MEDIUM', sourceRef: ohmSource + '#physics-9q-17-1-q7',
  },
  'physics-9q-17-1-q8': {
    id: 'physics-9q-17-1-q8', type: 'short_answer', gradingMode: 'self_check', knowledgePointId: 'ohm_r',
    prompt: '某测量电路已闭合，滑动变阻器接入了非零阻值，电流表有明显示数；电压表并联在定值电阻R两端，示数为0 V。假设两只电表及导线均正常，判断最可能的故障并说明依据。',
    correctAnswer: '最可能是R被短路。电流表有示数说明电路仍然闭合；若R被导线短接，R两端电势差为0，电压表示数也为0。',
    explanation: '电流表有示数，说明主电路没有断路；电压表测R两端电压却为0，结合电表和导线正常，可判断R两端被导线旁路，即R短路。',
    difficulty: 'EXAM', sourceRef: ohmSource + '#physics-9q-17-1-q8',
  },
  'physics-9q-17-1-q9': {
    id: 'physics-9q-17-1-q9', type: 'single_choice', knowledgePointId: 'ohm_r',
    prompt: '将一个小灯泡接入电路，逐渐增大其两端电压，发现电流增大，但电流与电压的比值逐渐减小。较合理的解释是（ ）。',
    options: ['小灯泡电阻随灯丝温度升高而增大', '小灯泡电阻随电压升高而必然减小', '电流表读数越大，电源电压一定越低', '欧姆定律说明电流与电压总是不成比例'], answerIndex: 0,
    explanation: '灯丝温度升高时金属灯丝电阻增大，因此U/I（即电阻）增大，I/U减小。欧姆定律对电阻基本不变的导体适用；灯丝升温导致电阻变化时，I-U图像不再是过原点的直线。',
    difficulty: 'EXAM', sourceRef: ohmSource + '#physics-9q-17-1-q9',
  },
  'physics-9q-17-1-q10': {
    id: 'physics-9q-17-1-q10', type: 'multiple_choice', knowledgePointId: 'ohm_r',
    prompt: '小组要探究“电流与电压的关系”。下列做法有助于使结论可靠的有（ ）。',
    options: ['全过程使用同一只定值电阻', '每次改变电压后记录对应的电流', '只测一组数据就判断成正比', '通过移动滑动变阻器改变电压，并避免电阻明显发热'], answerIndices: [0, 1, 3],
    explanation: '研究I与U关系时应控制电阻不变，改变电压并记录多组对应数据；避免电阻明显升温，是为了使其阻值近似不变。仅凭一组数据不足以判断比例关系。',
    difficulty: 'EXAM', sourceRef: ohmSource + '#physics-9q-17-1-q10',
  },

  // 九年级全一册：第十八章电功率 / 第1节电能电功（knowledgePointId: electric_work）
  'physics-9q-18-1-q1': {
    id: 'physics-9q-18-1-q1', type: 'single_choice', knowledgePointId: 'electric_work',
    prompt: '某活动室电能表的计数单位为kW·h。若一段时间内用电器消耗0.50 kW·h电能，换算成焦耳为（ ）。',
    options: ['1.8×10³ J', '1.8×10⁵ J', '1.8×10⁶ J', '3.6×10⁶ J'], answerIndex: 2,
    explanation: '1 kW·h=1000 W×3600 s=3.6×10⁶ J，所以0.50 kW·h=1.8×10⁶ J。',
    difficulty: 'MEDIUM', sourceRef: workSource + '#physics-9q-18-1-q1',
  },
  'physics-9q-18-1-q2': {
    id: 'physics-9q-18-1-q2', type: 'fill_blank', knowledgePointId: 'electric_work', gradingMode: 'exact',
    prompt: '某户电能表上月末读数为1823.6 kW·h，本月末读数为1847.9 kW·h，且本月未更换电能表。本月用电____kW·h。',
    correctAnswer: '24.3', acceptedAnswers: ['24.3', '24.3度'],
    explanation: '本月消耗电能等于本月末读数减上月末读数：1847.9−1823.6=24.3 kW·h。',
    difficulty: 'MEDIUM', sourceRef: workSource + '#physics-9q-18-1-q2',
  },
  'physics-9q-18-1-q3': {
    id: 'physics-9q-18-1-q3', type: 'single_choice', knowledgePointId: 'electric_work',
    prompt: '一只电子式电能表标有“1600 imp/(kW·h)”。某用电器工作时，指示灯闪烁80次。忽略其他用电器的影响，该用电器消耗的电能为（ ）。',
    options: ['0.005 kW·h', '0.05 kW·h', '0.5 kW·h', '20 kW·h'], answerIndex: 1,
    explanation: '每消耗1 kW·h闪烁1600次，闪烁80次对应W=80/1600=0.05 kW·h。',
    difficulty: 'EXAM', sourceRef: workSource + '#physics-9q-18-1-q3',
  },
  'physics-9q-18-1-q4': {
    id: 'physics-9q-18-1-q4', type: 'short_answer', gradingMode: 'self_check', knowledgePointId: 'electric_work',
    prompt: '一台直流小电动机在12 V电压下工作，通过电流为0.50 A，持续4 min。求这段时间电流所做的功，并写出主要代入过程。',
    correctAnswer: 't=4 min=240 s；W=UIt=12 V×0.50 A×240 s=1440 J。',
    explanation: '使用W=UIt，时间必须换算成秒：4 min=240 s。代入得W=12×0.50×240=1440 J。',
    difficulty: 'EXAM', sourceRef: workSource + '#physics-9q-18-1-q4',
  },
  'physics-9q-18-1-q5': {
    id: 'physics-9q-18-1-q5', type: 'multiple_choice', knowledgePointId: 'electric_work',
    prompt: '下列用电器工作时，电流做功使电能主要转化为其他形式能的描述正确的有（ ）。',
    options: ['电热水壶：主要转化为内能', '电风扇：主要转化为机械能，同时有一部分转化为内能和声能', 'LED灯：主要转化为光能，同时有一部分转化为内能', '电能表：把电能主要转化为电能并储存在表内'], answerIndices: [0, 1, 2],
    explanation: '电流做功的实质是电能转化为其他形式能。电热水壶主要发热；电风扇主要带动叶片转动，电机和空气也会发热并产生声音；LED灯主要发光并伴随发热。电能表是测量电能的仪表，不是储能器。',
    difficulty: 'MEDIUM', sourceRef: workSource + '#physics-9q-18-1-q5',
  },
  'physics-9q-18-1-q6': {
    id: 'physics-9q-18-1-q6', type: 'fill_blank', knowledgePointId: 'electric_work', gradingMode: 'exact',
    prompt: '一台额定功率为600 W的电饭锅正常工作15 min，消耗电能____kW·h。',
    correctAnswer: '0.15', acceptedAnswers: ['0.15', '0.15 kW·h', '0.15kW·h'],
    explanation: '600 W=0.60 kW，15 min=0.25 h，W=Pt=0.60×0.25=0.15 kW·h。',
    difficulty: 'MEDIUM', sourceRef: workSource + '#physics-9q-18-1-q6',
  },
  'physics-9q-18-1-q7': {
    id: 'physics-9q-18-1-q7', type: 'single_choice', knowledgePointId: 'electric_work',
    prompt: '甲、乙两台用电器分别在额定电压下工作：甲的功率为800 W，工作30 min；乙的功率为400 W，工作1 h。比较两者消耗的电能，正确的是（ ）。',
    options: ['甲多一倍', '乙多一倍', '两者相同，均为0.40 kW·h', '两者相同，均为0.80 kW·h'], answerIndex: 2,
    explanation: 'W=Pt。甲消耗0.80 kW×0.50 h=0.40 kW·h；乙消耗0.40 kW×1 h=0.40 kW·h，二者相同。',
    difficulty: 'EXAM', sourceRef: workSource + '#physics-9q-18-1-q7',
  },
  'physics-9q-18-1-q8': {
    id: 'physics-9q-18-1-q8', type: 'short_answer', gradingMode: 'self_check', knowledgePointId: 'electric_work',
    prompt: '某家庭每天用一台功率为1.5 kW的电暖器取暖40 min，连续使用30天。若电价为0.52元/(kW·h)，不计其他费用，求这段时间电暖器消耗的电能和电费。',
    correctAnswer: '每天用电W日=1.5 kW×(40/60) h=1.0 kW·h；30天共30 kW·h。电费=30×0.52元=15.6元。',
    explanation: '先把40 min换算成2/3 h，单日用电量为1.5×2/3=1.0 kW·h；30天共30 kW·h。电费=用电量×电价=30×0.52=15.6元。',
    difficulty: 'EXAM', sourceRef: workSource + '#physics-9q-18-1-q8',
  },
  'physics-9q-18-1-q9': {
    id: 'physics-9q-18-1-q9', type: 'multiple_choice', knowledgePointId: 'electric_work',
    prompt: '关于用电器消耗的电能，下列判断正确的有（ ）。',
    options: ['电能表读数之差可以表示一段时间内电路消耗的电能', '同一用电器工作时间越长，消耗的电能一定越多', '在功率不变时，工作时间加倍，消耗的电能加倍', '只要电压较大，消耗的电能就一定较多，与电流和时间无关'], answerIndices: [0, 2],
    explanation: '电能表两次读数之差表示期间消耗的电能。由W=Pt，在功率不变时电能与时间成正比。若用电器功率会变化，仅知时间长短不能断言电能一定更多；电能也不能只由电压决定。',
    difficulty: 'EXAM', sourceRef: workSource + '#physics-9q-18-1-q9',
  },
  'physics-9q-18-1-q10': {
    id: 'physics-9q-18-1-q10', type: 'short_answer', gradingMode: 'self_check', knowledgePointId: 'electric_work',
    prompt: '微波炉功率为1.2 kW，每天使用8 min；路由器功率为10 W，每天连续工作10 h。比较它们一天消耗的电能，并求相差多少。',
    correctAnswer: '微波炉：1.2 kW×(8/60) h=0.16 kW·h；路由器：0.010 kW×10 h=0.10 kW·h；微波炉多消耗0.06 kW·h，即0.06×3.6×10⁶ J=2.16×10⁵ J。',
    explanation: '两种用电器均用W=Pt计算，并统一使用kW和h。差值为0.16−0.10=0.06 kW·h；按1 kW·h=3.6×10⁶ J换算为2.16×10⁵ J。',
    difficulty: 'EXAM', sourceRef: workSource + '#physics-9q-18-1-q10',
  },

  // 九年级全一册：第十九章生活用电 / 第1节安全用电（knowledgePointId: safe）
  'physics-9q-19-1-q1': {
    id: 'physics-9q-19-1-q1', type: 'single_choice', knowledgePointId: 'safe',
    prompt: '雨后，学校走廊一处墙插附近有积水，插座外壳有破损，旁边电线绝缘层也已开裂。此时最恰当的做法是（ ）。',
    options: ['先用干布擦干插座，再继续使用', '请成年人在安全位置切断相关电源并联系电工检修，未确认安全前远离积水和插座', '戴橡胶手套拔下插头后继续使用', '只要不触摸金属插脚，插座仍可正常使用'], answerIndex: 1,
    explanation: '破损插座、开裂绝缘层和积水共同增加触电风险。应由成年人从安全位置切断电源，再由专业人员检修；不能在未断电时靠近、擦拭或自行拆修。',
    difficulty: 'EXAM', sourceRef: safeSource + '#physics-9q-19-1-q1',
  },
  'physics-9q-19-1-q2': {
    id: 'physics-9q-19-1-q2', type: 'multiple_choice', knowledgePointId: 'safe',
    prompt: '关于家庭电路中的安全保护，下列说法正确的有（ ）。',
    options: ['有金属外壳的用电器应按要求将外壳接地', '保护接地线用于漏电时提供安全通路，正常工作时不应代替火线或零线', '空气开关能在电流过大时自动切断电路', '装有漏电保护器后，湿手接触带电体也不会触电'], answerIndices: [0, 1, 2],
    explanation: '金属外壳接地可降低外壳意外带电时的触电危险；保护接地线不承载用电器正常工作电流；空气开关可在过载或短路等电流过大时切断电路。漏电保护器不能使危险接触变安全，湿手仍不得触碰带电体。',
    difficulty: 'EXAM', sourceRef: safeSource + '#physics-9q-19-1-q2',
  },
  'physics-9q-19-1-q3': {
    id: 'physics-9q-19-1-q3', type: 'short_answer', gradingMode: 'self_check', knowledgePointId: 'safe',
    prompt: '同学发现有人因插线板故障倒在地上，手仍接触插线板。请写出施救前最先采取的措施，以及随后应遵循的安全处置原则。',
    correctAnswer: '先在确保自身安全的前提下从安全位置切断电源（如关闭相应开关或断路器）；未确认断电前不能直接接触伤者或故障插线板。断电后呼叫成年人和急救人员，并按现场安全情况救助。',
    explanation: '触电救援的首要原则是先切断电源，避免施救者也触电。不能直接拉拽伤者或触碰插线板；断电后及时呼叫成年人、急救人员并进行安全救助。',
    difficulty: 'EXAM', sourceRef: safeSource + '#physics-9q-19-1-q3',
  },
  'physics-9q-19-1-q4': {
    id: 'physics-9q-19-1-q4', type: 'single_choice', knowledgePointId: 'safe',
    prompt: '某家庭电路电压为220 V，保险装置额定电流为5.0 A。原来同时工作的用电器总功率为330 W，又接入一台900 W电暖器。假设各用电器均正常工作，接入后总电流约为（ ），与额定电流比较可知（ ）。',
    options: ['1.50 A，未超过额定电流', '5.59 A，超过额定电流，存在过载风险', '5.00 A，恰好等于额定电流', '6.00 A，未超过额定电流'], answerIndex: 1,
    explanation: '总功率P总=330 W+900 W=1230 W。I=P总/U=1230 W/220 V≈5.59 A，大于5.0 A额定电流，存在过载风险。',
    difficulty: 'EXAM', sourceRef: safeSource + '#physics-9q-19-1-q4',
  },
  'physics-9q-19-1-q5': {
    id: 'physics-9q-19-1-q5', type: 'single_choice', knowledgePointId: 'safe',
    prompt: '家庭电路需要更换熔断器中的熔丝。下列做法符合安全用电原则的是（ ）。',
    options: ['用铜丝代替熔丝，避免再次熔断', '选择额定电流符合电路要求的熔丝，并先断开电源再更换', '随意加粗熔丝，使其能承受更多用电器', '只要熔丝已熔断，就可带电直接更换'], answerIndex: 1,
    explanation: '熔丝应按电路要求选用合适规格，不能用铜丝或任意加粗来代替；更换前应断开电源，防止触电。',
    difficulty: 'MEDIUM', sourceRef: safeSource + '#physics-9q-19-1-q5',
  },
  'physics-9q-19-1-q6': {
    id: 'physics-9q-19-1-q6', type: 'fill_blank', knowledgePointId: 'safe', gradingMode: 'exact',
    prompt: '我国常用家庭电路电压为220 V；对人体安全的电压通常认为是____V。',
    correctAnswer: '不高于36', acceptedAnswers: ['不高于36', '≤36', '36以下', '36及以下'],
    explanation: '对人体安全的电压是不高于36 V。家庭电路电压220 V远高于这一限值，不能认为触碰家庭电路是安全的。',
    difficulty: 'MEDIUM', sourceRef: safeSource + '#physics-9q-19-1-q6',
  },
  'physics-9q-19-1-q7': {
    id: 'physics-9q-19-1-q7', type: 'single_choice', knowledgePointId: 'safe',
    prompt: '郊外有人发现高压线断落在地面附近。为避免跨步电压造成伤害，正确做法是（ ）。',
    options: ['迅速跑过落地点附近', '靠近查看断线是否仍有电', '保持距离并提醒他人远离，立即报告供电部门或报警', '用木棍把导线挑到路边'], answerIndex: 2,
    explanation: '高压线落地附近可能存在危险电场和跨步电压，应保持距离、警示他人并立即报告专业部门，不能靠近查看、奔跑穿越或自行移动导线。',
    difficulty: 'EXAM', sourceRef: safeSource + '#physics-9q-19-1-q7',
  },
  'physics-9q-19-1-q8': {
    id: 'physics-9q-19-1-q8', type: 'multiple_choice', knowledgePointId: 'safe',
    prompt: '使用带金属外壳的洗衣机时，下列做法正确的有（ ）。',
    options: ['使用符合要求的三孔插座，并保证保护接地有效', '发现电源线绝缘层破损时停止使用并请专业人员检修', '为方便移动，可剪掉插头的接地脚', '漏电保护器跳闸后，查明原因并排除故障前不反复强行合闸'], answerIndices: [0, 1, 3],
    explanation: '金属外壳用电器应保持保护接地有效；电源线绝缘破损或保护装置跳闸都提示存在危险，应停止使用并由成年人或专业人员处理。剪掉接地脚会破坏保护接地。',
    difficulty: 'EXAM', sourceRef: safeSource + '#physics-9q-19-1-q8',
  },
  'physics-9q-19-1-q9': {
    id: 'physics-9q-19-1-q9', type: 'short_answer', gradingMode: 'self_check', knowledgePointId: 'safe',
    prompt: '家中空气开关在晚间多次跳闸。家人怀疑是同时使用的电器过多，也不排除某电器或线路故障。请写出两项安全、合理的排查措施。',
    correctAnswer: '避免反复强行合闸；由成年人在插头、插座干燥且完好的安全条件下关闭并逐个断开可安全断开的用电器，观察是否因总功率过大。若断开后仍跳闸或发现线路/电器异常，应保持断电并联系专业电工检修，不得自行拆开带电线路。',
    explanation: '多台大功率用电器同时工作可能造成过载，电器或线路故障也可能造成短路、漏电。排查时先避免反复合闸，由成年人在干燥且无异常的条件下减少负载；若故障持续，应断电请专业人员检修，不能自行带电拆修。',
    difficulty: 'EXAM', sourceRef: safeSource + '#physics-9q-19-1-q9',
  },
  'physics-9q-19-1-q10': {
    id: 'physics-9q-19-1-q10', type: 'multiple_choice', knowledgePointId: 'safe',
    prompt: '下列生活情境中，能降低触电风险的做法有（ ）。',
    options: ['用电器外壳或插头破损时停止使用并及时检修', '更换灯泡前断开相应电源，避免只凭灯泡熄灭判断安全', '在潮湿环境中用湿手插拔电源插头', '不接触低压带电体，不靠近高压带电体'], answerIndices: [0, 1, 3],
    explanation: '绝缘破损应停止使用并检修；更换灯泡应断电，不能只根据灯泡是否发光判断线路安全；潮湿时人体电阻较小，湿手插拔插头危险。安全用电原则还包括不接触低压带电体、不靠近高压带电体。',
    difficulty: 'MEDIUM', sourceRef: safeSource + '#physics-9q-19-1-q10',
  },
}
