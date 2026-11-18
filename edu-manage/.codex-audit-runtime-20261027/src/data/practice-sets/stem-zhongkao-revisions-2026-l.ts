import type { PracticeQuestion } from '../parent-practice-bank'

const buoySource = '牧哲学堂原创拓展题/2026-10/河北中考导向/物理/八年级下册/第十章浮力/第1节浮力'
const leverSource = '牧哲学堂原创拓展题/2026-10/河北中考导向/物理/八年级下册/第十二章简单机械/第1节杠杆'
const inductionSource = '牧哲学堂原创拓展题/2026-10/河北中考导向/物理/九年级全一册/第二十章电与磁/第6节磁生电'

/** 河北中考导向原创改写：保留原题 ID 与知识点映射，补充实验、数据和迁移情境。 */
export const stemZhongkaoQuestionRevisions2026L: Record<string, Partial<PracticeQuestion>> = {
  // 八年级下册：第十章浮力 / 第1节浮力（knowledgePointId: buoy）
  'physics-8b-10-1-q1': {
    id: 'physics-8b-10-1-q1', type: 'single_choice', knowledgePointId: 'buoy',
    prompt: '一金属块用细线悬挂，静止浸没在水中且未接触容器。它在空气中测得重力为7.2 N，浸没时弹簧测力计示数为4.8 N。关于金属块受到的浮力，下列说法正确的是（ ）。',
    options: ['大小为2.4 N，方向竖直向上', '大小为4.8 N，方向竖直向上', '大小为7.2 N，方向竖直向下', '大小为12.0 N，方向竖直向上'], answerIndex: 0,
    explanation: '金属块静止时竖直方向受力平衡，测力计拉力和浮力之和等于重力。故F浮=G−F示=7.2 N−4.8 N=2.4 N，浮力方向竖直向上。',
    difficulty: 'MEDIUM', sourceRef: buoySource + '#physics-8b-10-1-q1',
  },
  'physics-8b-10-1-q2': {
    id: 'physics-8b-10-1-q2', type: 'multiple_choice', knowledgePointId: 'buoy',
    prompt: '同一物体始终完全浸没且不接触容器，先后放在同一种均匀液体的不同深度处，再放入密度更大的另一种液体。关于浮力，下列判断正确的有（ ）。',
    options: ['在同一种液体中改变深度，浮力大小不变。', '在同一种液体中改变物体朝向，浮力大小一定改变。', '换入密度更大的液体，物体排开液体的体积不变时，浮力变大。', '物体所受浮力始终等于它的重力。'], answerIndices: [0, 2],
    explanation: '完全浸没时，同一物体排开液体的体积不变；同种均匀液体的密度不变，因此深度和朝向改变不影响浮力。换入密度更大的液体时，F浮=ρ液gV排增大。悬挂物体的浮力一般不等于重力，只有漂浮或悬浮平衡时才相等。',
    difficulty: 'EXAM', sourceRef: buoySource + '#physics-8b-10-1-q2',
  },
  'physics-8b-10-1-q3': {
    id: 'physics-8b-10-1-q3', type: 'fill_blank', knowledgePointId: 'buoy', gradingMode: 'exact',
    prompt: '一块冰漂浮在盛有水的烧杯中，冰完全融化，烧杯始终未溢出。忽略温度变化，水面高度将____（选填“升高”“降低”或“不变”）。',
    correctAnswer: '不变', acceptedAnswers: ['不变'],
    explanation: '冰漂浮时受到的浮力等于重力，因此它排开水的重力等于冰的重力。冰融化后变成质量相同的水，融化所得水的体积恰好等于原来排开水的体积，所以水面高度不变。',
    difficulty: 'MEDIUM', sourceRef: buoySource + '#physics-8b-10-1-q3',
  },
  'physics-8b-10-1-q4': {
    id: 'physics-8b-10-1-q4', type: 'single_choice', knowledgePointId: 'buoy',
    prompt: '一物体体积为200 cm³，完全浸没在密度为0.80×10³ kg/m³的液体中，取g=10 N/kg。物体受到的浮力为（ ）。',
    options: ['0.16 N', '1.6 N', '2.0 N', '16 N'], answerIndex: 1,
    explanation: '完全浸没时V排=V=200 cm³=2.0×10⁻⁴ m³。由F浮=ρ液gV排，得F浮=0.80×10³ kg/m³×10 N/kg×2.0×10⁻⁴ m³=1.6 N。',
    difficulty: 'EXAM', sourceRef: buoySource + '#physics-8b-10-1-q4',
  },
  'physics-8b-10-1-q5': {
    id: 'physics-8b-10-1-q5', type: 'single_choice', knowledgePointId: 'buoy',
    prompt: '一块长方体浸没在水中，上、下表面均为水平面，面积为20 cm²。下表面受到的液体压强比上表面大500 Pa，侧面所受水平方向压力相互平衡。该长方体受到的浮力大小为（ ）。',
    options: ['0.10 N', '1.0 N', '10 N', '100 N'], answerIndex: 1,
    explanation: '浮力等于下、上表面压力差。面积S=20 cm²=2.0×10⁻³ m²，故F浮=(p下−p上)S=500 Pa×2.0×10⁻³ m²=1.0 N。',
    difficulty: 'EXAM', sourceRef: buoySource + '#physics-8b-10-1-q5',
  },
  'physics-8b-10-1-q6': {
    id: 'physics-8b-10-1-q6', type: 'fill_blank', knowledgePointId: 'buoy', gradingMode: 'exact',
    prompt: '一个质量为1.2 kg的木块静止漂浮在水面上，取g=10 N/kg。木块受到的浮力为____ N。',
    correctAnswer: '12', acceptedAnswers: ['12', '12N', '12 N'],
    explanation: '木块漂浮且静止，竖直方向受力平衡，浮力等于重力。G=mg=1.2 kg×10 N/kg=12 N，所以F浮=12 N。',
    difficulty: 'MEDIUM', sourceRef: buoySource + '#physics-8b-10-1-q6',
  },
  'physics-8b-10-1-q7': {
    id: 'physics-8b-10-1-q7', type: 'multiple_choice', knowledgePointId: 'buoy',
    prompt: '下列情形中，物体受到的浮力不为零的有（ ）。',
    options: ['气球静止在空气中。', '石块浸没在水中并由细线悬挂，未接触容器。', '桥墩底部与河床紧密接触，水不能进入底面。', '货船静止漂浮在水面上。'], answerIndices: [0, 1, 3],
    explanation: '气球受到空气对它的浮力；悬挂石块的上下表面存在液体压力差，受到浮力；漂浮货船也受到水的浮力。桥墩底面没有水，水不能对其底面向上施压，题设条件下不受浮力。',
    difficulty: 'EXAM', sourceRef: buoySource + '#physics-8b-10-1-q7',
  },
  'physics-8b-10-1-q8': {
    id: 'physics-8b-10-1-q8', type: 'single_choice', knowledgePointId: 'buoy',
    prompt: '同一木块分别静止漂浮在清水和盐水中。已知盐水密度大于清水密度，忽略液体温度变化。下列判断正确的是（ ）。',
    options: ['木块在盐水中受到的浮力较大，排开液体体积相同。', '木块在两种液体中受到的浮力相同，在盐水中排开液体的体积较小。', '木块在清水中受到的浮力较大，在盐水中浸得更深。', '两种液体中的浮力都为零，因为木块没有下沉。'], answerIndex: 1,
    explanation: '木块在两种液体中都漂浮且静止，浮力均等于同一木块的重力，所以浮力相同。由F浮=ρ液gV排可知，盐水密度较大时，所需排开液体的体积较小。',
    difficulty: 'EXAM', sourceRef: buoySource + '#physics-8b-10-1-q8',
  },
  'physics-8b-10-1-q9': {
    id: 'physics-8b-10-1-q9', type: 'short_answer', knowledgePointId: 'buoy', gradingMode: 'self_check',
    prompt: '同一物块在空气中测得重力为12 N，分别完全浸没在甲、乙两种液体中，弹簧测力计示数为8 N和6 N。物块均未接触容器，取g相同。求物块在两种液体中受到的浮力，并求甲、乙液体密度之比。',
    correctAnswer: '评分要点：①甲液体中F浮甲=12−8=4 N（1分）；②乙液体中F浮乙=12−6=6 N（1分）；③同一物块完全浸没时排开液体体积相同，由F浮=ρ液gV排，ρ甲∶ρ乙=4∶6=2∶3（2分）。',
    explanation: '称重法分别求得4 N和6 N。两次实验中物块相同且均完全浸没，因此g和V排相同，浮力之比等于液体密度之比，即2∶3。',
    difficulty: 'EXAM', sourceRef: buoySource + '#physics-8b-10-1-q9',
  },
  'physics-8b-10-1-q10': {
    id: 'physics-8b-10-1-q10', type: 'short_answer', knowledgePointId: 'buoy', gradingMode: 'self_check',
    prompt: '小组用弹簧测力计研究物体浸入水中的体积与浮力的关系。物体重3.0 N，浸入体积分别为0、20、40、60、80 cm³时，测力计示数依次为3.0、2.8、2.6、2.4、2.2 N。求后四种情况下的浮力，并据此预测浸入体积为100 cm³时的浮力；写出你使用的规律。',
    correctAnswer: '评分要点：①后四种情况下浮力依次为0.2 N、0.4 N、0.6 N、0.8 N（2分）；②同种液体中，在物体未完全浸没前，浮力随浸入体积增大而增大，表中每增加20 cm³浮力增加0.2 N（1分）；③浸入体积100 cm³时预测F浮=1.0 N（1分），前提是物体仍未完全浸没。',
    explanation: '每组数据用F浮=G−F示求得0.2、0.4、0.6、0.8 N。该数据段呈线性增长，增加20 cm³对应增加0.2 N，因此外推到100 cm³得1.0 N；预测需满足物体尚未完全浸没且液体、测量条件不变。',
    difficulty: 'EXAM', sourceRef: buoySource + '#physics-8b-10-1-q10',
  },

  // 八年级下册：第十二章简单机械 / 第1节杠杆（knowledgePointId: lever）
  'physics-8b-12-1-q1': {
    id: 'physics-8b-12-1-q1', type: 'single_choice', knowledgePointId: 'lever',
    prompt: '一根轻质水平杠杆绕固定支点O转动，支点两侧的竖直力使杠杆产生相反方向的转动趋势。动力为40 N，动力臂为0.30 m；阻力为60 N，阻力臂为0.20 m。此时杠杆（ ）。',
    options: ['可以平衡，因为动力与阻力大小不同但力与力臂的乘积相等。', '不能平衡，因为动力必须等于阻力。', '不能平衡，因为动力臂必须等于阻力臂。', '可以平衡，因为动力臂和阻力臂之和为0.50 m。'], answerIndex: 0,
    explanation: '动力与动力臂的乘积为40 N×0.30 m=12 N·m，阻力与阻力臂的乘积为60 N×0.20 m=12 N·m，且两力使杠杆转动的方向相反，符合杠杆平衡条件。',
    difficulty: 'MEDIUM', sourceRef: leverSource + '#physics-8b-12-1-q1',
  },
  'physics-8b-12-1-q2': {
    id: 'physics-8b-12-1-q2', type: 'fill_blank', knowledgePointId: 'lever', gradingMode: 'exact',
    prompt: '用一根轻质杠杆撬动重物，动力臂为0.40 m，阻力臂为0.12 m。杠杆水平平衡时，施加的动力为30 N，则可克服的阻力为____ N。',
    correctAnswer: '100', acceptedAnswers: ['100', '100N', '100 N'],
    explanation: '由F动l动=F阻l阻，F阻=30 N×0.40 m÷0.12 m=100 N。',
    difficulty: 'MEDIUM', sourceRef: leverSource + '#physics-8b-12-1-q2',
  },
  'physics-8b-12-1-q3': {
    id: 'physics-8b-12-1-q3', type: 'multiple_choice', knowledgePointId: 'lever',
    prompt: '检修人员用杠杆抬起一定的重物，支点位置和重物不变。若希望在杠杆平衡时所需动力更小，可采取的措施有（ ）。',
    options: ['在条件允许时增长动力臂。', '适当缩短阻力臂。', '在施力点不变时，让动力方向更接近垂直于杠杆。', '增大阻力而保持两力臂不变。'], answerIndices: [0, 1, 2],
    explanation: '杠杆平衡时F动=F阻l阻/l动。增长动力臂或缩短阻力臂都可减小所需动力；同一施力点处，动力越接近垂直于杠杆，力臂越大。增大阻力会使所需动力增大。',
    difficulty: 'EXAM', sourceRef: leverSource + '#physics-8b-12-1-q3',
  },
  'physics-8b-12-1-q4': {
    id: 'physics-8b-12-1-q4', type: 'short_answer', knowledgePointId: 'lever', gradingMode: 'self_check',
    prompt: '儿童跷跷板可看作轻质杠杆。甲同学重300 N，坐在距支点1.2 m处；乙同学重200 N。忽略杠杆自重，求乙同学坐在距支点多远处才能使跷跷板水平平衡。若甲随后向支点移动0.2 m，乙应坐在距支点多远处才能再次平衡？',
    correctAnswer: '评分要点：①初始平衡时300×1.2=200×l乙，l乙=1.8 m（1分）；②甲移动后距支点1.0 m，动力/阻力矩条件为300×1.0=200×l乙′（1分）；③l乙′=1.5 m（1分），方向在支点另一侧。',
    explanation: '两位同学位于支点两侧，重力使杠杆产生相反方向的转动趋势。分别用重力与其力臂的乘积相等求解：初始距离1.8 m，甲移动后乙的距离为1.5 m。',
    difficulty: 'EXAM', sourceRef: leverSource + '#physics-8b-12-1-q4',
  },
  'physics-8b-12-1-q5': {
    id: 'physics-8b-12-1-q5', type: 'single_choice', knowledgePointId: 'lever',
    prompt: '工人用开瓶器撬起紧扣瓶口的瓶盖。开瓶器手柄较长，主要是为了（ ）。',
    options: ['增大动力臂，在克服相同阻力时减小所需动力。', '增大阻力臂，使瓶盖受到的力变小。', '使支点移到瓶盖上方，从而不再需要动力。', '改变瓶盖重力的方向，使它竖直向上。'], answerIndex: 0,
    explanation: '开瓶器工作时可视为杠杆。手柄较长增大了手施力处到支点的垂直距离，即动力臂；在阻力和阻力臂一定时，所需动力减小。',
    difficulty: 'MEDIUM', sourceRef: leverSource + '#physics-8b-12-1-q5',
  },
  'physics-8b-12-1-q6': {
    id: 'physics-8b-12-1-q6', type: 'fill_blank', knowledgePointId: 'lever', gradingMode: 'exact',
    prompt: '用羊角锤拔钉子时，锤头弯钩压在木板上的接触处可作为杠杆的____。',
    correctAnswer: '支点', acceptedAnswers: ['支点'],
    explanation: '拔钉时，锤头弯钩与木板接触处相对木板保持支撑，锤子绕该处转动，因此该处是杠杆的支点。',
    difficulty: 'MEDIUM', sourceRef: leverSource + '#physics-8b-12-1-q6',
  },
  'physics-8b-12-1-q7': {
    id: 'physics-8b-12-1-q7', type: 'multiple_choice', knowledgePointId: 'lever',
    prompt: '忽略杠杆自重和摩擦，关于杠杆使用中的力与移动距离，下列说法正确的有（ ）。',
    options: ['杠杆平衡时，动力与动力臂的乘积等于阻力与阻力臂的乘积。', '增大动力臂后，在阻力和阻力臂不变时，平衡所需动力可以减小。', '使用杠杆省力时，一定同时省功。', '杠杆转过相同角度时，距支点较远的作用点移动距离较大。'], answerIndices: [0, 1, 3],
    explanation: 'A、B符合杠杆平衡条件；杠杆转过同一角度时，弧长与转动半径成正比，所以距支点较远处移动距离较大。理想杠杆只能省力或省距离，不能省功。',
    difficulty: 'EXAM', sourceRef: leverSource + '#physics-8b-12-1-q7',
  },
  'physics-8b-12-1-q8': {
    id: 'physics-8b-12-1-q8', type: 'short_answer', knowledgePointId: 'lever', gradingMode: 'self_check',
    prompt: '一杆秤可视为质量不计的杠杆，提纽为支点。秤钩上的物体距支点4 cm，质量为0.50 kg的秤砣位于支点另一侧16 cm处时，杆秤水平平衡。忽略秤砣以外的杆秤质量，求被称物体的质量。',
    correctAnswer: '评分要点：①设物体质量为m，由杠杆平衡条件mg×4 cm=0.50 kg×g×16 cm（1分）；②约去g并求得m=0.50×16÷4=2.0 kg（1分）。',
    explanation: '两侧重力均与g成正比。由m物g·l物=m砣g·l砣，g约去后，m物=0.50 kg×16 cm÷4 cm=2.0 kg。',
    difficulty: 'EXAM', sourceRef: leverSource + '#physics-8b-12-1-q8',
  },
  'physics-8b-12-1-q9': {
    id: 'physics-8b-12-1-q9', type: 'single_choice', knowledgePointId: 'lever',
    prompt: '用相同大小的力关门，手分别在距门轴0.10 m和0.80 m处垂直推门。忽略摩擦，与在0.10 m处施力相比，在0.80 m处施力时（ ）。',
    options: ['力臂增大为原来的8倍，转动效果增强。', '力臂减小为原来的1/8，转动效果减弱。', '力臂不变，因为两次施力大小相同。', '力臂为零，因为门轴是支点。'], answerIndex: 0,
    explanation: '两次力均垂直于门，力臂分别为0.10 m和0.80 m。第二次力臂是第一次的8倍，在施力大小相同时，动力与动力臂的乘积也增大为8倍。',
    difficulty: 'MEDIUM', sourceRef: leverSource + '#physics-8b-12-1-q9',
  },
  'physics-8b-12-1-q10': {
    id: 'physics-8b-12-1-q10', type: 'single_choice', knowledgePointId: 'lever',
    prompt: '一根杠杆绕O点转动，在B点斜向下施加动力F。判断该力对杠杆转动效果时，动力臂应取（ ）。',
    options: ['OB的长度。', '从O点到B点的水平距离。', '支点O到动力F作用线的垂直距离。', '动力F的作用点到杠杆另一端的距离。'], answerIndex: 2,
    explanation: '力臂是支点到力的作用线的垂直距离，不一定等于杠杆上支点到作用点的距离。动力方向倾斜时，应按垂线确定动力臂。',
    difficulty: 'MEDIUM', sourceRef: leverSource + '#physics-8b-12-1-q10',
  },

  // 九年级全一册：第二十章电与磁 / 第6节磁生电（knowledgePointId: generator）
  'physics-9q-20-6-q1': {
    id: 'physics-9q-20-6-q1', type: 'single_choice', knowledgePointId: 'generator',
    prompt: '闭合电路的一部分导体处在磁场中。下列操作中，不能使电路中产生感应电流的是（ ）。',
    options: ['导体沿垂直于磁感线的方向运动。', '磁体向闭合线圈靠近。', '闭合线圈绕与磁场垂直的轴转动。', '导体沿磁感线方向运动。'], answerIndex: 3,
    explanation: '产生感应电流需要闭合电路的一部分导体做切割磁感线运动，或线圈中的磁场情况发生变化。导体沿磁感线方向运动时没有切割磁感线，不能产生感应电流。',
    difficulty: 'MEDIUM', sourceRef: inductionSource + '#physics-9q-20-6-q1',
  },
  'physics-9q-20-6-q2': {
    id: 'physics-9q-20-6-q2', type: 'multiple_choice', knowledgePointId: 'generator',
    prompt: '下列操作中，能使电流表连接的闭合线圈中产生感应电流的有（ ）。',
    options: ['磁体静止，闭合线圈向磁体靠近。', '线圈处于开路状态，磁场中的导体棒切割磁感线。', '磁体与线圈相对静止，并一起做匀速直线运动。', '闭合线圈绕其平面内的直径转动，且转轴与磁场方向垂直。'], answerIndices: [0, 3],
    explanation: '线圈与磁体发生相对运动或线圈转动改变磁场穿过线圈的情况，都能在闭合线圈中产生感应电流。开路时即使导体切割磁感线，电路中也没有持续的感应电流；磁体与线圈相对位置和朝向均不变时，一起运动不改变穿过线圈的磁场情况。',
    difficulty: 'EXAM', sourceRef: inductionSource + '#physics-9q-20-6-q2',
  },
  'physics-9q-20-6-q3': {
    id: 'physics-9q-20-6-q3', type: 'fill_blank', knowledgePointId: 'generator', gradingMode: 'exact',
    prompt: '单线圈发电机线圈连续转动时，线圈每转过半周，切割磁感线的方向发生改变，线圈中的感应电流方向也随之____。',
    correctAnswer: '改变', acceptedAnswers: ['改变', '反向', '改变方向', '反向改变'],
    explanation: '线圈每转过半周，线圈边切割磁感线的方向反转，感应电流方向也反转，因此发电机输出交流电。',
    difficulty: 'MEDIUM', sourceRef: inductionSource + '#physics-9q-20-6-q3',
  },
  'physics-9q-20-6-q4': {
    id: 'physics-9q-20-6-q4', type: 'short_answer', knowledgePointId: 'generator', gradingMode: 'self_check',
    prompt: '某小组要探究感应电流的方向与导体运动方向、磁场方向是否有关。实验器材有蹄形磁体、导体棒、导轨、灵敏电流计和导线。请说明怎样安排对照实验，以及每次应观察什么。',
    correctAnswer: '评分要点：①将导体棒接入闭合回路并置于磁场中，先保持磁场方向不变，改变导体棒运动方向，观察电流计指针偏转方向（1分）；②再保持导体棒运动方向不变，交换磁体两极以改变磁场方向，观察指针偏转方向（1分）；③每组对照只改变一个因素，并记录指针偏转方向（1分）。',
    explanation: '闭合回路和导体位置等条件应保持不变。分别只反转运动方向或磁场方向，用电流计指针偏转方向判断感应电流方向，才能归因于相应变量。',
    difficulty: 'EXAM', sourceRef: inductionSource + '#physics-9q-20-6-q4',
  },
  'physics-9q-20-6-q5': {
    id: 'physics-9q-20-6-q5', type: 'single_choice', knowledgePointId: 'generator',
    prompt: '小组比较电动机和发电机的工作原理。下列说法正确的是（ ）。',
    options: ['电动机利用通电导体在磁场中受力，发电机利用电磁感应。', '电动机利用电磁感应，发电机利用通电导体在磁场中受力。', '两者都利用电磁感应，区别只在于线圈转速。', '两者都利用通电导体在磁场中受力，区别只在于电源电压。'], answerIndex: 0,
    explanation: '电动机把电能转化为机械能，工作原理是通电导体在磁场中受力；发电机通过电磁感应把机械能转化为电能。两者涉及的物理原理不同。',
    difficulty: 'MEDIUM', sourceRef: inductionSource + '#physics-9q-20-6-q5',
  },
  'physics-9q-20-6-q6': {
    id: 'physics-9q-20-6-q6', type: 'fill_blank', knowledgePointId: 'generator', gradingMode: 'exact',
    prompt: '实验室中的发电机模型通过线圈在磁场中转动，使穿过闭合线圈的磁场情况发生变化并产生感应电流。其工作依据是____现象。',
    correctAnswer: '电磁感应', acceptedAnswers: ['电磁感应'],
    explanation: '闭合线圈中的磁场情况发生变化时会产生感应电流，这种现象称为电磁感应，是发电机的工作原理。',
    difficulty: 'EASY', sourceRef: inductionSource + '#physics-9q-20-6-q6',
  },
  'physics-9q-20-6-q7': {
    id: 'physics-9q-20-6-q7', type: 'multiple_choice', knowledgePointId: 'generator',
    prompt: '在闭合电路中研究感应电流方向时，其他条件相同。下列操作能使感应电流方向反转的有（ ）。',
    options: ['只将导体的运动方向反向。', '只将磁场方向反向。', '同时将导体的运动方向和磁场方向反向。', '只加快导体运动速度。'], answerIndices: [0, 1],
    explanation: '感应电流方向与导体运动方向、磁场方向有关。只改变其中一个方向会使电流方向反转；两个方向同时反转时，方向不变。单纯加快运动速度主要改变感应电流大小，不改变方向。',
    difficulty: 'EXAM', sourceRef: inductionSource + '#physics-9q-20-6-q7',
  },
  'physics-9q-20-6-q8': {
    id: 'physics-9q-20-6-q8', type: 'single_choice', knowledgePointId: 'generator',
    prompt: '交流发电机模型中，线圈的两个引出端通过滑环和电刷与外电路相连。采用滑环的作用是（ ）。',
    options: ['使线圈始终受到同一方向的磁场力。', '使线圈转动时引出端与外电路保持电接触，并输出方向周期变化的电流。', '使线圈转动时电流方向始终不变。', '把电能直接转化为线圈的机械能。'], answerIndex: 1,
    explanation: '滑环与线圈两端相连并随线圈一起转动，电刷与外电路接触，使转动的线圈仍能向外供电。线圈切割磁感线方向周期性改变，输出电流方向也周期性改变。',
    difficulty: 'EXAM', sourceRef: inductionSource + '#physics-9q-20-6-q8',
  },
  'physics-9q-20-6-q9': {
    id: 'physics-9q-20-6-q9', type: 'single_choice', knowledgePointId: 'generator',
    prompt: '保持磁场方向和导体运动方向不变，使导体在磁场中运动得更快。关于感应电流，下列判断合理的是（ ）。',
    options: ['电流方向反转，大小不变。', '电流方向不变，大小可能增大。', '电流方向和大小都一定不变。', '一定不再产生感应电流。'], answerIndex: 1,
    explanation: '导体运动方向和磁场方向均未改变，所以感应电流方向不变。运动加快使导体切割磁感线更快，通常可使感应电流增大；中学实验结论中判断的是趋势，不要求给出定量关系。',
    difficulty: 'MEDIUM', sourceRef: inductionSource + '#physics-9q-20-6-q9',
  },
  'physics-9q-20-6-q10': {
    id: 'physics-9q-20-6-q10', type: 'short_answer', knowledgePointId: 'generator', gradingMode: 'self_check',
    prompt: '手摇发电机接入小灯泡，慢慢摇动时灯泡不亮，但灵敏电流计有微小偏转；加快摇动后灯泡发亮。说明这一现象，并写出发电机把什么能转化为什么能。',
    correctAnswer: '评分要点：①慢摇时仍有感应电流，但电流较小，灯泡的实际功率不足以明显发光（1分）；②加快线圈转动，导体切割磁感线更快，感应电流增大，灯泡发亮（1分）；③发电机将机械能转化为电能（1分）。',
    explanation: '电流计微小偏转说明慢摇时已产生感应电流，只是灯泡获得的电功率较小。加快线圈转动会增强切割磁感线的效果，电流增大，灯泡因而发亮。',
    difficulty: 'EXAM', sourceRef: inductionSource + '#physics-9q-20-6-q10',
  },
}
