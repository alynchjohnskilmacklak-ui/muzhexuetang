-- Add source traceability fields
ALTER TABLE "HighSchoolInfo" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "HighSchoolInfo" ADD COLUMN IF NOT EXISTS "sourceNote" TEXT;
ALTER TABLE "HighSchoolInfo" ADD COLUMN IF NOT EXISTS "infoVerifiedAt" TIMESTAMP(3);
ALTER TABLE "HighSchoolInfo" ADD COLUMN IF NOT EXISTS "infoConfidence" TEXT DEFAULT 'unknown';

-- ============================================
-- Update verified school info (based on public sources)
-- ============================================

-- 河北正定中学 (szjz1) — verified: creation year, addresses, type
UPDATE "HighSchoolInfo" SET
  "intro" = '河北正定中学创建于1902年，坐落于正定县，是具有百年办学历史的省级重点/示范性高中。校本部位于原清代贡院，东校区位于正定恒山东路。',
  "keyFeature" = '百年名校，正定本地龙头公办高中，本部与东校区双校区',
  "address" = '正定县府西街80号（校本部）/ 正定恒山东路190号（东校区）',
  "boardingAvail" = true,
  "tuitionFee" = '学费全免',
  "sourceNote" = '公开资料显示其创建于1902年，本部位于府西街80号，东校区位于恒山东路190号。河北正定中学≠河北正中实验中学，后者为民办。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'high'
WHERE "schoolId" = 'szjz1';

-- 辛集中学 (szjz2) — verified: address, founding year
UPDATE "HighSchoolInfo" SET
  "intro" = '河北辛集中学始建于1945年，位于辛集市辛中路1号，隶属石家庄市教育局，是全员寄宿制普通高中。',
  "keyFeature" = '老牌重点高中，全员寄宿',
  "address" = '辛集市辛中路1号',
  "boardingAvail" = true,
  "tuitionFee" = '学费全免',
  "sourceNote" = '公开资料显示学校位于辛集市辛中路1号，是全员寄宿制普通高中。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'high'
WHERE "schoolId" = 'szjz2';

-- 精英中学 (mb4) — verified: address on 高新区学苑路
UPDATE "HighSchoolInfo" SET
  "address" = '高新区学苑路25号',
  "sourceNote" = CASE WHEN "sourceNote" IS NULL THEN '公开资料显示地址为高新区学苑路25号。' ELSE "sourceNote" END,
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'high'
WHERE "schoolId" = 'mb4';

-- 二中实验学校 (mb1) — add source attribution
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '属石家庄二中体系（民办省示范），公开资料显示位于栾城区栾武路1号。升学率数据来源为往年公开报道，以学校公布为准。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'medium'
WHERE "schoolId" = 'mb1';

-- 河北正中实验中学 (mb2) — add source attribution, distinguish from 正定中学
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '河北正定中学举办的民办高中(东校区)，与正中本部分校区管理、师资共享。≠河北正定中学（公办本部）。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'medium'
WHERE "schoolId" = 'mb2';

-- 润德学校 (mb3) — mark as 二中体系, add source note
UPDATE "HighSchoolInfo" SET
  "intro" = CASE WHEN "intro" IS NULL OR "intro" = '' THEN '属石家庄二中体系（二中8校区中的"润德校区"），民办完全中学、寄宿制，注重综合素质培养。' ELSE "intro" END,
  "sourceNote" = '属石家庄二中体系相关民办/寄宿学校，具体升学数据未找到独立可靠来源。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'medium'
WHERE "schoolId" = 'mb3';

-- 一中实验学校 (mb5) — add source attribution
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '隶属石家庄一中教育集团（民办），2023年9月启用新校址高新区湘江道39号。石家庄一中实验学校≠石家庄一中本部（公办）。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'medium'
WHERE "schoolId" = 'mb5';

-- 河北联邦外国语学校 (mb6) — mark address as unverified
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '石家庄一中体系民办学校，外语特色。具体地址未找到独立可靠来源，location标记为"市区"。统招线540，门槛相对适中。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'low'
WHERE "schoolId" = 'mb6';

-- 敬业中学 (mb7) — add source attribution
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '敬业集团投资创办的民办寄宿学校，位于平山县两河乡。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'medium'
WHERE "schoolId" = 'mb7';

-- 金石高级中学 (mb8) — location note (registration vs physical address)
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '注册地登记为鹿泉，校址在石家庄市学府路177号。分数线表有"(鹿泉)"与"(其他县区)"两口径，新乐生用"其他县区"口径。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'medium'
WHERE "schoolId" = 'mb8';

-- 卓越中学东校区 (mb9) — distinguish from 西校区
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '卓越中学东校区，统招线624，与西校区(672)分别招生。≠卓越中学西校区。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'medium'
WHERE "schoolId" = 'mb9';

-- 卓越中学西校区 (mb10) — distinguish from 东校区
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '卓越中学西校区，统招线672，与东校区(624)分别招生。≠卓越中学东校区。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'medium'
WHERE "schoolId" = 'mb10';

-- 精英新华中学 (mb11) — add source attribution
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '精英教育集团成员校，前身石家庄市新华中学(2014)，2022年更名。2023年高考数据来自公开报道，以学校公布为准。≠精英中学。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'medium'
WHERE "schoolId" = 'mb11';

-- 新乐一中 (xl1) — add source attribution with phone
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '公开资料显示新乐一中始建于1956年，地址新兴路249号，电话0311-87572270。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'high'
WHERE "schoolId" = 'xl1';

-- 私立第一中学 (sup01) — verified: address, founding year, website
UPDATE "HighSchoolInfo" SET
  "intro" = '石家庄私立第一中学始建于1995年，位于石家庄高新区，是全日制寄宿学校。',
  "keyFeature" = '民办寄宿制学校',
  "address" = '石家庄市裕华区天山大街155号',
  "boardingAvail" = true,
  "tuitionFee" = '民办（以学校公布为准）',
  "website" = 'www.slyz.net',
  "sourceNote" = '公开资料显示学校位于天山大街155号，始建于1995年，为全日制寄宿学校。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'high'
WHERE "schoolId" = 'sup01';

-- 行唐启明中学 (mb12) — mark as unverified
UPDATE "HighSchoolInfo" SET
  "sourceNote" = '行唐县民办高中，详细简介、升学数据未找到可靠来源。',
  "infoVerifiedAt" = NOW(),
  "infoConfidence" = 'unknown'
WHERE "schoolId" = 'mb12';
