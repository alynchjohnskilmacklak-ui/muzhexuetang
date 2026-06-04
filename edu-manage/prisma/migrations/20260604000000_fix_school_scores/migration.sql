-- Correct 2025 high-school score lines used by the volunteer simulator.
UPDATE "HighSchoolInfo"
SET
  "yiTong" = CASE "schoolId"
    WHEN 'szjz1' THEN 770
    WHEN 'szjz2' THEN 749
    WHEN 'mb1' THEN 755
    WHEN 'mb2' THEN 745
    WHEN 'mb3' THEN 743
    WHEN 'mb4' THEN 747
    WHEN 'mb5' THEN 741
    WHEN 'mb6' THEN 540
    WHEN 'mb7' THEN 698
    WHEN 'mb8' THEN 608
    WHEN 'mb9' THEN 624
    WHEN 'mb10' THEN 672
    WHEN 'mb11' THEN 695
    WHEN 'mb12' THEN 674
    ELSE "yiTong"
  END,
  "tongZhao" = CASE "schoolId"
    WHEN 'szjz1' THEN 769
    WHEN 'szjz2' THEN 743
    ELSE "tongZhao"
  END,
  "allocationLine" = CASE
    WHEN "schoolId" = 'szjz1' THEN 720
    WHEN "schoolId" = 'szjz2' THEN 699
    WHEN "schoolId" = 'szjz3' THEN 711
    WHEN "schoolId" = 'szjz4' THEN 702
    WHEN "schoolId" IN ('mb1','mb2','mb3','mb4','mb5','mb6','mb7','mb8','mb9','mb10','mb11','mb12') THEN NULL
    ELSE "allocationLine"
  END,
  "updatedAt" = NOW()
WHERE "schoolId" IN (
  'szjz1','szjz2','szjz3','szjz4',
  'mb1','mb2','mb3','mb4','mb5','mb6','mb7','mb8','mb9','mb10','mb11','mb12'
);

INSERT INTO "HighSchoolInfo" (
  "id",
  "schoolId",
  "name",
  "fullName",
  "type",
  "location",
  "yiTong",
  "tongZhao",
  "allocationLine",
  "xinleAccessible",
  "xinleAccessibleOverride",
  "boardingAvail",
  "acceptsOtherCounty",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'sup32',
  '北华中学',
  '北华中学(其他县区)',
  '民办',
  '市区',
  540,
  540,
  NULL,
  true,
  true,
  false,
  false,
  NOW()
)
ON CONFLICT ("schoolId") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "fullName" = EXCLUDED."fullName",
  "type" = EXCLUDED."type",
  "location" = EXCLUDED."location",
  "yiTong" = EXCLUDED."yiTong",
  "tongZhao" = EXCLUDED."tongZhao",
  "allocationLine" = EXCLUDED."allocationLine",
  "xinleAccessible" = EXCLUDED."xinleAccessible",
  "xinleAccessibleOverride" = EXCLUDED."xinleAccessibleOverride",
  "boardingAvail" = EXCLUDED."boardingAvail",
  "acceptsOtherCounty" = EXCLUDED."acceptsOtherCounty",
  "updatedAt" = NOW();
