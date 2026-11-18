-- Add xinleAccessibleOverride for manual override of auto-detection
ALTER TABLE "HighSchoolInfo" ADD COLUMN IF NOT EXISTS "xinleAccessibleOverride" BOOLEAN;

-- ============================================
-- Update school info (scores + location + intro/features)
-- ============================================

-- === 新乐本地 ===
UPDATE "HighSchoolInfo" SET
  "name" = '新乐一中',
  "yiTong" = 725, "tongZhao" = 678,
  "intro" = '始建于1956年，前身长寿中学，1978年成为河北省重点中学，2001年命名为河北省示范性高中。跨东西两校区，集初高中于一体，在校学生约5900人，高考升学率在石家庄市同类学校中长期领先。',
  "keyFeature" = '新乐本地龙头公办省示范，"五环节课堂"',
  "gaokaoRate" = '本科升学率约90%+（以学校公布为准）',
  "tuitionFee" = '学费全免',
  "boardingAvail" = true,
  "address" = '新乐市新兴路249号',
  "phone" = '0311-87572270'
WHERE "schoolId" = 'xl1';

UPDATE "HighSchoolInfo" SET
  "name" = '新乐二中',
  "yiTong" = NULL, "tongZhao" = 624,
  "intro" = '新乐本地公办高中。',
  "tuitionFee" = '学费全免'
WHERE "schoolId" = 'xl2';

UPDATE "HighSchoolInfo" SET
  "name" = '新乐三中',
  "yiTong" = NULL, "tongZhao" = 489,
  "intro" = '创办于1985年，是新乐市集普通高中教育与美术特色教育于一体的综合性高中，以美术特色闻名石家庄。',
  "keyFeature" = '美术特色综合高中',
  "tuitionFee" = '学费全免'
WHERE "schoolId" = 'xl3';

UPDATE "HighSchoolInfo" SET
  "name" = '新乐四中',
  "yiTong" = NULL, "tongZhao" = 583,
  "intro" = '创办于1958年的新乐本地中学。',
  "tuitionFee" = '学费全免'
WHERE "schoolId" = 'xl4';

UPDATE "HighSchoolInfo" SET
  "name" = '新伏羲中学',
  "yiTong" = NULL, "tongZhao" = 660,
  "intro" = '新乐市民办高中，硬件设施较新、配备现代化教学设备。',
  "location" = '新乐',
  "type" = '民办',
  "boardingAvail" = true
WHERE "schoolId" = 'xl5';

-- === 省示范公办（修正 location 错误） ===
UPDATE "HighSchoolInfo" SET
  "name" = '正定中学',
  "yiTong" = NULL, "tongZhao" = 760,
  "location" = '正定',
  "intro" = '直属石家庄市教育局的省级示范性高中，坐落于国家历史文化名城正定，分本部与东校区两校区，在校师生7000余人。近现代发展逾120年，办学成绩长期领跑石家庄市，多次评为中国百强中学。',
  "keyFeature" = '全省顶尖公办高中，本部为原清代贡院旧址',
  "gaokaoRate" = '985/211上线率高，历年多出省市状元（以学校公布为准）',
  "tuitionFee" = '学费全免',
  "boardingAvail" = true,
  "address" = '正定县府西街80号（本部）/ 恒山东路190号（东校区）'
WHERE "schoolId" = 'szjz1';

UPDATE "HighSchoolInfo" SET
  "name" = '辛集中学',
  "yiTong" = NULL, "tongZhao" = 725,
  "location" = '辛集',
  "intro" = '始建于1945年，前身晋察冀边区第六中学，1962年定为河北省重点中学、1978年定为全国重点中学，省级示范性高中。全员寄宿制，从石家庄17县市区招生，被誉为"华北平原上一颗明珠"。',
  "keyFeature" = '驻县老牌全国重点，全员寄宿',
  "gaokaoRate" = '本一率高，珍珠班本一率近100%（以学校公布为准）',
  "tuitionFee" = '学费全免',
  "boardingAvail" = true,
  "address" = '辛集市辛中路1号'
WHERE "schoolId" = 'szjz2';

-- 石家庄实验中学 — location 改为无极（前身无极师范，不在市区）
UPDATE "HighSchoolInfo" SET
  "name" = '石家庄实验中学',
  "yiTong" = 761, "tongZhao" = 759,
  "location" = '无极',
  "intro" = '石家庄市教育局直属省级示范性高中，1979年建校，前身河北无极师范学校，2003年转型为普通高中并启用现名。坐落于无极县，占地165亩，约48个教学班、在校生2100余人。',
  "keyFeature" = '驻县直属公办省示范',
  "tuitionFee" = '学费全免',
  "boardingAvail" = true,
  "address" = '无极县'
WHERE "schoolId" = 'szjz3';

-- 石家庄第二实验中学 — location 改为元氏（前身元氏师范，不在市区）
UPDATE "HighSchoolInfo" SET
  "name" = '石家庄第二实验中学',
  "yiTong" = 752, "tongZhao" = 746,
  "location" = '元氏',
  "intro" = '石家庄市教育局直属省级示范性高中，位于元氏县城，前身元氏师范，2011年改制为普通高中。石家庄市艺术特色学校，距石家庄市区南约25公里。',
  "keyFeature" = '驻县直属公办省示范，艺术特色',
  "tuitionFee" = '学费全免',
  "boardingAvail" = true,
  "address" = '元氏县人民路228号'
WHERE "schoolId" = 'szjz4';

-- === 民办(其他县区) — 分配相关 ===
UPDATE "HighSchoolInfo" SET
  "name" = '二中实验学校',
  "yiTong" = 763, "tongZhao" = 750,
  "location" = '栾城',
  "intro" = '石家庄二中举办的民办省级示范性普通高中，2004年创办，位于栾城区，占地600余亩，寄宿制管理。高考成绩多年保持全省领先。',
  "keyFeature" = '二中体系民办，硬件一流',
  "gaokaoRate" = '2018年应届本一率约97.8%，600分以上占比高（以学校公布为准）',
  "tuitionFee" = '民办（以学校公布为准）',
  "boardingAvail" = true,
  "address" = '栾城区栾武路1号'
WHERE "schoolId" = 'mb1';

UPDATE "HighSchoolInfo" SET
  "name" = '河北正中实验中学',
  "yiTong" = 755, "tongZhao" = 746,
  "location" = '正定',
  "intro" = '河北正定中学举办的民办省级示范性高中，即正定中学东校区，与正中本部分校区管理、师资共享、统一教学安排，两校区相距不足2公里。位于正定古城东，毗邻隆兴寺，紧邻京广高速正定出口，占地约313亩，可容纳约5000名学生。',
  "keyFeature" = '正定中学体系民办，与本部师资共享',
  "gaokaoRate" = '依托正中教学体系，成绩优异（以学校公布为准）',
  "tuitionFee" = '民办（以学校公布为准）',
  "boardingAvail" = true,
  "address" = '正定县（恒山路，正定中学东校区）'
WHERE "schoolId" = 'mb2';

UPDATE "HighSchoolInfo" SET
  "name" = '润德学校',
  "yiTong" = 759, "tongZhao" = 752,
  "location" = '市区',
  "intro" = '属石家庄二中体系（二中8校区中的"润德校区"），民办完全中学、寄宿制，注重综合素质培养。',
  "keyFeature" = '石家庄二中体系民办',
  "boardingAvail" = true
WHERE "schoolId" = 'mb3';

UPDATE "HighSchoolInfo" SET
  "name" = '精英中学',
  "yiTong" = 775, "tongZhao" = 743,
  "location" = '高新区',
  "intro" = '1993年由翟志海创办的全寄宿制民办完全中学，2003年评为河北省示范性高中。2010年起原衡水中学校长李金池主政，以"激情教育、高效课堂(6+1)、精细管理"著称，多次获"清华大学生源中学"。面向全省招生，多数为石家庄生源。',
  "keyFeature" = '民办名校，李金池主政，6+1高效课堂',
  "gaokaoRate" = '本一上线率曾达90%+（以学校公布为准）',
  "tuitionFee" = '民办，约19500元/学期（按中考成绩有优惠，以学校公布为准）',
  "boardingAvail" = true,
  "address" = '高新区学苑路25号'
WHERE "schoolId" = 'mb4';

UPDATE "HighSchoolInfo" SET
  "name" = '一中实验学校',
  "yiTong" = 744, "tongZhao" = 741,
  "location" = '高新区',
  "intro" = '隶属石家庄一中教育集团，创建于2014年7月，全寄宿制完全中学。2023年9月启用新校址（高新区湘江道39号），占地约158亩。校训"上善若水，厚德载物"，曾获"全国百强中学""全国德育工作先进单位"等称号。',
  "keyFeature" = '石家庄一中体系民办，全寄宿',
  "tuitionFee" = '民办，往年约1.43万元/年（以学校公布为准）',
  "boardingAvail" = true,
  "address" = '高新区湘江道39号'
WHERE "schoolId" = 'mb5';

UPDATE "HighSchoolInfo" SET
  "name" = '河北联邦外国语学校',
  "yiTong" = 713, "tongZhao" = 540,
  "location" = '市区',
  "intro" = '石家庄一中体系民办学校，由教育专家田运隆领衔，全寄宿、24小时精细化管理，外语为特色。秉承"上善若水，厚德载物"理念。统招线相对较低，门槛适中。',
  "keyFeature" = '外语特色，石家庄一中体系',
  "gaokaoRate" = '2020届本科上线229/294人（以学校公布为准）',
  "tuitionFee" = '民办（以学校公布为准）',
  "boardingAvail" = true
WHERE "schoolId" = 'mb6';

UPDATE "HighSchoolInfo" SET
  "name" = '敬业中学',
  "yiTong" = 732, "tongZhao" = 698,
  "location" = '平山',
  "intro" = '敬业集团投资创办的全日制十二年一贯制民办寄宿学校，位于平山县两河乡滹沱河北岸，距平山县城3公里、距石家庄约40分钟车程。东西两校区共占地262亩，在校生2200余人。',
  "keyFeature" = '花园式校园，十二年一贯制',
  "tuitionFee" = '民办（以学校公布为准）',
  "boardingAvail" = true,
  "address" = '平山县两河乡'
WHERE "schoolId" = 'mb7';

UPDATE "HighSchoolInfo" SET
  "name" = '金石高级中学',
  "yiTong" = 666, "tongZhao" = 608,
  "location" = '鹿泉',
  "intro" = '经石家庄市教育局批准的全日制民办高级中学，校址石家庄市学府路177号，占地约150-160亩，可容纳5000余人。书记光树平为原石家庄二中南校区副校长，办学理念"学生好，一切都好"。',
  "keyFeature" = '二中系管理团队，养成教育',
  "tuitionFee" = '民办（以学校公布为准）',
  "boardingAvail" = true,
  "address" = '石家庄市学府路177号'
WHERE "schoolId" = 'mb8';

UPDATE "HighSchoolInfo" SET
  "name" = '卓越中学东校区',
  "yiTong" = 663, "tongZhao" = 624,
  "location" = '鹿泉',
  "intro" = '2017年成立、集初高中于一体的全封闭寄宿制民办学校，2024年评为省级示范性高中。秉承"以学生全面发展为本"，主打"365生本课堂"，在校生4000余人。',
  "keyFeature" = '全封闭寄宿，365生本课堂',
  "tuitionFee" = '民办（以学校公布为准）',
  "boardingAvail" = true,
  "address" = '红旗大街南端学院路2号一带'
WHERE "schoolId" = 'mb9';

UPDATE "HighSchoolInfo" SET
  "name" = '卓越中学西校区',
  "yiTong" = 717, "tongZhao" = 672,
  "location" = '鹿泉',
  "intro" = '2017年成立、集初高中于一体的全封闭寄宿制民办学校，2024年评为省级示范性高中。',
  "keyFeature" = '全封闭寄宿，365生本课堂',
  "tuitionFee" = '民办（以学校公布为准）',
  "boardingAvail" = true,
  "address" = '鹿泉区永红路93号'
WHERE "schoolId" = 'mb10';

UPDATE "HighSchoolInfo" SET
  "name" = '精英新华中学',
  "yiTong" = 735, "tongZhao" = 695,
  "location" = '鹿泉',
  "intro" = '精英教育集团成员校，省级示范性高中，前身石家庄市新华中学（2014年创办），2022年更名加入精英集团。寄宿走读双轨并行的民办完全中学，高中部新校区2021年9月启用，位于鹿泉区铜冶镇。',
  "keyFeature" = '精英教育集团成员，"全优化"管理',
  "gaokaoRate" = '2023年高考纯文化应届本科上线率约92.35%、强基率约52%（以学校公布为准）',
  "tuitionFee" = '民办（以学校公布为准）',
  "boardingAvail" = true,
  "address" = '鹿泉区铜冶镇莲荣路9号'
WHERE "schoolId" = 'mb11';

UPDATE "HighSchoolInfo" SET
  "name" = '行唐启明中学',
  "yiTong" = 699, "tongZhao" = 674,
  "location" = '行唐',
  "intro" = '行唐县民办高中。',
  "boardingAvail" = true
WHERE "schoolId" = 'mb12';

-- ============================================
-- Insert supplemental 民办 schools (xinle accessible, no allocation quota)
-- ============================================

INSERT INTO "HighSchoolInfo" ("id", "schoolId", "name", "fullName", "type", "location", "tongZhao", "xinleAccessible", "xinleAccessibleOverride", "boardingAvail", "acceptsOtherCounty", "updatedAt") VALUES
(gen_random_uuid(), 'sup01', '私立第一中学', '私立第一中学(其他县区)', '民办', '市区', 710, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup02', '新世纪外国语学校', '新世纪外国语学校(其他县区)', '民办', '市区', 700, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup03', '西山学校', '西山学校(其他县区)', '民办', '市区', 718, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup04', '瀚林学校', '瀚林学校(其他县区)', '民办', '市区', 695, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup05', '华西高级中学', '华西高级中学(其他县区)', '民办', '市区', 666, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup06', '耀华中学', '耀华中学(其他县区)', '民办', '市区', 632, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup07', '华英外国语学校', '华英外国语学校(其他县区)', '民办', '市区', 630, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup08', '精英未来高级中学', '精英未来高级中学(其他县区)', '民办', '市区', 662, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup09', '弘文中学', '弘文中学(其他县区)', '民办', '市区', 593, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup10', '习德高级中学', '习德高级中学(其他县区)', '民办', '市区', 560, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup11', '高新区国杰学校', '高新区国杰学校(其他县区)', '民办', '市区', 547, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup12', '高新区精英中学', '高新区精英中学(其他县区)', '民办', '市区', 547, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup13', '新星学校', '新星学校(其他县区)', '民办', '市区', 544, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup14', '创新天卉学校', '创新天卉学校(其他县区)', '民办', '市区', 541, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup15', '同文中学', '同文中学(其他县区)', '民办', '市区', 540, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup16', '河北外国语学院附中', '河北外国语学院附中(其他县区)', '民办', '市区', 540, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup17', '云臻实验高级中学', '云臻实验高级中学(其他县区)', '民办', '市区', 591, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup18', '龙凤中学', '龙凤中学(其他县区)', '民办', '市区', 507, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup19', '无极县文苑中学', '无极县文苑中学(其他县区)', '民办', '无极县', 504, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup20', '新伏羲中学', '新伏羲中学(其他县区)', '民办', '市区', 474, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup21', '鹿鸣高级中学', '鹿鸣高级中学(其他县区)', '民办', '市区', 471, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup22', '润文高级中学', '润文高级中学(其他县区)', '民办', '市区', 467, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup23', '云臻高级中学', '云臻高级中学(其他县区)', '民办', '市区', 466, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup24', '同济中学', '同济中学(其他县区)', '民办', '市区', 458, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup25', '正泽高级中学', '正泽高级中学(其他县区)', '民办', '市区', 451, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup26', '行唐县龙州中学', '行唐县龙州中学(其他县区)', '民办', '行唐县', 423, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup27', '麒麟私立中学', '麒麟私立中学(其他县区)', '民办', '市区', 422, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup28', '自立高级中学', '自立高级中学(其他县区)', '民办', '市区', 422, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup29', '行唐县曙光中学', '行唐县曙光中学(其他县区)', '民办', '行唐县', 420, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup30', '藁城区府兴中学', '藁城区府兴中学(其他县区)', '民办', '藁城区', 524, true, true, false, false, NOW()),
(gen_random_uuid(), 'sup31', '藁城区新冀明中学', '藁城区新冀明中学(其他县区)', '民办', '藁城区', 421, true, true, false, false, NOW())
ON CONFLICT ("schoolId") DO NOTHING;
