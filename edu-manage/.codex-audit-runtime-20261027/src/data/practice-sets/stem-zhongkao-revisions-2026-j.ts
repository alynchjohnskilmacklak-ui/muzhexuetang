import type { PracticeQuestion } from '../parent-practice-bank'

const gravitySource = '牧哲学堂原创拓展题/2026-10/河北中考导向/物理/八年级下册/第七章力/第3节重力'
const densitySource = '牧哲学堂原创拓展题/2026-10/河北中考导向/物理/八年级上册/第六章质量与密度/第3节测量液体和固体的密度'
const resistanceSource = '牧哲学堂原创拓展题/2026-10/河北中考导向/物理/九年级全一册/第十七章欧姆定律/第3节电阻的测量'

/** 河北中考导向原创改写：保留既有题目 ID 与知识点映射，增加实验、证据和规范表达。 */
export const stemZhongkaoQuestionRevisions2026J: Record<string, Partial<PracticeQuestion>> = {
  // 八年级下册：第七章力 / 第3节重力（knowledgePointId: gravity）
  'physics-8b-7-3-q1': {
    id: 'physics-8b-7-3-q1', type: 'single_choice', knowledgePointId: 'gravity',
    prompt: '装修工人在门框侧边悬挂重垂线。待细线静止后，发现细线与门框的一条边平行。根据这一现象，可以判断这条门框边',
    options: ['沿竖直方向。', '沿水平方向。', '一定垂直于墙面。', '一定与地面成45°角。'], answerIndex: 0,
    explanation: '重垂线静止时沿重力方向，即竖直方向。细线与门框边平行，说明该门框边也沿竖直方向。判断依据是重力方向，不是门框边与墙面的关系。',
    difficulty: 'MEDIUM', sourceRef: `${gravitySource}#physics-8b-7-3-q1`,
  },
  'physics-8b-7-3-q2': {
    id: 'physics-8b-7-3-q2', type: 'fill_blank', knowledgePointId: 'gravity', gradingMode: 'exact',
    prompt: '在地球附近，若取g=9.8 N/kg，这表示质量为1 kg的物体受到的重力大小约为____ N。',
    correctAnswer: '9.8', acceptedAnswers: ['9.8', '9.8N', '9.8 N'],
    explanation: 'g=9.8 N/kg表示每千克质量对应的重力约为9.8 N，因此1 kg物体的重力约为9.8 N。',
    difficulty: 'EASY', sourceRef: `${gravitySource}#physics-8b-7-3-q2`,
  },
  'physics-8b-7-3-q3': {
    id: 'physics-8b-7-3-q3', type: 'single_choice', knowledgePointId: 'gravity',
    prompt: '将小球竖直向上抛出，忽略空气阻力。小球离手后上升的过程中，所受重力的方向是',
    options: ['竖直向上。', '竖直向下。', '先向上后向下。', '与小球瞬时运动方向相反。'], answerIndex: 1,
    explanation: '重力方向由地球附近的竖直方向决定，与物体此时向上还是向下运动无关。小球离手后仍受竖直向下的重力。',
    difficulty: 'MEDIUM', sourceRef: `${gravitySource}#physics-8b-7-3-q3`,
  },
  'physics-8b-7-3-q4': {
    id: 'physics-8b-7-3-q4', type: 'fill_blank', knowledgePointId: 'gravity', gradingMode: 'exact',
    prompt: '一件实验器材的质量为2.4 kg，取g=10 N/kg。它在地球附近受到的重力大小为____ N。',
    correctAnswer: '24', acceptedAnswers: ['24', '24N', '24 N'],
    explanation: '由G=mg，G=2.4 kg×10 N/kg=24 N。质量和g的单位配合后，结果单位为N。',
    difficulty: 'EASY', sourceRef: `${gravitySource}#physics-8b-7-3-q4`,
  },
  'physics-8b-7-3-q5': {
    id: 'physics-8b-7-3-q5', type: 'fill_blank', knowledgePointId: 'gravity', gradingMode: 'exact',
    prompt: '弹簧测力计测得某物体所受重力为49 N。若当地g=9.8 N/kg，该物体的质量为____ kg。',
    correctAnswer: '5', acceptedAnswers: ['5', '5.0', '5kg', '5 kg'],
    explanation: '由G=mg得m=G/g=49 N÷(9.8 N/kg)=5 kg。重力单位N除以N/kg，得到质量单位kg。',
    difficulty: 'MEDIUM', sourceRef: `${gravitySource}#physics-8b-7-3-q5`,
  },
  'physics-8b-7-3-q6': {
    id: 'physics-8b-7-3-q6', type: 'single_choice', knowledgePointId: 'gravity',
    prompt: '滑雪者停在倾斜的雪坡上。关于滑雪者所受重力的方向，下列说法正确的是',
    options: ['垂直于雪坡向下。', '沿雪坡向下。', '竖直向下。', '沿雪坡向上。'], answerIndex: 2,
    explanation: '重力方向总是竖直向下，并不随支持面的倾斜而改变。垂直于雪坡的方向是支持力方向，不是重力方向。',
    difficulty: 'MEDIUM', sourceRef: `${gravitySource}#physics-8b-7-3-q6`,
  },
  'physics-8b-7-3-q7': {
    id: 'physics-8b-7-3-q7', type: 'short_answer', knowledgePointId: 'gravity', gradingMode: 'self_check',
    prompt: '一名宇航员在地球表面所受重力为600 N，取地球附近g=10 N/kg。若月球表面的重力加速度约为地球的1/6，求宇航员的质量和他在月球表面所受的重力。写出必要的计算过程。',
    correctAnswer: '评分要点：①由G=mg，宇航员质量m=600 N÷(10 N/kg)=60 kg（1分）；②质量是物体本身的属性，换到月球质量仍为60 kg（1分）；③月球g约为10/6 N/kg，G月=60 kg×(10/6 N/kg)=100 N（1分）。',
    explanation: '先由地球上的重力求质量，再用月球表面的g求重力。地点改变会使g和重力大小改变，但物体的质量不变。计算时应把1/6作用于g或重力，不能把质量也除以6。',
    difficulty: 'EXAM', sourceRef: `${gravitySource}#physics-8b-7-3-q7`,
  },
  'physics-8b-7-3-q8': {
    id: 'physics-8b-7-3-q8', type: 'short_answer', knowledgePointId: 'gravity', gradingMode: 'self_check',
    prompt: '同一地点用弹簧测力计测得三件物体的数据如下：质量m/kg为0.20、0.40、0.60，重力G/N分别为2.0、4.0、6.0。写出每组G/m的数值，并概括重力与质量的关系。',
    correctAnswer: '评分要点：①三组G/m均为10 N/kg（1分）；②在同一地点，物体所受重力与质量成正比（1分）；③可写为G=mg，此处g=10 N/kg（1分）。',
    explanation: '分别计算2.0/0.20、4.0/0.40、6.0/0.60，结果均为10 N/kg。数据支持在同一地点重力与质量成正比；结论依赖于地点相同，因为g会随地点而变化。',
    difficulty: 'EXAM', sourceRef: `${gravitySource}#physics-8b-7-3-q8`,
  },
  'physics-8b-7-3-q9': {
    id: 'physics-8b-7-3-q9', type: 'single_choice', knowledgePointId: 'gravity',
    prompt: '一辆养护车的质量为1.5 t，检修平台的最大承载能力为14 kN。取g=10 N/kg，忽略车辆启动或制动造成的影响。该车停在平台上是否超过承载能力？',
    options: ['超过；车辆所受重力为15 kN。', '未超过；车辆所受重力为1.5 kN。', '未超过；车辆所受重力为14 kN。', '无法比较，因为给出的是质量而不是重力。'], answerIndex: 0,
    explanation: '1.5 t=1 500 kg，车辆所受重力G=mg=1 500×10 N=15 000 N=15 kN。15 kN大于平台最大承载能力14 kN，因此超过承载能力。',
    difficulty: 'EXAM', sourceRef: `${gravitySource}#physics-8b-7-3-q9`,
  },
  'physics-8b-7-3-q10': {
    id: 'physics-8b-7-3-q10', type: 'short_answer', knowledgePointId: 'gravity', gradingMode: 'self_check',
    prompt: '要用悬挂法确定一块形状不规则薄纸板的重心，小组先后把纸板悬挂在边缘的A孔和B孔处，并各自描出静止细线的方向。说明怎样根据这两次操作标出重心，并解释依据。',
    correctAnswer: '评分要点：①分别沿A孔、B孔处静止细线的方向在纸板上画线（1分）；②两条线的交点标为纸板的重心（1分）；③纸板自由悬挂静止时，重力作用线经过悬挂点，因此重心在每条细线方向上（1分）。',
    explanation: '纸板自由悬挂并静止时，悬挂点对纸板的拉力与重力平衡，重力作用线沿重垂线方向且经过悬挂点。因此每次悬挂时重心都落在细线方向上，两次方向线的交点可标出重心；它不一定是纸板的几何中心。',
    difficulty: 'EXAM', sourceRef: `${gravitySource}#physics-8b-7-3-q10`,
  },

  // 八年级上册：第六章质量与密度 / 第3节测量液体和固体的密度（knowledgePointId: measure_d）
  'physics-8a-6-3-q1': {
    id: 'physics-8a-6-3-q1', type: 'single_choice', knowledgePointId: 'measure_d',
    prompt: '实验室要测一块形状不规则、能沉入水中且不吸水的小石块密度，现有天平、量筒、水和细线。下列方案最合适的是',
    options: [
      '先用天平测小石块质量，再用量筒测水面变化求体积，最后用ρ=m/V计算。',
      '只用天平测小石块质量，再把质量数值当作密度。',
      '只用量筒测小石块排开的水量，再把体积数值当作密度。',
      '先把小石块放入量筒，再用天平直接测量石块和水的质量差。',
    ], answerIndex: 0,
    explanation: '密度测量需要分别得到物体质量和体积。天平测质量，量筒中水面升高的体积等于完全浸没且不吸水的小石块体积，再由ρ=m/V计算。测质量应在石块沾水前完成。',
    difficulty: 'MEDIUM', sourceRef: `${densitySource}#physics-8a-6-3-q1`,
  },
  'physics-8a-6-3-q2': {
    id: 'physics-8a-6-3-q2', type: 'fill_blank', knowledgePointId: 'measure_d', gradingMode: 'exact',
    prompt: '量筒中液体凹液面的最低处与36.0 mL刻度相平。该液体的体积为____ cm³。',
    correctAnswer: '36.0', acceptedAnswers: ['36.0', '36', '36.0cm³', '36.0 cm³', '36cm³', '36 cm³'],
    explanation: '1 mL=1 cm³，因此36.0 mL=36.0 cm³。读量筒时视线应与凹液面最低处相平。',
    difficulty: 'EASY', sourceRef: `${densitySource}#physics-8a-6-3-q2`,
  },
  'physics-8a-6-3-q3': {
    id: 'physics-8a-6-3-q3', type: 'single_choice', knowledgePointId: 'measure_d',
    prompt: '要测一个小长方体金属块的体积，金属块边长约为1～3 cm。除天平外，最直接且合适的体积测量方法是',
    options: ['用刻度尺测出长、宽、高，再求三者乘积。', '用弹簧测力计测出重力，再把读数当作体积。', '用温度计测出温度，再查表得到体积。', '用磁铁吸引金属块，以吸引强弱估计体积。'], answerIndex: 0,
    explanation: '长方体属于规则形状，可用刻度尺测量长、宽、高，并用V=长×宽×高求体积。测得质量后即可进一步由ρ=m/V求密度。',
    difficulty: 'MEDIUM', sourceRef: `${densitySource}#physics-8a-6-3-q3`,
  },
  'physics-8a-6-3-q4': {
    id: 'physics-8a-6-3-q4', type: 'fill_blank', knowledgePointId: 'measure_d', gradingMode: 'exact',
    prompt: '某合金块的测量质量为54.0 g、体积为20.0 cm³。按题给数据计算，其密度为____ g/cm³。',
    correctAnswer: '2.70', acceptedAnswers: ['2.70', '2.7', '2.70g/cm³', '2.70 g/cm³', '2.7g/cm³', '2.7 g/cm³'],
    explanation: 'ρ=m/V=54.0 g÷20.0 cm³=2.70 g/cm³。结果保留三位有效数字，与题给测量数据的位数一致。',
    difficulty: 'MEDIUM', sourceRef: `${densitySource}#physics-8a-6-3-q4`,
  },
  'physics-8a-6-3-q5': {
    id: 'physics-8a-6-3-q5', type: 'short_answer', knowledgePointId: 'measure_d', gradingMode: 'self_check',
    prompt: '测食用油密度时，烧杯和油的总质量为120.0 g。将一部分油倒入量筒，量筒中油的体积为40.0 mL；此时烧杯和剩余油的总质量为84.0 g。求倒入量筒的油的密度，写出测量思路和计算过程。',
    correctAnswer: '评分要点：①倒入量筒的油的质量m=120.0−84.0=36.0 g（1分）；②40.0 mL=40.0 cm³（1分）；③ρ=m/V=36.0 g÷40.0 cm³=0.900 g/cm³（1分）。',
    explanation: '用倒油前后烧杯与油的总质量之差求出倒入量筒的油的质量，量筒读数给出同一部分油的体积。计算得ρ=0.900 g/cm³。称量和读数精度按题给小数位处理。',
    difficulty: 'EXAM', sourceRef: `${densitySource}#physics-8a-6-3-q5`,
  },
  'physics-8a-6-3-q6': {
    id: 'physics-8a-6-3-q6', type: 'fill_blank', knowledgePointId: 'measure_d', gradingMode: 'exact',
    prompt: '量筒内水的初始读数为26.0 mL，完全浸没一块不吸水的小石块后，读数为42.5 mL。小石块体积为____ cm³。',
    correctAnswer: '16.5', acceptedAnswers: ['16.5', '16.5cm³', '16.5 cm³'],
    explanation: '小石块体积等于量筒内水面上升对应的体积：42.5−26.0=16.5 mL=16.5 cm³。前提是石块完全浸没且没有气泡附着。',
    difficulty: 'MEDIUM', sourceRef: `${densitySource}#physics-8a-6-3-q6`,
  },
  'physics-8a-6-3-q7': {
    id: 'physics-8a-6-3-q7', type: 'short_answer', knowledgePointId: 'measure_d', gradingMode: 'self_check',
    prompt: '测一块质量为26.0 g的固体密度时，量筒初始读数为20.0 mL。三次将固体完全浸没后的读数分别为31.0 mL、31.2 mL和30.8 mL。用三次体积测量的平均值求固体密度，并说明多次测量的作用。',
    correctAnswer: '评分要点：①三次体积分别为11.0 cm³、11.2 cm³、10.8 cm³，平均体积为11.0 cm³（1分）；②ρ=26.0 g÷11.0 cm³≈2.36 g/cm³（1分）；③多次测量取平均值可减小偶然误差（1分）。',
    explanation: '每次体积都要用末读数减去20.0 mL初读数。平均体积为(11.0+11.2+10.8)/3=11.0 cm³，密度约为2.36 g/cm³。多次测量能减小偶然误差，但不能消除系统误差。',
    difficulty: 'EXAM', sourceRef: `${densitySource}#physics-8a-6-3-q7`,
  },
  'physics-8a-6-3-q8': {
    id: 'physics-8a-6-3-q8', type: 'single_choice', knowledgePointId: 'measure_d',
    prompt: '同一种均匀材料制成两个实心小块。测得甲的质量为30 g、体积为10 cm³；乙的质量为15 g、体积为5 cm³。根据测量结果，下列判断正确的是',
    options: ['甲的密度是乙的2倍。', '乙的密度是甲的2倍。', '两块材料的密度相同，均为3 g/cm³。', '仅凭质量和体积不能计算密度。'], answerIndex: 2,
    explanation: '甲的密度为30/10=3 g/cm³，乙的密度为15/5=3 g/cm³。对同一种均匀材料，质量和体积同时改变而比值不变，不能因为物体质量不同就判断密度不同。',
    difficulty: 'MEDIUM', sourceRef: `${densitySource}#physics-8a-6-3-q8`,
  },
  'physics-8a-6-3-q9': {
    id: 'physics-8a-6-3-q9', type: 'short_answer', knowledgePointId: 'measure_d', gradingMode: 'self_check',
    prompt: '一块质量为9.6 g、会漂浮在水面且不吸水的小木块，不能直接用排水法测体积。实验中用细线把它与金属块一起完全浸没，量筒读数由40.0 mL升至68.0 mL；只将金属块完全浸没时，读数由40.0 mL升至56.0 mL。求木块的体积和密度，并说明体积如何从读数中得到及一项操作注意事项。',
    correctAnswer: '评分要点：①木块和金属块共同排开体积为28.0 cm³，金属块体积为16.0 cm³（1分）；②木块体积V=28.0−16.0=12.0 cm³（1分）；③ρ=9.6 g÷12.0 cm³=0.80 g/cm³（1分）；④测量时木块应完全浸没、细线尽量细且不能让物体碰到量筒壁（1分）。',
    explanation: '同一初始液面下，两次读数分别给出木块与金属块的总体积和金属块体积，二者相减得到木块体积12.0 cm³。再用ρ=m/V求得0.80 g/cm³。细线体积可忽略，且浸没过程不能有气泡或接触量筒壁。',
    difficulty: 'EXAM', sourceRef: `${densitySource}#physics-8a-6-3-q9`,
  },
  'physics-8a-6-3-q10': {
    id: 'physics-8a-6-3-q10', type: 'single_choice', knowledgePointId: 'measure_d',
    prompt: '用量筒读凹液面时，某同学的眼睛位置高于凹液面最低处。他记录的液体体积与真实值相比通常会',
    options: ['偏大。', '偏小。', '相等。', '仅凭眼睛位置无法判断。'], answerIndex: 0,
    explanation: '俯视量筒刻度时，视线与凹液面最低处不相平，读数通常偏大。规范读数应使视线与凹液面最低处相平。',
    difficulty: 'MEDIUM', sourceRef: `${densitySource}#physics-8a-6-3-q10`,
  },

  // 九年级全一册：第十七章欧姆定律 / 第3节电阻的测量（knowledgePointId: r_measure）
  'physics-9q-17-3-q1': {
    id: 'physics-9q-17-3-q1', type: 'single_choice', knowledgePointId: 'r_measure',
    prompt: '实验中用电压表测出定值电阻两端电压U，用电流表测出通过它的电流I。要由这两项测量求电阻Rx，应使用的关系式是',
    options: ['Rx=U/I。', 'Rx=UI。', 'Rx=I/U。', 'Rx=U+I。'], answerIndex: 0,
    explanation: '根据欧姆定律I=U/R，得到R=U/I。电压表测电阻两端电压，电流表测通过电阻的电流。',
    difficulty: 'EASY', sourceRef: `${resistanceSource}#physics-9q-17-3-q1`,
  },
  'physics-9q-17-3-q2': {
    id: 'physics-9q-17-3-q2', type: 'fill_blank', knowledgePointId: 'r_measure', gradingMode: 'exact',
    prompt: '伏安法测定值电阻时，闭合开关后调节滑动变阻器，可以改变电阻Rx两端的____和通过Rx的____，从而获得多组测量数据。',
    correctAnswer: '电压；电流', acceptedAnswers: ['电压；电流', '电压和电流', '电压，电流', '电压；电流值'],
    explanation: '滑动变阻器改变接入电路的电阻，从而调节电路中的电流及Rx两端的电压。对定值电阻进行多次测量，可以用多组数据求平均值以减小偶然误差。',
    difficulty: 'MEDIUM', sourceRef: `${resistanceSource}#physics-9q-17-3-q2`,
  },
  'physics-9q-17-3-q3': {
    id: 'physics-9q-17-3-q3', type: 'fill_blank', knowledgePointId: 'r_measure', gradingMode: 'exact',
    prompt: '测得某定值电阻两端电压为2.4 V，通过它的电流为0.30 A。按测量值计算，电阻为____ Ω。',
    correctAnswer: '8.0', acceptedAnswers: ['8.0', '8', '8.0Ω', '8.0 Ω', '8Ω', '8 Ω'],
    explanation: 'R=U/I=2.4 V÷0.30 A=8.0 Ω。电压单位V除以电流单位A得到电阻单位Ω，结果按题给数据保留两位有效数字。',
    difficulty: 'MEDIUM', sourceRef: `${resistanceSource}#physics-9q-17-3-q3`,
  },
  'physics-9q-17-3-q4': {
    id: 'physics-9q-17-3-q4', type: 'short_answer', knowledgePointId: 'r_measure', gradingMode: 'self_check',
    prompt: '小组用伏安法测同一只定值电阻，三次计算所得阻值为9.8 Ω、10.0 Ω和10.2 Ω。写出该电阻的测量结果，并说明为什么可以对这几次结果取平均值。',
    correctAnswer: '评分要点：①平均值(9.8+10.0+10.2)/3=10.0 Ω（1分）；②同一只定值电阻的阻值在实验条件基本不变时不随测量次数改变（1分）；③多次测量取平均值可减小偶然误差（1分）。',
    explanation: '三次测量值围绕10.0 Ω小幅波动，取平均值为10.0 Ω。对温度等条件基本不变的定值电阻，测量值的波动主要来自偶然误差；平均值有助于减小这类误差。',
    difficulty: 'EXAM', sourceRef: `${resistanceSource}#physics-9q-17-3-q4`,
  },
  'physics-9q-17-3-q5': {
    id: 'physics-9q-17-3-q5', type: 'single_choice', knowledgePointId: 'r_measure',
    prompt: '用伏安法测一只小灯泡时，记录到两组数据：U1=1.5 V、I1=0.30 A；U2=3.0 V、I2=0.50 A。由数据计算可知，两次灯丝电阻分别为5.0 Ω和6.0 Ω。对这一结果的解释最合理的是',
    options: ['灯丝温度升高后电阻增大，灯泡电阻会随工作状态变化。', '两次测量至少有一次必然错误，因为灯泡电阻恒定不变。', '灯丝电阻的变化说明欧姆定律不适用于金属导体。', '应把两次电阻值相加，作为灯泡唯一的电阻。'], answerIndex: 0,
    explanation: '灯泡工作电压较高时，灯丝温度升高，电阻通常增大。小灯泡的电阻不是在所有工作状态下都保持同一数值，因此应按对应的U、I讨论该状态下的电阻。',
    difficulty: 'EXAM', sourceRef: `${resistanceSource}#physics-9q-17-3-q5`,
  },
  'physics-9q-17-3-q6': {
    id: 'physics-9q-17-3-q6', type: 'fill_blank', knowledgePointId: 'r_measure', gradingMode: 'exact',
    prompt: '某定值电阻在2.0 V电压下通过的电流为0.20 A。忽略温度变化，若把它两端电压调至5.0 V，通过它的电流为____ A。',
    correctAnswer: '0.50', acceptedAnswers: ['0.50', '0.5', '0.50A', '0.50 A', '0.5A', '0.5 A'],
    explanation: '先由R=U/I=2.0 V/0.20 A=10 Ω求电阻。温度不变时定值电阻阻值不变，所以I=U/R=5.0 V/10 Ω=0.50 A。',
    difficulty: 'MEDIUM', sourceRef: `${resistanceSource}#physics-9q-17-3-q6`,
  },
  'physics-9q-17-3-q7': {
    id: 'physics-9q-17-3-q7', type: 'short_answer', knowledgePointId: 'r_measure', gradingMode: 'self_check',
    prompt: '用电源、开关、电流表、电压表、滑动变阻器和待测电阻Rx组成伏安法测电阻电路。用文字说明电流表、电压表和滑动变阻器应如何接入，并说明闭合开关前滑片应放在什么位置。',
    correctAnswer: '评分要点：①电流表与Rx、滑动变阻器串联（1分）；②电压表并联在Rx两端（1分）；③闭合开关前，应把滑动变阻器接入电路的阻值调到最大（1分）。',
    explanation: '电流表串联测量通过Rx的电流，电压表并联测量Rx两端电压。闭合开关前将滑动变阻器接入最大阻值，可限制初始电流，保护电路和仪表。',
    difficulty: 'EXAM', sourceRef: `${resistanceSource}#physics-9q-17-3-q7`,
  },
  'physics-9q-17-3-q8': {
    id: 'physics-9q-17-3-q8', type: 'single_choice', knowledgePointId: 'r_measure',
    prompt: '待测电阻约为10 Ω，实验电源为3 V。电流表有0～0.6 A和0～3 A两个量程，电压表有0～3 V和0～15 V两个量程。确认电路安全且读数不会超量程后，为减小读数相对误差，优先选择哪组量程？',
    options: ['电流表0～0.6 A，电压表0～3 V。', '电流表0～3 A，电压表0～15 V。', '电流表0～3 A，电压表0～3 V。', '电流表0～0.6 A，电压表0～15 V。'], answerIndex: 0,
    explanation: '电源为3 V，电压表0～3 V量程可正常测量且分度更细。待测电阻约10 Ω时，3 V下电流约0.3 A，小于0.6 A，因此可选电流表0～0.6 A量程以提高读数分辨率。',
    difficulty: 'EXAM', sourceRef: `${resistanceSource}#physics-9q-17-3-q8`,
  },
  'physics-9q-17-3-q9': {
    id: 'physics-9q-17-3-q9', type: 'single_choice', knowledgePointId: 'r_measure',
    prompt: '伏安法测电阻时，误将电压表串联在电路中、电流表并联在待测电阻两端。闭合开关后，最可能观察到的现象是',
    options: ['电压表示数接近电源电压，电流表示数很小。', '电压表和电流表都恰好显示待测电阻的额定值。', '电压表示数为零，电流表示数一定超过量程。', '电压表示数和电流表示数都与接法无关。'], answerIndex: 0,
    explanation: '电压表内阻很大，串联后电路电流很小，电压表两端分得的电压接近电源电压。电流表内阻很小，并联在待测电阻两端会使该支路近似短接，不能按正确方法测量Rx。',
    difficulty: 'EXAM', sourceRef: `${resistanceSource}#physics-9q-17-3-q9`,
  },
  'physics-9q-17-3-q10': {
    id: 'physics-9q-17-3-q10', type: 'short_answer', knowledgePointId: 'r_measure', gradingMode: 'self_check',
    prompt: '小组测量定值电阻，得到数据：U/V为0.5、1.0、1.5，I/A为0.05、0.10、0.15。若以U为纵轴、I为横轴作图，图像是一条过原点的直线。写出U与I的关系，并求图像斜率的数值及其代表的物理量。',
    correctAnswer: '评分要点：①在温度等条件不变时，U与I成正比（1分）；②斜率k=ΔU/ΔI=(1.0−0.5)/(0.10−0.05)=10 V/A（1分）；③斜率的数值等于该电阻的阻值，R=10 Ω（1分）。',
    explanation: '定值电阻在实验条件基本不变时满足U=IR。以U为纵轴、I为横轴，直线斜率k=ΔU/ΔI=R，计算得10 Ω。',
    difficulty: 'EXAM', sourceRef: `${resistanceSource}#physics-9q-17-3-q10`,
  },
}
