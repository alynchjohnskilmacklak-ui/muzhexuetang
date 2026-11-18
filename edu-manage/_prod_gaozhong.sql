--
-- PostgreSQL database dump
--

\restrict 07sZzgKhU1LukxieISrdD3stSryqjU42f0MSNociGFslsQYK2La0WZTfU8nbaXr

-- Dumped from database version 15.19 (Debian 15.19-1.pgdg12+2)
-- Dumped by pg_dump version 15.19 (Debian 15.19-1.pgdg12+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Teacher; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Teacher" (id, name, gender, phone, email, avatar, "employmentType", status, "joinedAt", "contractEnd", education, university, major, "graduationYear", "currentUnit", subjects, bio, "monthlyHours", rating, "ratingCount", division, "createdAt", "updatedAt", "tierLevel") FROM stdin;
cmqgmp4a20004508l3ug1k1e9	李元林	男	15930114500	791236757@qq.com	/people/liyuanlin.png	FULL_TIME	ACTIVE	2026-06-16 12:38:53.157	\N	硕士	吉林大学	电子信息技术	\N	吉林大学	数学,物理	李元林老师，具备硕士学历背景，就读吉林大学（985工程高校），专业方向为电子信息技术，授课方向为高中数学、物理。课程重视从题目情境中提取变量与条件，把抽象公式转化为能解释、能使用的解题步骤；对函数、力学等综合题，先明确思路，再完成计算与结果检验。课堂会结合学生的理解程度安排例题与变式练习，及时指出概念混淆和过程跳步的问题。教学目标是帮助学生建立更清晰的知识框架，逐步提高独立分析新题、完整表达推理过程的能力。高中阶段的课堂会更强调知识之间的纵向联系。例如讲函数时，先把图像、解析式和变化趋势放在一起理解；讲物理时，先还原过程，再决定使用何种规律。面对综合题，可让学生先独立提出解题方案，教师再通过追问帮助其发现遗漏的条件，而不是直接替学生完成推导。讲评时比较不同解法的适用范围，训练审题、表达与复核三个环节，力求让学生逐步适应新题。对不同基础的学生，练习难度还会按其独立完成情况逐步调整。	0	0	0	SENIOR	2026-06-16 12:38:53.162	2026-07-20 16:35:24.088	NEW
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, password, name, role, avatar, status, "wxpusherUid", "teacherId", division, "currentSessionToken", "lastLoginAt", "lastLoginIp", "lastLoginDevice", "createdAt", "updatedAt") FROM stdin;
cmqf4ukbk0005r3tly89kaxvs	zhangtuo@nuc.com	$2b$12$.W1bT7661jCmyJcEVAn3r.f82qrmlZ5kLEU1pK1y25EZktCdB97w2	张拓	admin	\N	active	\N	\N	JUNIOR	6991c8c5-fc6d-47c4-b20c-dbfbe4e944f8	2026-06-15 11:32:30.515	111.53.198.26	电脑 · Edge	2026-06-15 11:31:27.939	2026-06-15 11:32:30.682
cmqf626810006q3x00kjkne60	liuzixu@st.com	$2b$10$G0ILdP1fJHi/..azPmNXZOdLVzh5qMZuAhYPkNSGcNP1qdwAhKp26	wentao ren	parent	\N	active	\N	\N	SENIOR	\N	\N	\N	\N	2026-06-15 12:05:22.562	2026-06-15 12:05:22.562
cmqf4u72c0002r3tl1wcigyhl	mashaokun@nuc.com	$2b$12$v2CzumPQQ2SJR9vXeoDVEeiMM/DwypJAL.X9k1oxIRBXpwEiqE4Om	马韶锟	admin	\N	active	\N	\N	JUNIOR	cbd3f248-1376-4011-9d99-2a0d86ed6b80	2026-06-16 11:58:54.204	211.70.208.226	电脑 · 微信内置浏览器	2026-06-15 11:31:10.788	2026-06-16 11:58:54.319
cmqgmp4dd0005508lg2jowg7c	liyuanlin@tea.com	$2b$10$zkkOV8QsDaLGe.2K/tP70urEnIHrw3s/v0.cI9.eGezvZVkQl0F1m	李元林	teacher	\N	active	\N	\N	SENIOR	\N	\N	\N	\N	2026-06-16 12:38:53.282	2026-06-16 12:38:53.282
153957c0-7c94-43d3-91a3-ccdaf687bb64	renwentao@nuc.com	$2b$12$eor23oIqF108EAUdQ5CbuOIVV8gyjo7iK/iZBsHEEq1rtSYCN29Lm	任文涛	admin	\N	active	\N	\N	SENIOR	d75d5f81-3474-4222-a7c8-04254da6642a	2026-07-20 16:35:07.988	218.12.23.112	电脑 · Edge	2026-06-14 20:07:22.048	2026-07-20 16:35:07.988
\.


--
-- Data for Name: AcademicTerm; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AcademicTerm" (id, name, code, division, kind, status, "startDate", "endDate", description, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Student; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Student" (id, name, gender, "birthYear", grade, school, phone, email, "parentName", "parentPhone", "parentUserId", status, source, notes, tags, "remainHours", "totalHours", "enrolledAt", "leftAt", "createdAt", "updatedAt", "parentId", "mainTeacherId", division, "membershipLevel", "deletedAt", "deletedById", "deletionBatchId") FROM stdin;
cmqf626870008q3x0mr5il8xt	刘子旭	男	\N	高二	新乐四中	15930114500	791236757@qq.com	wentao ren	\N	cmqf626810006q3x00kjkne60	TRIAL	\N	\N	"[]"	0	0	2026-06-15 12:05:22.567	\N	2026-06-15 12:05:22.567	2026-06-15 12:05:32.391	cmqf626810006q3x00kjkne60	\N	SENIOR	NORMAL	\N	\N	\N
\.


--
-- Data for Name: AchievementBadge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AchievementBadge" (id, "studentId", "teacherId", "badgeType", description, "earnedAt", "deletedAt", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActivityLog" (id, "userId", "teacherId", action, detail, "entityType", "entityId", metadata, "createdAt") FROM stdin;
cmqf4u72f0004r3tlrjtt84w8	153957c0-7c94-43d3-91a3-ccdaf687bb64	\N	创建管理员	马韶锟（mashaokun@nuc.com）	\N	\N	\N	2026-06-15 11:31:10.792
cmqf4ukbp0007r3tlqux2pde0	153957c0-7c94-43d3-91a3-ccdaf687bb64	\N	创建管理员	张拓（zhangtuo@nuc.com）	\N	\N	\N	2026-06-15 11:31:27.974
cmqf6268d000aq3x0gw8k00d9	153957c0-7c94-43d3-91a3-ccdaf687bb64	\N	添加学员	刘子旭，家长账号：liuzixu@st.com	\N	\N	\N	2026-06-15 12:05:22.573
cmqgmp4dj0007508l5yqvlv0o	153957c0-7c94-43d3-91a3-ccdaf687bb64	\N	添加教师	李元林	\N	\N	\N	2026-06-16 12:38:53.287
cmqgmpjg4000e508log2g1wwd	153957c0-7c94-43d3-91a3-ccdaf687bb64	\N	新建班级	1	\N	\N	\N	2026-06-16 12:39:12.821
cmqgmpjjd0040508lu630tc83	153957c0-7c94-43d3-91a3-ccdaf687bb64	\N	生成课次	1 共16节	\N	\N	\N	2026-06-16 12:39:12.937
\.


--
-- Data for Name: AllocationQuota; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AllocationQuota" (id, year, "juniorSchool", "seniorSchool", quota) FROM stdin;
\.


--
-- Data for Name: Course; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Course" (id, name, subject, grade, type, level, "lessonMinutes", "totalLessons", "pricePerLesson", color, "isActive", "createdAt", "teacherId", division, "updatedAt", "deletedAt", "deletedById", "deletionBatchId") FROM stdin;
cmqgmpjdi0008508ltw7y79fx	1	数学	1	GROUP	\N	40	16	\N	#E8784A	t	2026-06-16 12:39:12.726	\N	SENIOR	2026-06-16 12:39:12.726	\N	\N	\N
\.


--
-- Data for Name: Room; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Room" (id, name, capacity, type, "usageType", status, "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ClassGroup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClassGroup" (id, name, division, "courseId", "teacherId", "roomId", "maxStudents", "startDate", "endDate", status, "totalLessons", "completedLessons", "recurringDays", "lessonStartTime", "lessonMinutes", note, "createdAt", "updatedAt", "intensiveMode", "teachingType", "termId", "deletedAt", "deletedById", "deletionBatchId") FROM stdin;
cmqgmpjfy000b508lifqollj4	1	SENIOR	cmqgmpjdi0008508ltw7y79fx	cmqgmp4a20004508l3ug1k1e9	\N	20	2026-06-16 00:00:00	\N	WAITING	16	0	{MON,WED,FRI}	08:00	40	\N	2026-06-16 12:39:12.814	2026-06-16 12:39:12.933	NORMAL	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Assessment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Assessment" (id, "groupId", name, type, "assessDate", "fullScore", "createdAt") FROM stdin;
\.


--
-- Data for Name: ClassLesson; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClassLesson" (id, division, "groupId", "teacherId", subject, "lessonDate", "startTime", "endTime", status, "cancelReason", "postponeFrom", note, "hoursDeductedAt", "attendanceSubmittedAt", "createdAt", "isManual", "plannedMinutes", "actualMinutes", "settlementStatus", "intensiveReviewStatus", "deletedAt", "deletedById", "deletionBatchId") FROM stdin;
cmqgmpjig000f508lwooktg73	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-17 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjig000g508l70kk6idy	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-17 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjig000h508lg8ct7ubz	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-17 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjig000i508lw02adekm	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-17 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjig000j508l7iqegk3o	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-17 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjig000k508l3l65llfu	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-17 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000l508lz8n4vps6	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-17 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000m508ld74sv4uc	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-17 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000n508lfmrxvozt	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-19 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000o508l6kf1dxoz	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-19 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000p508ly9kdv4qn	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-19 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000q508lhrd6njxh	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-19 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000r508loroudzif	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-19 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000s508ls3homiaz	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-19 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000t508lvb51jpvm	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-19 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000u508leowmy41d	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-19 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000v508lsb4ez9dx	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-22 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000w508l0zffl9um	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-22 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000x508ljvetoosq	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-22 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000y508ltj0eeal7	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-22 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih000z508l9jtlboly	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-22 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih0010508l8jxxupxd	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-22 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih0011508lp01j2a4z	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-22 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih0012508lmtczqm01	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-22 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih0013508lo7rmb710	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-24 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih0014508lky6mil3a	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-24 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih0015508ldywc5wx2	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-24 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih0016508lx755sdnh	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-24 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih0017508l3a5a3p1e	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-24 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih0018508ltr9fpo6x	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-24 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih0019508lsjcys0dn	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-24 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001a508l11g1lueh	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-24 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001b508ll8jx7jqe	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-26 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001c508lt17sihg0	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-26 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001d508liqzm2dlf	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-26 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001e508le03s7k3j	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-26 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001f508ljzth9h4w	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-26 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001g508l6a9snq8k	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-26 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001h508l7w7u6879	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-26 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001i508l9dndnm3q	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-26 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001j508lg7a7zzmp	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-29 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001k508l0xm14gts	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-29 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001l508lm6cmh5bu	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-29 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001m508lfn1bk1c4	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-29 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001n508lfumuk0op	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-29 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001o508leqc2r7zp	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-29 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001p508lmsgvvxia	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-29 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001q508los8ikepm	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-06-29 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001r508l5vf98zhu	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-01 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjih001s508lanteak53	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-01 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.904	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjit001t508l9xaq82x0	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-01 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjit001u508l9l1z3eiu	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-01 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjit001v508lndiuy1tg	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-01 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjit001w508lrfzttq1u	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-01 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjit001x508l2hozfjwc	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-01 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjit001y508lu2c5qaxw	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-01 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjit001z508lt7igf6so	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-03 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjit0020508l48143vii	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-03 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjit0021508lqflwpesa	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-03 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjit0022508lesjbje65	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-03 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0023508lydbc62tv	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-03 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0024508luj2ozxn5	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-03 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0025508l48100hgk	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-03 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0026508lws2ubsk7	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-03 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0027508lpfq5bc92	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-06 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0028508lkv581wcs	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-06 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0029508lq7cli7hv	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-06 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002a508la3v44mv6	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-06 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002b508l52tqva12	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-06 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002c508lzan48lem	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-06 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002d508ltuy5qns7	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-06 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002e508lozf218ct	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-06 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002f508l36ioh2p8	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-08 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002g508l8mhd3jia	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-08 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002h508la710x3du	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-08 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002i508lctal7j3p	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-08 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002j508ldxkt0aij	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-08 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002k508lwp3opaf3	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-08 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002l508lzokuzff5	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-08 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002m508llkloout9	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-08 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002n508l4gbtiily	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-10 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002o508lzhmvfeny	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-10 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002p508ltuk7omx9	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-10 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002q508life0xu2h	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-10 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002r508lysm73y3c	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-10 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002s508l1vj8x12t	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-10 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002t508ltx6q0xfh	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-10 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002u508lahkuzcau	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-10 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002v508l7v4968pc	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-13 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002w508lbg58x2xr	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-13 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002x508lelkdqrvu	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-13 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002y508lu34dt9p1	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-13 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu002z508lw1prod60	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-13 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0030508l15z1ueyb	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-13 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0031508l9coe5hp9	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-13 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0032508l598p04tl	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-13 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0033508lmazkndsp	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-15 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0034508loi18xbs7	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-15 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0035508lt1ivcv9h	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-15 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjiu0036508lx6uz8c4n	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-15 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.917	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj30037508lsgjz5vm4	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-15 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj30038508lfo0q6if8	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-15 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj30039508l7i862x6k	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-15 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003a508l7n95amzr	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-15 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003b508lwvi25t2x	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-17 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003c508lynsp5dqq	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-17 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003d508lijpbdr1r	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-17 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003e508lvwqw52td	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-17 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003f508lpszazhfj	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-17 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003g508lcrehywdf	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-17 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003h508lwp12yo8c	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-17 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003i508lxtb07kmu	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-17 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003j508lk7ksvyu7	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-20 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003k508l37mmbt6r	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-20 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003l508leb1ku88q	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-20 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003m508lq58r2pnu	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-20 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003n508lpifyshss	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-20 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003o508latbe5c3q	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-20 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003p508lzk1gjmni	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-20 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003q508l8pinofs2	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-20 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003r508lkx04t6ec	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-22 00:00:00	08:00	08:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003s508lp9p0irtk	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-22 00:00:00	08:50	09:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003t508lrk5kj14t	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-22 00:00:00	09:50	10:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003u508l9v3ji29p	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-22 00:00:00	10:40	11:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003v508l5yep4l20	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-22 00:00:00	14:00	14:40	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003w508lwbzmxgxj	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-22 00:00:00	14:50	15:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003x508ls6pw96sd	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-22 00:00:00	15:50	16:30	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
cmqgmpjj3003y508lfsyzvvvi	SENIOR	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	2026-07-22 00:00:00	16:40	17:20	SCHEDULED	\N	\N	\N	\N	\N	2026-06-16 12:39:12.927	f	\N	\N	UNSETTLED	NOT_REQUIRED	\N	\N	\N
\.


--
-- Data for Name: Enrollment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Enrollment" (id, "studentId", "groupId", "enrolledAt", "totalHours", "usedHours", "remainHours", status, "deletedAt", "deletedById", "deletionBatchId", subjects) FROM stdin;
\.


--
-- Data for Name: Attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Attendance" (id, "lessonId", "studentId", "enrollmentId", status, "actualMinutes", "hoursDeducted", "notifySent", "createdAt", "deletedAt", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: ClassGroupTeacher; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClassGroupTeacher" (id, "groupId", "teacherId", subject, role, "createdAt") FROM stdin;
cmqgmpjg2000c508lkl8oddhi	cmqgmpjfy000b508lifqollj4	cmqgmp4a20004508l3ug1k1e9	数学	PRIMARY	2026-06-16 12:39:12.818
\.


--
-- Data for Name: GradeRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GradeRecord" (id, "assessmentId", "studentId", score, comment, "notifySent", "createdAt", "termId", "deletedAt", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: ClassHighlight; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClassHighlight" (id, "studentId", "teacherId", "groupId", "gradeId", content, "imageUrl", "pushedToParent", "createdAt") FROM stdin;
\.


--
-- Data for Name: ClassLessonStudent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClassLessonStudent" (id, "lessonId", "studentId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ClassroomFeedback; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClassroomFeedback" (id, "teacherId", "classLessonId", "targetType", source, "studentIds", "knowledgePoints", summary, mood, tags, badge, "overallComment", homework, "imageUrls", "imageTypes", "studentRatings", "parentReply", "parentRepliedAt", "adminReply", "adminRepliedAt", status, "notifySent", "createdAt", "updatedAt", "homeworkDone", "inClassRating", "feedbackCourseType", "feedbackGroupId", "parentReadAt", "lessonContent", "termId", "deletedAt", "deletionBatchId", "knowledgeCard") FROM stdin;
\.


--
-- Data for Name: DeletedRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DeletedRecord" (id, "entityType", "entityId", "entityName", payload, "deletedById", reason, "createdAt", "deletionBatchId", "termId", impact, "expiresAt") FROM stdin;
\.


--
-- Data for Name: DimensionScore; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DimensionScore" (id, "gradeId", dimension, score, "maxScore") FROM stdin;
\.


--
-- Data for Name: ExamPaper; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExamPaper" (id, "studentId", "teacherId", "classLessonId", title, subject, "paperDate", "imageUrls", "fileUrl", tags, "overallComment", status, "isReadByParent", "readAt", "notifySent", "createdAt", "updatedAt", "termId", "deletedAt", "deletedById", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: Fee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Fee" (id, division, "studentId", "courseId", amount, type, status, "paidAt", "dueDate", notes, "createdAt", "updatedAt", campus, hours, operator, "termId", "deletedAt", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: FeeType; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeeType" (id, name, description, "isActive", "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FeedbackRewardRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeedbackRewardRecord" (id, "feedbackId", "studentId", "teacherId", "courseKey", "courseLabel", amount, "isFirstFeedback", "createdAt", "subjectKey", "subjectLabel", "isActive", "invalidReason", "rewardDate") FROM stdin;
\.


--
-- Data for Name: FileAsset; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FileAsset" (id, filename, "originalName", "mimeType", size, "storageDriver", "storageKey", url, "ownerType", "ownerId", "studentId", "lessonId", "feedbackId", "postId", visibility, "uploadedById", "uploadedByRole", tenant, "createdAt", "updatedAt", "deletedAt", "previewUrl", "thumbnailUrl", width, height, "fileSize", "deletedById", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: VolunteerGuide; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VolunteerGuide" (id, title, subtitle, year, "isPublished", "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: GuideDocument; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GuideDocument" (id, "guideId", name, type, "fileUrl", "fileSize", content, "sortOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: GuideStep; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GuideStep" (id, "guideId", "order", title, content, "tipContent", "imageUrl", "batchTags", "isPublished", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GuideViewLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GuideViewLog" (id, "userId", action, metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: HighSchoolInfo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HighSchoolInfo" (id, "schoolId", name, "fullName", type, location, address, "distanceFromXinle", "yiTong", "tongZhao", "allocationLine", "acceptsOtherCounty", "xinleAccessible", "xinleAccessibleOverride", "xinleAllocationId", enrollment, "boardingAvail", "boardingFee", "tuitionFee", "keyFeature", "gaokaoRate", intro, tips, website, phone, "sourceUrl", "sourceNote", "infoVerifiedAt", "infoConfidence", "updatedAt", "updatedBy", "isProvincialDemo", "xinleFenpeiQuota", "xinleLine", "xinleStatus", batch, category) FROM stdin;
\.


--
-- Data for Name: HourTransaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HourTransaction" (id, "studentId", "enrollmentId", "lessonId", amount, "beforeHours", "afterHours", type, reason, "operatorId", "createdAt", "deletedAt", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: IntensiveLessonReview; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."IntensiveLessonReview" (id, "lessonId", revision, "teacherId", "submittedById", "actualMinutes", "attendanceSnapshot", "teacherNote", status, "submittedAt", "reviewedById", "reviewedAt", "reviewNote", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JuniorEnrollment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JuniorEnrollment" (id, year, "juniorSchool", count) FROM stdin;
\.


--
-- Data for Name: LearningGoal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LearningGoal" (id, "studentId", subject, "goalDesc", deadline, note, "isAchieved", "achievedAt", "createdAt", "deletedAt", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: LeaveRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LeaveRequest" (id, "studentId", reason, "leaveDate", status, "replyNote", "repliedAt", "repliedBy", "createdAt", "updatedAt", "deletedAt", "deletionBatchId", "lessonId") FROM stdin;
\.


--
-- Data for Name: LessonSettlementAdjustment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LessonSettlementAdjustment" (id, "lessonId", "oldMinutes", "newMinutes", reason, "operatorId", "createdAt") FROM stdin;
\.


--
-- Data for Name: LoginRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LoginRecord" (id, "userId", email, success, ip, "userAgent", device, os, browser, "failReason", "createdAt") FROM stdin;
cmqf4o4170001r3tluv1judo5	153957c0-7c94-43d3-91a3-ccdaf687bb64	renwentao@nuc.com	t	111.53.198.26	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	电脑 · Edge	Windows 10/11	Edge	\N	2026-06-15 11:26:26.923
cmqf4vwkt000ar3tlwq5nuoj7	cmqf4ukbk0005r3tly89kaxvs	zhangtuo@nuc.com	t	111.53.198.26	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	电脑 · Edge	Windows 10/11	Edge	\N	2026-06-15 11:32:30.51
cmqf5v3vb0003q3x07qt9kkz3	153957c0-7c94-43d3-91a3-ccdaf687bb64	renwentao@nuc.com	t	111.53.198.26	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	电脑 · Edge	Windows 10/11	Edge	\N	2026-06-15 11:59:52.919
cmqf61bev0005q3x0hdcl0at3	153957c0-7c94-43d3-91a3-ccdaf687bb64	renwentao@nuc.com	t	111.53.198.26	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	电脑 · Edge	Windows 10/11	Edge	\N	2026-06-15 12:04:42.632
cmqgl9p860001sou30didsaq8	cmqf4u72c0002r3tl1wcigyhl	mashaokun@nuc.com	t	211.70.208.226	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541a34) XWEB/19977 Flue	电脑 · 微信内置浏览器	Windows 10/11	微信内置浏览器	\N	2026-06-16 11:58:54.198
cmqgmn88c0003508low60vfv8	153957c0-7c94-43d3-91a3-ccdaf687bb64	renwentao@nuc.com	t	111.53.198.26	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	电脑 · Edge	Windows 10/11	Edge	\N	2026-06-16 12:37:24.973
cmqrtag1q0003e2bfk471rhu4	\N	renwentao@nuc.com	f	111.53.198.26	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	电脑 · Edge	Windows 10/11	Edge	not_found	2026-06-24 08:28:53.822
cmqrtahja0004e2bfv5g2rfi5	\N	renwentao@nuc.com	f	111.53.198.26	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	电脑 · Edge	Windows 10/11	Edge	not_found	2026-06-24 08:28:55.751
cmqu9xxap000oaciig83j7o0a	\N	zhengjiayi@st.com	f	36.143.219.55	Mozilla/5.0 (Linux; Android 15; V2359A Build/AP3A.240905.015.A1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/2941 REV/36d119b75dec33a82fb43d1352699291df4abef9 MicroMessenger/8.0.74.3120(0x28004A3B) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-06-26 01:50:35.474
cmqu9y1z7000paciiln4coah5	\N	zhengjiayi@st.com	f	36.143.219.55	Mozilla/5.0 (Linux; Android 15; V2359A Build/AP3A.240905.015.A1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/2941 REV/36d119b75dec33a82fb43d1352699291df4abef9 MicroMessenger/8.0.74.3120(0x28004A3B) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-06-26 01:50:41.54
cmrc5t6f003yrnrop4yo5t5bg	\N	liwenze@tea.com	f	182.51.86.79	Mozilla/5.0 (Linux; Android 16; ELP-AN00 Build/HONORELP-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/6693 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-08 14:14:46.716
cmrc5ucou03yynrop6u66j0od	\N	niuyudan@tea.com	f	183.197.247.90	Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.1.3702.40 Safari/537.36 QBWebViewUA/2 QBWebViewType/1 WKType/1	电脑 · Chrome	Windows 10/11	Chrome	not_found	2026-07-08 14:15:41.502
cmrc5wqxt03zmnropzyobv68h	\N	renziying@tea.com	f	106.117.0.216	Mozilla/5.0 (Linux; Android 15; PLB110 Build/AP3A.240617.008; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260202 MMWEBID/5967 REV/89918ef4d19865ac6236e9f77c99567b0ec6d85b MicroMessenger/8.0.70.3060(0x28004652) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-08 14:17:33.282
cmrc5xxlo03zvnrop6nmmc9fv	\N	niuyudan@tea.com	f	183.197.247.90	Mozilla/5.0 (iPhone; CPU iPhone OS 26_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b35) NetType/WIFI Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-08 14:18:28.572
cmrc5xzai03zwnropqrehujef	\N	niuyudan@tea.com	f	183.197.247.90	Mozilla/5.0 (iPhone; CPU iPhone OS 26_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b35) NetType/WIFI Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-08 14:18:30.762
cmrc5z6oj03zxnropvx4hx756	\N	niuyudan@tea.com	f	183.197.247.90	Mozilla/5.0 (iPhone; CPU iPhone OS 26_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b35) NetType/WIFI Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-08 14:19:26.995
cmrc5zarz03zynropf76lvura	\N	niuyudan@tea.com	f	183.197.247.90	Mozilla/5.0 (iPhone; CPU iPhone OS 26_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b35) NetType/WIFI Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-08 14:19:32.303
cmrc6i9dm0418nrop6xfhj49v	\N	haoboya@st.com	f	106.117.3.123	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541a35) XWEB/20001 Flue	电脑 · 微信内置浏览器	Windows 10/11	微信内置浏览器	not_found	2026-07-08 14:34:16.955
cmrc6iclb0419nropylznyqq1	\N	haoboya@st.com	f	106.117.3.123	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541a35) XWEB/20001 Flue	电脑 · 微信内置浏览器	Windows 10/11	微信内置浏览器	not_found	2026-07-08 14:34:21.12
cmrc6jcdh041anropoj2nv9ij	\N	haoboya@st.com	f	106.117.3.123	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541a35) XWEB/20001 Flue	电脑 · 微信内置浏览器	Windows 10/11	微信内置浏览器	not_found	2026-07-08 14:35:07.493
cmrc6k2iy041dnrope7uv95r7	\N	haoboya@st.com	f	106.117.3.123	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541a35) XWEB/20001 Flue	电脑 · 微信内置浏览器	Windows 10/11	微信内置浏览器	not_found	2026-07-08 14:35:41.387
cmrc6kp3m041enropmqlokxgy	\N	haoboya@st.com	f	106.117.3.123	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541a35) XWEB/20001 Flue	电脑 · 微信内置浏览器	Windows 10/11	微信内置浏览器	not_found	2026-07-08 14:36:10.643
cmrc6tds0041tnropas818je6	\N	yangzjhanst@com	f	183.199.105.114	Mozilla/5.0 (Linux; Android 13; V2278A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/4537 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-08 14:42:55.873
cmrc6vdii0421nropl5lvdazh	\N	yangzihanst.com	f	183.199.105.114	Mozilla/5.0 (Linux; Android 13; V2278A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/4537 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-08 14:44:28.842
cmrc6vzjr0422nropww4fxefy	\N	yangzihan@st.com	f	183.199.105.114	Mozilla/5.0 (Linux; Android 13; V2278A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/4537 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-08 14:44:57.399
cmrc6y7fs0423nropxhtw3e9w	\N	yangzihan@st.com	f	183.199.105.114	Mozilla/5.0 (Linux; Android 13; V2278A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/4537 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-08 14:46:40.936
cmrc72y5a0428nropshi9q0ab	\N	yangzihan@st.com	f	183.199.105.114	Mozilla/5.0 (Linux; Android 13; V2278A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/4537 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-08 14:50:22.174
cmrcrphhk047fnropr4akvytx	\N	lvxiangjin@st.com	f	120.211.184.140	Mozilla/5.0 (Linux; Android 12; CLS-AL30 Build/HUAWEICLS-AL30; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/3897 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-09 00:27:45.992
cmrcrqzwl047gnropn5zhxlm4	\N	lvxiangjin@st.com	f	120.211.184.140	Mozilla/5.0 (Linux; Android 12; CLS-AL30 Build/HUAWEICLS-AL30; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/3897 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-09 00:28:56.518
cmrcw9krs058cnrop488vavlr	\N	lvxiangjin@st.com	f	183.199.144.223	Mozilla/5.0 (Linux; Android 12; CLS-AL30 Build/HUAWEICLS-AL30; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/3897 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-09 02:35:21.833
cmree5lhm019vevdt8jtw3t0n	\N	烨.	f	39.144.50.58	Mozilla/5.0 (Linux; Android 16; PLA110 Build/BP2A.250605.015; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/6406 REV/5bf5a03e217b4efb1c850e6291e9f7626ae741c1 MicroMessenger/8.0.74.3120(0x28004A51) WeChat/arm64 Weixin NetType/5G Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 03:43:55.402
cmrefnrtm01tlevdth1a3hi3b	\N	lvxiangjin@st.com	f	36.143.102.165	Mozilla/5.0 (Linux; Android 12; CLS-AL30 Build/HUAWEICLS-AL30; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/3897 REV/5503a2255ce193406cd4f7f35db7b18cd06982dc MicroMessenger/8.0.74.3120(0x28004A85) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 04:26:03.035
cmregapfj01xpevdtejd8eewm	\N	lvxiangjin@st.com	f	36.143.102.165	Mozilla/5.0 (Linux; Android 12; CLS-AL30 Build/HUAWEICLS-AL30; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/3897 REV/5503a2255ce193406cd4f7f35db7b18cd06982dc MicroMessenger/8.0.74.3120(0x28004A85) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 04:43:53.023
cmrep74qt02y8evdt7o51n0mg	\N	zhaozihao@st.com	f	183.197.247.101	Mozilla/5.0 (Linux; Android 14; LSA-AN00 Build/HONORLSA-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/2665 REV/01049e1191ef66cd38f1ac5d46e3ba7e88763009 MicroMessenger/8.0.76.3140(0x28004C30) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 08:53:02.79
cmrep7edk02y9evdtbaz7v9qn	\N	zhaozihao@st.com	f	183.197.247.101	Mozilla/5.0 (Linux; Android 14; LSA-AN00 Build/HONORLSA-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/2665 REV/01049e1191ef66cd38f1ac5d46e3ba7e88763009 MicroMessenger/8.0.76.3140(0x28004C30) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 08:53:15.273
cmrep7po902yaevdtb2s5zxpx	\N	zhaozihao@st.com	f	183.197.247.101	Mozilla/5.0 (Linux; Android 14; LSA-AN00 Build/HONORLSA-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/2665 REV/01049e1191ef66cd38f1ac5d46e3ba7e88763009 MicroMessenger/8.0.76.3140(0x28004C30) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 08:53:29.914
cmrep7uvk02ybevdt9hst4n9n	\N	zhaozihao@st.com	f	183.197.247.101	Mozilla/5.0 (Linux; Android 14; LSA-AN00 Build/HONORLSA-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/2665 REV/01049e1191ef66cd38f1ac5d46e3ba7e88763009 MicroMessenger/8.0.76.3140(0x28004C30) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 08:53:36.656
cmrep7w1202ycevdt6gp7m50e	\N	zhaozihao@st.com	f	183.197.247.101	Mozilla/5.0 (Linux; Android 14; LSA-AN00 Build/HONORLSA-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/2665 REV/01049e1191ef66cd38f1ac5d46e3ba7e88763009 MicroMessenger/8.0.76.3140(0x28004C30) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 08:53:38.15
cmrep803002ydevdt5twqzenu	\N	zhaozihao@st.com	f	183.197.247.101	Mozilla/5.0 (Linux; Android 14; LSA-AN00 Build/HONORLSA-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/2665 REV/01049e1191ef66cd38f1ac5d46e3ba7e88763009 MicroMessenger/8.0.76.3140(0x28004C30) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	locked	2026-07-10 08:53:43.404
cmrepcjg002yievdtg39anbh9	\N	haoshuoxu@st.com	f	106.113.88.214	Mozilla/5.0 (Linux; Android 14; 24094RAD4C Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/736 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 08:57:15.12
cmrepe8nr02yjevdtln98ueyx	\N	haoshuoxu@st.com	f	106.113.88.214	Mozilla/5.0 (Linux; Android 14; 24094RAD4C Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/736 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 08:58:34.456
cmreph0k602ykevdtpiziy8nu	\N	haoshuoxu@st.com	f	106.113.88.214	Mozilla/5.0 (Linux; Android 14; 24094RAD4C Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/736 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 09:00:43.926
cmreph8kt02ylevdti818c8rd	\N	haoshuoxu@st.com	f	106.113.88.214	Mozilla/5.0 (Linux; Android 14; 24094RAD4C Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/736 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 09:00:54.318
cmres38kj0459evdt2l9o63mu	\N	haoshuoxu@st.com	f	106.113.88.214	Mozilla/5.0 (Linux; Android 14; 24094RAD4C Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/736 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 10:13:59.972
cmres3vax045aevdtd6rnnm8g	\N	haoshuoxu@st.com	f	106.113.88.214	Mozilla/5.0 (Linux; Android 14; 24094RAD4C Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460217 MMWEBSDK/20260502 MMWEBID/736 REV/b4645a8e2c6e1093843c5af24a01e53837fb1b3a MicroMessenger/8.0.74.3120(0x28004A50) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-10 10:14:29.434
cmrq73w4100009osw1o7w575x	\N	zhaohaomiao@st.com	f	223.104.13.201	Mozilla/5.0 (Linux; Android 13; V2219A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 XWEB/1460243 MMWEBSDK/20260502 MMWEBID/736 REV/9e4e74389be6572989a44d02ab02f1b1cd9718b8 MicroMessenger/8.0.74.3120(0x28004A52) WeChat/arm64 Weixin NetType/5G Language/zh_CN ABI/arm64	手机 · 微信内置浏览器	Android	微信内置浏览器	not_found	2026-07-18 09:59:52.657
cmrt0v7pf00r07dp2j85x5cwm	\N	liwenze@tea.com	f	182.51.86.213	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	电脑 · Edge	Windows 10/11	Edge	not_found	2026-07-20 09:28:28.611
cmrtfsg6i0003hbg8kfvj3v6u	153957c0-7c94-43d3-91a3-ccdaf687bb64	renwentao@nuc.com	f	47.129.107.136	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	电脑 · Edge	Windows 10/11	Edge	not_found	2026-07-20 16:26:13.866
cmrtfsksp0005hbg8iz6zhs5q	153957c0-7c94-43d3-91a3-ccdaf687bb64	renwentao@nuc.com	f	47.129.107.136	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	电脑 · Edge	Windows 10/11	Edge	not_found	2026-07-20 16:26:19.849
cmrtg3wb20019hbg8hux4fcfl	153957c0-7c94-43d3-91a3-ccdaf687bb64	renwentao@nuc.com	t	218.12.23.112	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	电脑 · Edge	Windows 10/11	Edge	\N	2026-07-20 16:35:07.982
cms05mqce0740yt8c25qdvtf5	\N	motianyou@st.com	f	106.117.0.198	Mozilla/5.0 (iPhone; CPU iPhone OS 26_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b46) NetType/WIFI Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-25 09:16:14.174
cms05mzck0741yt8ct5ohjmsi	\N	motianyou@st.com	f	106.117.0.198	Mozilla/5.0 (iPhone; CPU iPhone OS 26_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b46) NetType/WIFI Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-25 09:16:25.845
cms05n2qw0742yt8c38xxjqq0	\N	motianyou@st.com	f	106.117.0.198	Mozilla/5.0 (iPhone; CPU iPhone OS 26_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b46) NetType/WIFI Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-25 09:16:30.249
cms05nqam0743yt8cfiki76yf	\N	motianyou@st.com	f	106.117.0.198	Mozilla/5.0 (iPhone; CPU iPhone OS 26_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b46) NetType/WIFI Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-25 09:17:00.766
cms5ub9bo0i9i8wgoviruyhqh	\N	wangyishuo@tea.com	f	111.55.24.222	Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b4c) NetType/4G Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-29 08:46:00.181
cms5ubg8i0i9j8wgo9ck4v10v	\N	wangyishuo@tea.com	f	111.55.24.222	Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b4c) NetType/4G Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-29 08:46:09.139
cms5ucjvt0i9k8wgozowt5h8b	\N	wangyishuo@tea.com	f	111.55.24.222	Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b4c) NetType/4G Language/zh_CN	手机 · 微信内置浏览器	iPhone	微信内置浏览器	not_found	2026-07-29 08:47:00.521
\.


--
-- Data for Name: MakeupRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MakeupRequest" (id, "attendanceId", "studentId", status, "targetLessonId", "makeupDate", "resolvedAt", note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MasteryRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MasteryRecord" (id, "studentId", "teacherId", "knowledgePoint", level, note, "createdAt") FROM stdin;
\.


--
-- Data for Name: MealMenu; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MealMenu" (id, "weekStart", "dayOfWeek", "mealType", "mainDish", "sideDish", "allowDouble", notes, division, "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: MealReport; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MealReport" (id, "menuId", "teacherId", "reportDate", "totalCount", "riceDouble", "riceSingle", "noodleCount", details, notes, division, "submittedAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MealTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MealTemplate" (id, weekday, title, breakfast, lunch, dinner, snack, note, "allowDouble", "isActive", "startDate", "endDate", division, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "userId", title, content, type, link, "relatedType", "relatedId", href, read, "readAt", status, "studentId", "senderId", "pushStatus", "pushError", "createdAt", attempts, "lastError", "sentAt", "deletedAt", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: NotifyConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NotifyConfig" (id, "paperPush", "absenceAlert", "lowHoursWarn", "performancePush", "weeklyReport", "weeklyReportDay", "weeklyReportHour", "updatedAt") FROM stdin;
singleton	t	t	3	t	f	0	22	2026-06-15 11:30:43.594
\.


--
-- Data for Name: PaperComment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaperComment" (id, "paperId", "authorId", content, "isRead", "createdAt") FROM stdin;
\.


--
-- Data for Name: PaperQuestion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaperQuestion" (id, "paperId", "order", topic, mastery, "teacherNote", "pageNum", "createdAt") FROM stdin;
\.


--
-- Data for Name: PaperReaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaperReaction" (id, "paperId", "userId", type, "createdAt") FROM stdin;
\.


--
-- Data for Name: ParentActivationToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ParentActivationToken" (id, "tokenHash", "parentUserId", "createdById", "expiresAt", "usedAt", "revokedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ParentMealChoice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ParentMealChoice" (id, "studentId", "menuId", "choiceDate", eating, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ParentMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ParentMessage" (id, "parentId", "studentId", "teacherId", subject, title, status, "createdAt", "updatedAt", "feedbackId") FROM stdin;
\.


--
-- Data for Name: ParentMessageReply; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ParentMessageReply" (id, "messageId", "authorId", "authorName", role, content, "isReadByParent", "isReadByTeacher", "createdAt") FROM stdin;
\.


--
-- Data for Name: PasswordResetToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PasswordResetToken" (id, "userId", "tokenHash", "expiresAt", used, "createdAt") FROM stdin;
\.


--
-- Data for Name: PerformancePost; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PerformancePost" (id, "studentId", "teacherId", "classLessonId", type, mood, content, images, tags, ratings, visibility, "isPinned", "isRead", "isReadByParent", "notifySent", "deletedAt", "createdAt", "updatedAt", "termId", "deletedById", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: PostBadge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PostBadge" (id, "postId", "badgeType", "awardedAt") FROM stdin;
\.


--
-- Data for Name: PostComment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PostComment" (id, "postId", "authorId", content, "isRead", "createdAt") FROM stdin;
\.


--
-- Data for Name: PostReaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PostReaction" (id, "postId", "userId", type, "createdAt") FROM stdin;
\.


--
-- Data for Name: QuotaRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."QuotaRecord" (id, "guideId", "schoolName", district, "allocQuota", "normalQuota", "totalQuota", note, year) FROM stdin;
\.


--
-- Data for Name: RoleConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RoleConfig" (id, "teacherViewFee", "teacherViewOthers", "updatedAt") FROM stdin;
singleton	f	f	2026-06-15 11:30:37.367
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, "sessionToken", "userId", expires) FROM stdin;
\.


--
-- Data for Name: StageSummary; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StageSummary" (id, "studentId", "teacherId", "periodStart", "periodEnd", summary, suggestions, "dataSnapshot", status, "publishedAt", "notifySent", "createdAt", "updatedAt", "deletedAt", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: StudentMealAttendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudentMealAttendance" (id, "studentId", "mealDate", division, "recordedBy", notes, "createdAt", "updatedAt", eating, source, "groupId", "groupName", "lessonId", "teacherId", "teacherName") FROM stdin;
\.


--
-- Data for Name: StudentTermMembership; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudentTermMembership" (id, "termId", "studentId", grade, "classLabel", status, "joinedAt", "leftAt", note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StudyHallClass; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyHallClass" (id, name, "termId", division, "scheduleType", weekdays, "timeWindowStart", "timeWindowEnd", status, "createdAt", "updatedAt", "gradeScope", "deletedAt", "deletedById", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: StudyHallClassRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyHallClassRecord" (id, "classId", "studyDate", "homeworkItems", "teacherComment", "imageUrls", "recordedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StudyHallClassStudent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyHallClassStudent" (id, "classId", "studentId", "joinedAt", "leftAt", status, "pickupContact", "pickupPhone", note, "createdAt", "updatedAt", "purchasedDays", "adjustedDays") FROM stdin;
\.


--
-- Data for Name: StudyHallClassTeacher; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyHallClassTeacher" (id, "classId", "teacherId", active, "assignedAt", "endedAt") FROM stdin;
\.


--
-- Data for Name: StudyHallClosure; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyHallClosure" (id, "termId", division, "classId", "startDate", "endDate", reason, "createdById", "createdAt") FROM stdin;
\.


--
-- Data for Name: StudyHallSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyHallSession" (id, "classId", weekday, slot, label, "startTime", "endTime", active, "createdAt", "updatedAt", "teacherId", subject) FROM stdin;
\.


--
-- Data for Name: StudyHallHomeworkEntry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyHallHomeworkEntry" (id, "classRecordId", "studentId", "sessionId", "attendanceKey", "homeworkStatus", "homeworkItems", "teacherComment", "imageUrls", "checkedIn", "checkInAt", "checkOutAt", "createdAt", "updatedAt", "contentType", "beforeImageUrls", "afterImageUrls", "lessonImageUrls", "attendanceStatus") FROM stdin;
\.


--
-- Data for Name: StudyHallMonthlyQuota; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyHallMonthlyQuota" (id, "membershipId", "monthKey", "entitledDays", adjustment, note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StudyHallPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyHallPlan" (id, "termId", "studentId", status, "defaultSessionMinutes", "pickupContact", "pickupPhone", note, "createdAt", "updatedAt", "assignedTeacherId") FROM stdin;
\.


--
-- Data for Name: StudyHallRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyHallRecord" (id, "planId", "studentId", "studyDate", "checkInAt", "checkOutAt", "homeworkStatus", "homeworkItems", "teacherComment", "imageUrls", "recordedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StudyMaterial; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyMaterial" (id, title, grade, subject, "fileUrl", "fileName", "fileSize", "fileType", description, downloads, "uploadedBy", audience, source, status, "teacherId", tags, "isPinned", "sortOrder", "createdAt", "updatedAt", "storageDriver", "classLessonId", "isLessonPreview", "deletedAt", "deletedById", "deletionBatchId", "uploadedByRole", "uploadedByAdminId") FROM stdin;
\.


--
-- Data for Name: Subject; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Subject" (id, name, color, "textColor", "isActive", "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SystemConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SystemConfig" (id, "orgName", "orgNameEn", phone, address, founded, website, "logoUrl", "updatedAt", "schedulePeriods", "membershipBenefits", "teacherBenefits") FROM stdin;
singleton	牧哲学堂	MOREJOY Education	\N	\N	\N	\N	\N	2026-06-15 11:30:33.934	\N	\N	\N
\.


--
-- Data for Name: TeacherAlert; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TeacherAlert" (id, "teacherId", type, message, "isResolved", "resolvedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: TeacherSalaryConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TeacherSalaryConfig" (id, "teacherId", "groupRateJunior", "groupRateSenior", "oneOnOneRates", "feedbackRateGroup", "feedbackRateOneOne", "updatedAt", "updatedBy") FROM stdin;
\.


--
-- Data for Name: TeacherSalaryTransaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TeacherSalaryTransaction" (id, "teacherId", type, amount, "lessonId", "feedbackId", description, "lessonDate", "createdAt", "adjustmentId", "termId", "lessonPayKey", "deletedAt", "deletionBatchId") FROM stdin;
\.


--
-- Data for Name: VolunteerConsultation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VolunteerConsultation" (id, "parentId", question, "replyId", reply, "repliedBy", "isReplied", "createdAt", "repliedAt") FROM stdin;
\.


--
-- Data for Name: WeaknessRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WeaknessRecord" (id, "studentId", "paperId", topic, "mistakeCount", suggestion, "createdAt") FROM stdin;
\.


--
-- Data for Name: YifenYidang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."YifenYidang" (id, year, score, count, cumulative) FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
0771df59-28ae-4092-881d-631005af9c95	2ec748d545babbc3e1be81105194b39251c7b3b58b501e4c16e73416d9e67c2e	2026-06-16 20:24:35.869476+08	20260517062914_add_course_attendance_grade		\N	2026-06-16 20:24:35.869476+08	0
b1f6b0c6-d88f-4039-a58d-b5bc09a2de1b	6b6af0a466614944755a0bcf2c61ca1d42f7c90f18c63771cab9abc4e95c0096	2026-06-16 20:24:37.92166+08	20260518000000_add_deleted_record		\N	2026-06-16 20:24:37.92166+08	0
d8e8e2a3-b02c-40d8-857b-f5f0f1988077	ec401779666ad351cea3b6d77eb02a0cc6503904b0fda8ecb61a2a11ba972552	2026-06-16 20:24:39.985393+08	20260518073000_add_performance_post		\N	2026-06-16 20:24:39.985393+08	0
8916295d-e0a8-4d19-82c3-954fca7a8d7e	3d05b077d295aaa1219974a6f93913bef4a624228e1148e59c9d8478f590d0ba	2026-06-16 20:24:41.950595+08	20260518090000_add_volunteer_guide		\N	2026-06-16 20:24:41.950595+08	0
09132a52-e37a-4533-bb59-db51ded79e36	65da661d566024735dfbfd7a13c10317f9ebb71e2bbcc415af6acd751b2720f0	2026-06-16 20:24:43.785795+08	20260519093000_add_teacher_portal_log		\N	2026-06-16 20:24:43.785795+08	0
d3d24453-a92c-4d20-b6aa-a63e7884fdd0	c7ffff31d5223ee4e7419d7999c9d0b0d932f183e9fde48074a15cb2ddab766d	2026-06-16 20:24:45.764466+08	20260519171000_add_classroom_feedback		\N	2026-06-16 20:24:45.764466+08	0
08bf0233-7d95-46ee-9e38-ca777580d5a9	e0adb17ba7b2dafa21ad8b6d9a6975af65b78fa0564208608147fc1ae7c0a855	2026-06-16 20:24:47.562955+08	20260520162000_add_performance_indexes		\N	2026-06-16 20:24:47.562955+08	0
c87cf13b-c016-42ab-b87b-f2d78cc5bcfd	c35510f7fe4b406d9fee9cb801eae3f340c88258031f008ca42808a5ffaa6639	2026-06-16 20:24:49.73625+08	20260522093000_add_meal_management		\N	2026-06-16 20:24:49.73625+08	0
8c25d947-c9b1-4b99-b9a3-01885e337464	49fd5aeececc7b3503203cb332abff9c86aca1a4a3ec43463209f6e4b4b40d8c	2026-06-16 20:24:52.089976+08	20260523120000_add_login_record		\N	2026-06-16 20:24:52.089976+08	0
0d184ec0-9b93-438c-a034-5585f4c07542	cf0b990ca9861efb4156dd8695eac5a322111f24ac2fae9c79238febd35e9396	2026-06-16 20:24:54.238347+08	20260523123000_add_session_token_field		\N	2026-06-16 20:24:54.238347+08	0
ed2c9a08-b33d-4fa5-85bc-1791782aae02	94ed03b3f239c17d7c43f07af655929385dbfaa3649800834a3fdb0851d304c5	2026-06-16 20:24:56.259659+08	20260523160000_add_parent_meal_choice_and_study_material		\N	2026-06-16 20:24:56.259659+08	0
15a2f5cc-27f1-4d75-946e-a34d5a0a9fbd	c7862cfc3e6cfe876436384faf803aacb283d3560c5f6253db372ef161da4862	2026-06-16 20:24:58.269456+08	20260524070000_add_notification_status		\N	2026-06-16 20:24:58.269456+08	0
01f99a7f-fea6-4c16-8f23-bd2e07d041d7	b360477745932cc34990ed655b448bacd3b3cb13339e44fdbe669c5e1e40263f	2026-06-16 20:25:00.284005+08	20260524090000_add_attendance_lesson_student_unique		\N	2026-06-16 20:25:00.284005+08	0
8d5bcc0f-6bd2-4f09-981c-11b5036b25e5	d696f939179199d79ccb6f179da01f976eeb376e29a076c2900865198d2b87f0	2026-06-16 20:25:02.392393+08	20260524102000_add_material_audience		\N	2026-06-16 20:25:02.392393+08	0
48efc9dc-a323-4c2e-a459-e3a8f1e0165d	c0f9f625ef2dfc416d82c83a239e9f14013ffca9f1471ed9356b67a48a0e5c1d	2026-06-16 20:25:04.441721+08	20260525103000_add_meal_template		\N	2026-06-16 20:25:04.441721+08	0
a3630dbd-0ac4-4854-ad68-c795f7b0cc58	943cd2bcce45c565a41fc13c0bffb520417ce63e46f4d366846bdad0dfeef8ad	2026-06-16 20:25:06.401203+08	20260528000000_add_highschool_fields		\N	2026-06-16 20:25:06.401203+08	0
1d74dceb-b945-4d44-bbaa-550991b29b9d	fb6a21000110d495c360056664eb856115985d3d77a2e3b80a54986b5132292f	2026-06-16 20:25:08.224504+08	20260529000000_add_volunteer_fields		\N	2026-06-16 20:25:08.224504+08	0
412eb16e-2779-4de3-b62b-829f18a52e95	882d64449ea10f94c97fc9eae36a3a92fa7487640964a441aee356aa01265832	2026-06-16 20:25:10.148155+08	20260530000000_update_school_scores_add_supplemental		\N	2026-06-16 20:25:10.148155+08	0
a3465438-5091-4b65-931c-f8a63d44fbce	e848a4101c9c8eee923671ec85595677d139888087be25596c049305ce18174f	2026-06-16 20:25:12.391977+08	20260531000000_add_source_fields_and_verified_info		\N	2026-06-16 20:25:12.391977+08	0
2335def5-abac-4d5b-9521-7e1df2d32fd0	ff505403c0053ffaf3ffa5b52e7e2ab6b4d4559e665abf7872c5f4fd3e3a7632	2026-06-16 20:25:14.265061+08	20260603000000_add_teacher_salary		\N	2026-06-16 20:25:14.265061+08	0
43c37ad2-64c9-4db8-9e3d-2d01abcbd3b4	be6b1cd00bfbb89bbb22698b149be318053ade2d010b6dd6d34ea00ac857822c	2026-06-16 20:28:07.824593+08	20260604000000_fix_school_scores		\N	2026-06-16 20:28:07.824593+08	0
8ae9b324-84b4-4b9f-8382-c447af6a973c	8487b2d236b3579c9af2f7062b37c0cba0249c160dd0fbe1a0765e907d5491bb	2026-06-16 20:28:09.957725+08	20260604010000_add_meal_template_allow_double		\N	2026-06-16 20:28:09.957725+08	0
5328df1f-db75-4612-8345-14366a05dc76	a75ceb1463aea17d327aa6e69cb5c011c7d7e2b780efa1bf2277b59d0e533549	2026-06-16 20:28:12.331479+08	20260605000000_add_performance_indexes		\N	2026-06-16 20:28:12.331479+08	0
5a2ae4da-6de5-4a91-95b4-e8555223bee4	bf7048c31ee4561883358180e70f8e27c1961a5b9701e69f82bcbcecf1565b7b	2026-06-16 20:28:14.335687+08	20260607000000_extend_classroom_feedback		\N	2026-06-16 20:28:14.335687+08	0
54494fc9-5f00-4817-b5f8-9a3469d03e39	1efab83a51074edc4ba4105e8eaf67e58976e874f553b63ef3283984779c410f	2026-06-18 21:46:06.583994+08	20260617000000_add_high_school_admit_rank_fields	\N	\N	2026-06-18 21:46:06.570047+08	1
156ab2a1-b0de-47ae-95ef-b0abb78afb09	2add0914ddaf70e849ab8a183310ab0fb9019b7a4d646600e25b19810ad26eab	2026-06-19 10:47:56.839804+08	20260619000000_add_stage_summary	\N	\N	2026-06-19 10:47:56.739519+08	1
310b47af-71c7-41ed-81a8-01622a3b9a27	27fd294c10caa0513ccf925321ddef492e14a9b3da28d1446b8b2c2b09e34f94	2026-06-19 19:45:50.693646+08	20260619010000_extend_feedback_workflow	\N	\N	2026-06-19 19:45:50.683549+08	1
a43957dc-bf90-495a-82dd-59c9e753e841	748e8dc15758fbf59d63b3a5e04c21f8b77040f68cee3eae938c2fc35de0dea3	2026-06-20 16:12:31.143547+08	20260620000000_add_feedback_course_context	\N	\N	2026-06-20 16:12:31.127657+08	1
11715d9b-dff7-472e-a761-23e9bd165e82	a0e5929ad50ff850c2a3dff0fcd667d3dbba7d333ebe43f7dc12040ec2ce5fda	2026-06-26 21:01:57.949646+08	20260626000000_add_study_material_storage_driver	\N	\N	2026-06-26 21:01:57.93485+08	1
32bfd5cc-4055-46da-a735-aa7cc923f879	45a941d169903bd9a79f4e1e52718db02fb01c31293aa1beb4ceac1c6a991524	2026-06-27 15:42:21.403512+08	20260627090000_add_volunteer_rank_data	\N	\N	2026-06-27 15:42:21.323903+08	1
57b9576e-593e-4408-881b-4b9d20986ec6	75b938d4a0fc11f43945ae28c672e13895b2aebfc74f0c0394a97ade20df89f5	2026-06-29 11:34:14.404363+08	20260629090000_add_schedule_periods	\N	\N	2026-06-29 11:34:14.396034+08	1
6bf8fecf-ff1d-4ebb-a1c4-92fee2a8960a	f903ace17733b9c7ff99602c63ef789eb8ea96d9405dbb3afff7cedd91faa692	2026-06-28 12:13:46.767122+08	20260628090000_add_master_volunteer_data	\N	\N	2026-06-28 12:13:46.758854+08	1
ada90f33-ea29-4feb-b243-19cf366f2dab	033735629d94d326ca5ff150eb8c7b3275b0c973bcc913f37d4f1b13582c3346	2026-06-30 19:57:21.620601+08	20260630120000_add_school_batch_category	\N	\N	2026-06-30 19:57:21.59909+08	1
f779209b-a57b-4386-bacd-dce6afc43349	8e8a0d98c941325d9a559cb32405d3170cced46a54f7c30d1a83733dd585f4f9	2026-06-30 22:11:32.01338+08	20260630000000_add_membership	\N	\N	2026-06-30 22:11:31.998752+08	1
de7afe35-d8aa-467e-adfe-85b146980455	b11022f330218916f3ccd01998968c8f42125ed2b8bc6a73a37dcc0fd1fab638	2026-07-05 00:30:35.840596+08	20260705000000_add_classroom_feedback_parent_read_at	\N	\N	2026-07-05 00:30:35.825544+08	1
5f247c68-78c7-41ce-9304-f74f0b7f7ac9	00ff63299e3ba3eb34850915d0794f2815ab6c92daf74bf0a6fc29486f1625bd	2026-07-05 22:32:43.185301+08	20260705220000_add_teacher_tier_level	\N	\N	2026-07-05 22:32:43.175495+08	1
e460c262-ea76-446e-8a9f-6efda78e9047	ef79120170636f4a4085914d3dd6f79984c2081999265464e0bdc556b558ebfe	2026-07-19 00:29:18.96659+08	20260710162000_add_classlesson_ismanual		\N	2026-07-19 00:29:18.96659+08	0
a7e4be08-ee23-4e25-b88d-c2b7aab4dac5	e27fcbba76c637f6d37a340a326edf0f83c2cd1e8ab6384fcad4b76e78819a92	2026-07-05 23:07:19.701312+08	20260705230000_add_teacher_benefits	\N	\N	2026-07-05 23:07:19.692809+08	1
8907ed1d-06ac-4c89-ac08-dd88fbec0e28	6c40f5429e81a586d40c811ea3efe1ec61d3d2febf47abdc9f211d5b9cda7982	2026-07-19 00:29:29.964725+08	20260718170000_add_fileasset_image_variants	\N	\N	2026-07-19 00:29:29.952332+08	1
72a248fe-f07b-41ce-9cea-47ca7972dc9e	3abdc66d97ba16847b75b18baca83cbbb25a12ef805290bc7a2486b960a6b950	2026-07-19 00:29:30.060163+08	20260718223000_feedback_reward_teacher_student_unique	\N	\N	2026-07-19 00:29:29.966693+08	1
51ac57f3-1804-4222-80c7-d3b2ecbdafbc	198782d1c0ec9f79ed316b145ae8197e5de2c6bce69843bad7a24290767c1467	2026-08-11 23:05:41.263843+08	20260811233000_repair_legacy_term_scope	\N	\N	2026-08-11 23:05:41.226155+08	1
b41f00f0-1d5a-4c53-b6ad-3257975aefe1	8b46d021dc52ac080e3f8bbea181e78d1c130f26dc61b9b1394b2752765e3afd	2026-07-19 23:55:14.566402+08	20260719150000_add_intensive_class_boundary	\N	\N	2026-07-19 23:55:14.514684+08	1
dc3ba763-0110-45a9-b1e6-507cdbf15434	5a1f07ccf9f68a1fc6fd42717a121657961f49d0dc5827233e0ff929945d4505	2026-07-19 23:55:14.594961+08	20260719173000_add_intensive_settlement_consistency	\N	\N	2026-07-19 23:55:14.568061+08	1
b0cfbe42-f1c9-49f5-abdf-504bb3921b94	f850b588c5076fddf62a79687de2b505fa3757c5a36f9356440edcca83de31c3	2026-08-26 16:38:09.531359+08	20260826143000_add_lesson_preview_material	\N	\N	2026-08-26 16:38:09.496603+08	1
dfbebe96-0157-458d-9c8d-52fac790f06e	4d57795c6fcf6c196a08650ea0cae536d8bc2f09f73af694a59ef5532a87167f	2026-07-19 23:55:14.617698+08	20260719190000_add_intensive_salary_adjustment_audit	\N	\N	2026-07-19 23:55:14.597418+08	1
ca6cf957-92ad-4f84-9ae8-b5941097d9e5	6d9f1cdf97a8a8260782ceab5009e1a80d7a22270a131568bfb2c280b79179d6	2026-08-16 14:39:14.58991+08	20260815120000_complete_academic_term_record_scope	\N	\N	2026-08-16 14:39:14.55865+08	1
e5cfdcc8-6d22-408b-b805-af205134a7cd	6902f19de3db006b852617429646aa23b9480c2f42ef04fb4f337d1959053b69	2026-07-19 23:55:14.661017+08	20260719193000_link_feedback_parent_messages	\N	\N	2026-07-19 23:55:14.619371+08	1
3c15beee-73eb-4e78-9d07-5eeea68e6638	a89956bbae86e0ad6db361c505c26e152f96b6212ecc7f6926439fbdf90277f2	2026-07-21 11:14:19.321999+08	20260721113000_feedback_reward_daily	\N	\N	2026-07-21 11:14:19.274843+08	1
ddcf6345-5f1c-47ce-8334-68ba7c4641ef	77df54ddb47ddbdd9c5a45a25c925dde821ce6c49c02cb26971b1853c2e0adb9	2026-07-25 23:05:59.215684+08	20260725193000_add_classroom_feedback_lesson_content	\N	\N	2026-07-25 23:05:59.209644+08	1
5172dee7-c8b0-4903-b0b9-2a74b1ebc6de	dd55ea500d4864e788dc704dc142af70bf8d899b7a87fcf4ef0150590bda7ea9	2026-08-16 14:39:14.598726+08	20260815123000_scope_fees_by_academic_term	\N	\N	2026-08-16 14:39:14.59098+08	1
8995ecd9-dd32-43f8-ab16-4f98834af873	2e215bf93f851cf64fb4e54d8600d8b7943eb162b4ecac1659d1998f2869a62e	2026-07-26 22:20:20.15148+08	20260726150000_add_intensive_lesson_review	\N	\N	2026-07-26 22:20:20.110476+08	1
ad6da0e2-6824-4efb-a33d-f490510ce1bf	3eebf5a5d7d98fd547011e743b01df099c4a0da667ee3f2d5e6a3ff9bc8399ec	2026-08-06 00:26:54.161797+08	20260805120000_add_student_meal_attendance	\N	\N	2026-08-06 00:26:54.124654+08	1
53c6c029-8b65-4299-81bd-b2ced7cdd4a3	ed6c11dca6a1a32a4d31942aa25e8b64a61c6889e8b7072b5f6976b2def3e4dd	2026-08-11 14:04:29.805949+08	20260809120000_add_academic_terms_study_hall_activation	\N	\N	2026-08-11 14:04:29.700582+08	1
e19b98e8-5246-4ec6-966a-e0202a5dbdb9	bbd59ca0ac44ccd2816a1d54998ba1815b4daa0504e9123a29afe1a72f88b3d6	2026-08-16 14:39:14.706163+08	20260816150000_add_study_hall_classes	\N	\N	2026-08-16 14:39:14.600031+08	1
4e288f4d-bf0d-4ee3-a344-e003105c2817	1dc9f194be051f6f65f52fc234c1165da458405f95cb3e05eb2fe99fad0df2ff	2026-08-11 16:09:44.365706+08	20260811160000_assign_study_hall_teachers	\N	\N	2026-08-11 16:09:44.327512+08	1
c96b4333-d21d-4272-9329-5eaeff1aecd3	60b91c06aa6a62648f109a68bdce49e09b260782cafe71d4cdbc2869100c6ff5	2026-08-11 21:58:54.169033+08	20260811190000_scope_salary_by_academic_term	\N	\N	2026-08-11 21:58:54.124691+08	1
71390885-9261-4bdd-aafe-e0bd9145fa99	61b52b3a6f7b4f2389f87c8b7f2813bbb0eb01ea81dea043d34b91d5d77ad75a	2026-09-01 17:42:28.47514+08	20260901193000_add_data_correction_trash	\N	\N	2026-09-01 17:42:28.383737+08	1
055a75ea-9925-4883-9d5b-8073ccc2d203	d317df97593a240443ee7ea4b074f7cef12e2af9373bf0e57b274d4c9346e4a8	2026-08-16 15:38:38.085767+08	20260816170000_add_study_hall_photo_groups	\N	\N	2026-08-16 15:38:38.078878+08	1
56ef5719-dc43-42f6-916b-4354280f6d79	d66d714e297b7daa15916fb4d7f06049b339eb41885463bf0fde63f298f1ec2d	2026-08-16 17:59:31.774894+08	20260816180000_add_study_hall_membership_days	\N	\N	2026-08-16 17:59:31.657289+08	1
8e80c104-cf61-4f50-a8a4-423f93c73773	1028388b934e98f1535770bc79ce6a0d8c7e06c2ea5e3caa929bc20f681b586d	2026-08-23 13:34:42.079151+08	20260823100000_add_meal_attendance_sources	\N	\N	2026-08-23 13:34:42.050603+08	1
45044abb-fdd1-4290-ab0c-7c05b369dda0	743418f05c881677902721800776d15dd7550e9b56af69d42ac86512c1cb5f5d	2026-09-04 16:03:50.587286+08	20260904153000_add_material_upload_actor	\N	\N	2026-09-04 16:03:50.531589+08	1
bc04b9a6-9684-49b8-a1a0-6ff4dd3c0900	848c21c1bb8de409f82cbc21cba63ef3967389de85ae3e798753c027cb852db6	2026-08-23 17:15:32.432447+08	20260823183000_harden_lesson_pay_idempotency	\N	\N	2026-08-23 17:15:32.419851+08	1
fd4751bf-0323-4ed7-8cfb-16d8cb97d735	9c9d708b3ea72e797ad85c56c5a502ac8260daba63720a20bcb17d40945a9efd	2026-09-12 20:59:01.408864+08	20260912193000_retire_legacy_schedule	\N	\N	2026-09-12 20:59:01.210423+08	1
ef1ad842-1f8c-4917-8892-8bed4eaf071e	0fb2b95b26df46e7a9db213ede3f1bd6f8549244d9e8dd835e0af03bb03d8604	2026-09-13 16:21:48.038822+08	20260913143000_add_enrollment_subjects	\N	\N	2026-09-13 16:21:47.845968+08	1
9725c633-6a85-4d7c-8dc0-1671a2630b85	6d0a78bbba13d56ad6949bde2280989aafc23d54facb45b6f4778730998523c8	2026-10-04 15:32:13.492231+08	20261004160000_add_feedback_knowledge_card	\N	\N	2026-10-04 15:32:13.449328+08	1
\.


--
-- PostgreSQL database dump complete
--

\unrestrict 07sZzgKhU1LukxieISrdD3stSryqjU42f0MSNociGFslsQYK2La0WZTfU8nbaXr

