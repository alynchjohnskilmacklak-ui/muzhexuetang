-- ============================================
-- 牧哲学堂 志愿学校数据修复脚本 (初中库 muzhe_chuzhong)
-- 1) 删除144所旧master数据  2) 给109所补2025分数线+学费
-- 执行前务必已备份! 
-- ============================================

BEGIN;

-- 步骤1: 删除旧的 master-2025 数据(144所),只保留 hs 开头的109所
DELETE FROM "HighSchoolInfo" WHERE "schoolId" NOT LIKE 'hs%';

-- 步骤2: 给可报名/不可报名学校补 2025 统招线 + 民办学费
UPDATE "HighSchoolInfo" SET "tongZhao"=760 WHERE "schoolId"='hs001';
UPDATE "HighSchoolInfo" SET "tongZhao"=759 WHERE "schoolId"='hs002';
UPDATE "HighSchoolInfo" SET "tongZhao"=746 WHERE "schoolId"='hs003';
UPDATE "HighSchoolInfo" SET "tongZhao"=743 WHERE "schoolId"='hs004';
UPDATE "HighSchoolInfo" SET "tongZhao"=750, "tuitionFee"='29500元/宿' WHERE "schoolId"='hs005';
UPDATE "HighSchoolInfo" SET "tongZhao"=743, "tuitionFee"='42900元/宿' WHERE "schoolId"='hs006';
UPDATE "HighSchoolInfo" SET "tongZhao"=752, "tuitionFee"='36000元' WHERE "schoolId"='hs007';
UPDATE "HighSchoolInfo" SET "tongZhao"=746, "tuitionFee"='21970元' WHERE "schoolId"='hs008';
UPDATE "HighSchoolInfo" SET "tongZhao"=741, "tuitionFee"='26000元' WHERE "schoolId"='hs009';
UPDATE "HighSchoolInfo" SET "tongZhao"=698, "tuitionFee"='18800元' WHERE "schoolId"='hs010';
UPDATE "HighSchoolInfo" SET "tongZhao"=674, "tuitionFee"='14000元' WHERE "schoolId"='hs011';
UPDATE "HighSchoolInfo" SET "tongZhao"=639, "tuitionFee"='28000元' WHERE "schoolId"='hs012';
UPDATE "HighSchoolInfo" SET "tongZhao"=672, "tuitionFee"='28000元' WHERE "schoolId"='hs013';
UPDATE "HighSchoolInfo" SET "tongZhao"=624, "tuitionFee"='28000元' WHERE "schoolId"='hs014';
UPDATE "HighSchoolInfo" SET "tongZhao"=608, "tuitionFee"='28000元' WHERE "schoolId"='hs015';
UPDATE "HighSchoolInfo" SET "tongZhao"=540, "tuitionFee"='31000元' WHERE "schoolId"='hs016';
UPDATE "HighSchoolInfo" SET "tongZhao"=678 WHERE "schoolId"='hs017';
UPDATE "HighSchoolInfo" SET "tongZhao"=624 WHERE "schoolId"='hs018';
UPDATE "HighSchoolInfo" SET "tongZhao"=489 WHERE "schoolId"='hs019';
UPDATE "HighSchoolInfo" SET "tongZhao"=583 WHERE "schoolId"='hs020';
UPDATE "HighSchoolInfo" SET "tongZhao"=700, "tuitionFee"='26600元' WHERE "schoolId"='hs021';
UPDATE "HighSchoolInfo" SET "tongZhao"=718, "tuitionFee"='26500元' WHERE "schoolId"='hs022';
UPDATE "HighSchoolInfo" SET "tongZhao"=710, "tuitionFee"='28000元' WHERE "schoolId"='hs023';
UPDATE "HighSchoolInfo" SET "tuitionFee"='36000元' WHERE "schoolId"='hs024';
UPDATE "HighSchoolInfo" SET "tongZhao"=695, "tuitionFee"='40000元/宿' WHERE "schoolId"='hs025';
UPDATE "HighSchoolInfo" SET "tongZhao"=662, "tuitionFee"='29000元' WHERE "schoolId"='hs026';
UPDATE "HighSchoolInfo" SET "tongZhao"=666, "tuitionFee"='13450元' WHERE "schoolId"='hs028';
UPDATE "HighSchoolInfo" SET "tongZhao"=630, "tuitionFee"='6500元' WHERE "schoolId"='hs029';
UPDATE "HighSchoolInfo" SET "tongZhao"=632, "tuitionFee"='8450元' WHERE "schoolId"='hs030';
UPDATE "HighSchoolInfo" SET "tongZhao"=591, "tuitionFee"='36000元' WHERE "schoolId"='hs031';
UPDATE "HighSchoolInfo" SET "tongZhao"=504, "tuitionFee"='21000元' WHERE "schoolId"='hs032';
UPDATE "HighSchoolInfo" SET "tongZhao"=593, "tuitionFee"='18000元/宿' WHERE "schoolId"='hs033';
UPDATE "HighSchoolInfo" SET "tongZhao"=540 WHERE "schoolId"='hs034';
UPDATE "HighSchoolInfo" SET "tongZhao"=547 WHERE "schoolId"='hs035';
UPDATE "HighSchoolInfo" SET "tuitionFee"='28000元' WHERE "schoolId"='hs036';
UPDATE "HighSchoolInfo" SET "tongZhao"=560, "tuitionFee"='28000元' WHERE "schoolId"='hs037';
UPDATE "HighSchoolInfo" SET "tongZhao"=466, "tuitionFee"='28000元' WHERE "schoolId"='hs038';
UPDATE "HighSchoolInfo" SET "tongZhao"=451, "tuitionFee"='15400元' WHERE "schoolId"='hs039';
UPDATE "HighSchoolInfo" SET "tongZhao"=474 WHERE "schoolId"='hs040';
UPDATE "HighSchoolInfo" SET "tongZhao"=544, "tuitionFee"='24350元' WHERE "schoolId"='hs041';
UPDATE "HighSchoolInfo" SET "tongZhao"=541, "tuitionFee"='29500元' WHERE "schoolId"='hs042';
UPDATE "HighSchoolInfo" SET "tongZhao"=540, "tuitionFee"='18000元' WHERE "schoolId"='hs043';
UPDATE "HighSchoolInfo" SET "tongZhao"=547, "tuitionFee"='24800元' WHERE "schoolId"='hs044';
UPDATE "HighSchoolInfo" SET "tongZhao"=540, "tuitionFee"='29800元' WHERE "schoolId"='hs045';
UPDATE "HighSchoolInfo" SET "tongZhao"=422, "tuitionFee"='26000元' WHERE "schoolId"='hs046';
UPDATE "HighSchoolInfo" SET "tongZhao"=467, "tuitionFee"='30000元' WHERE "schoolId"='hs047';
UPDATE "HighSchoolInfo" SET "tongZhao"=421 WHERE "schoolId"='hs048';
UPDATE "HighSchoolInfo" SET "tongZhao"=524, "tuitionFee"='15000元' WHERE "schoolId"='hs049';
UPDATE "HighSchoolInfo" SET "tongZhao"=458, "tuitionFee"='15200元/宿' WHERE "schoolId"='hs050';
UPDATE "HighSchoolInfo" SET "tongZhao"=423, "tuitionFee"='14950元' WHERE "schoolId"='hs051';
UPDATE "HighSchoolInfo" SET "tongZhao"=420, "tuitionFee"='14600元/宿' WHERE "schoolId"='hs052';
UPDATE "HighSchoolInfo" SET "tongZhao"=507, "tuitionFee"='16000元' WHERE "schoolId"='hs053';
UPDATE "HighSchoolInfo" SET "tongZhao"=709 WHERE "schoolId"='hs056';
UPDATE "HighSchoolInfo" SET "tongZhao"=687 WHERE "schoolId"='hs057';
UPDATE "HighSchoolInfo" SET "tongZhao"=668 WHERE "schoolId"='hs058';
UPDATE "HighSchoolInfo" SET "tongZhao"=607 WHERE "schoolId"='hs059';
UPDATE "HighSchoolInfo" SET "tongZhao"=689 WHERE "schoolId"='hs060';
UPDATE "HighSchoolInfo" SET "tongZhao"=651 WHERE "schoolId"='hs061';
UPDATE "HighSchoolInfo" SET "tongZhao"=678 WHERE "schoolId"='hs062';
UPDATE "HighSchoolInfo" SET "tongZhao"=666 WHERE "schoolId"='hs063';
UPDATE "HighSchoolInfo" SET "tongZhao"=575 WHERE "schoolId"='hs064';
UPDATE "HighSchoolInfo" SET "tongZhao"=683 WHERE "schoolId"='hs065';
UPDATE "HighSchoolInfo" SET "tongZhao"=633 WHERE "schoolId"='hs066';
UPDATE "HighSchoolInfo" SET "tongZhao"=657 WHERE "schoolId"='hs067';
UPDATE "HighSchoolInfo" SET "tongZhao"=638 WHERE "schoolId"='hs068';
UPDATE "HighSchoolInfo" SET "tongZhao"=609 WHERE "schoolId"='hs069';
UPDATE "HighSchoolInfo" SET "tongZhao"=574 WHERE "schoolId"='hs070';
UPDATE "HighSchoolInfo" SET "tongZhao"=606 WHERE "schoolId"='hs071';
UPDATE "HighSchoolInfo" SET "tongZhao"=571 WHERE "schoolId"='hs072';
UPDATE "HighSchoolInfo" SET "tongZhao"=540 WHERE "schoolId"='hs073';
UPDATE "HighSchoolInfo" SET "tongZhao"=603 WHERE "schoolId"='hs074';
UPDATE "HighSchoolInfo" SET "tongZhao"=540 WHERE "schoolId"='hs075';
UPDATE "HighSchoolInfo" SET "tongZhao"=749 WHERE "schoolId"='hs077';
UPDATE "HighSchoolInfo" SET "tongZhao"=752 WHERE "schoolId"='hs079';
UPDATE "HighSchoolInfo" SET "tongZhao"=734 WHERE "schoolId"='hs081';
UPDATE "HighSchoolInfo" SET "tongZhao"=742 WHERE "schoolId"='hs082';
UPDATE "HighSchoolInfo" SET "tongZhao"=619 WHERE "schoolId"='hs083';
UPDATE "HighSchoolInfo" SET "tongZhao"=589 WHERE "schoolId"='hs084';
UPDATE "HighSchoolInfo" SET "tongZhao"=613 WHERE "schoolId"='hs085';
UPDATE "HighSchoolInfo" SET "tongZhao"=529 WHERE "schoolId"='hs086';
UPDATE "HighSchoolInfo" SET "tongZhao"=501 WHERE "schoolId"='hs087';
UPDATE "HighSchoolInfo" SET "tongZhao"=593 WHERE "schoolId"='hs088';
UPDATE "HighSchoolInfo" SET "tongZhao"=554 WHERE "schoolId"='hs089';
UPDATE "HighSchoolInfo" SET "tongZhao"=613 WHERE "schoolId"='hs091';
UPDATE "HighSchoolInfo" SET "tongZhao"=516 WHERE "schoolId"='hs092';
UPDATE "HighSchoolInfo" SET "tongZhao"=441 WHERE "schoolId"='hs093';
UPDATE "HighSchoolInfo" SET "tongZhao"=574 WHERE "schoolId"='hs095';
UPDATE "HighSchoolInfo" SET "tongZhao"=519 WHERE "schoolId"='hs096';
UPDATE "HighSchoolInfo" SET "tongZhao"=460 WHERE "schoolId"='hs098';
UPDATE "HighSchoolInfo" SET "tongZhao"=581 WHERE "schoolId"='hs099';
UPDATE "HighSchoolInfo" SET "tongZhao"=516 WHERE "schoolId"='hs101';
UPDATE "HighSchoolInfo" SET "tongZhao"=587 WHERE "schoolId"='hs102';
UPDATE "HighSchoolInfo" SET "tongZhao"=480 WHERE "schoolId"='hs103';
UPDATE "HighSchoolInfo" SET "tongZhao"=527 WHERE "schoolId"='hs104';
UPDATE "HighSchoolInfo" SET "tongZhao"=416 WHERE "schoolId"='hs105';
UPDATE "HighSchoolInfo" SET "tongZhao"=401 WHERE "schoolId"='hs106';
UPDATE "HighSchoolInfo" SET "tongZhao"=558 WHERE "schoolId"='hs108';

-- 步骤3: 验证(应为109所)
-- SELECT count(*) FROM "HighSchoolInfo";

COMMIT;

-- 回滚用: 若发现问题,在 COMMIT 前改为 ROLLBACK;
