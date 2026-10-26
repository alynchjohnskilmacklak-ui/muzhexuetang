# 数据库管理说明

## 1. 开发者如何用 Prisma Studio 查看数据库

开发者在本地开发环境可以运行：

```bash
npm run db:studio
```

Prisma Studio 会打开本地网页（默认 http://localhost:5555），可以直接查看所有数据库表：

- User, Student, Teacher, Course, ClassGroup, ClassLesson
- Enrollment, Attendance, ExamPaper, ClassroomFeedback
- PerformancePost, Notification, StudyMaterial, MealMenu
- 以及其他系统表

**注意：Prisma Studio 只适合开发者或内部维护人员使用。不要直接开放给家长、老师或普通管理员。生产环境不要随便暴露 Prisma Studio 端口。**

## 2. 管理员如何用数据管理中心维护数据

管理员登录后进入管理端侧边栏「数据管理」（/data-admin），可以管理以下业务数据：

| 模块 | 说明 |
|------|------|
| 学员 | 学员档案、状态、联系信息 |
| 教师 | 教师档案、在职状态、教学信息 |
| 班级 | 班级信息、开班状态 |
| 课次 | 排课课次、上课状态 |
| 课时 | 报名课时记录（只读，调整需走「课时调整」） |
| 考勤 | 签到/请假/缺勤记录 |
| 试卷 | 试卷记录、发布状态 |
| 课堂反馈 | 课堂反馈、作业 |
| 通知 | 系统通知、推送状态 |
| 学习资料 | 学习资料、发布状态 |
| 就餐 | 菜单记录 |
| 数据健康 | 数据完整性检查 |

功能包括：搜索、状态筛选、查看详情、编辑、软删除、恢复、导出。

## 3. 哪些数据可以软删除

| 实体 | 软删除方式 | 恢复方式 |
|------|-----------|---------|
| Student | status → INACTIVE | status → ACTIVE |
| Teacher | status → RESIGNED | status → ACTIVE |
| ClassGroup | status → ARCHIVED | status → ACTIVE |
| ClassLesson | status → CANCELLED | status → SCHEDULED |
| ExamPaper | status → DELETED | status → PUBLISHED |
| Notification | status → DELETED | status → ACTIVE |
| StudyMaterial | status → DELETED | status → PUBLISHED |
| ClassroomFeedback | status → DELETED | status → PUBLISHED |
| PerformancePost | deletedAt = now | deletedAt = null |

删除操作必须填写删除原因，系统会自动记录 DeletedRecord 和 ActivityLog。

## 4. 课时为什么不能直接改，要走课时调整

Enrollment 的课时字段（usedHours、remainHours）涉及：
- 学员总课时
- 报名课时账目
- 考勤扣减记录
- HourTransaction 流水

如果在数据表里直接改数字，会导致：
- 课时账目对不上
- HourTransaction 缺失，家长端无法看到调整来源
- 考勤扣减与实际课时不一致

**课时调整流程：**
1. 在「课时」Tab 或学员详情中点击「课时调整」
2. 选择学员和调整类型（增加/减少/修正）
3. 填写课时数和原因
4. 确认后系统自动：
   - 更新 Student.remainHours / totalHours
   - 更新 Enrollment.remainHours / totalHours
   - 写入 HourTransaction 记录
   - 写入 ActivityLog
   - 家长端课时明细可看到「管理员调整」

## 5. 常用命令

```bash
# 数据库管理
npm run db:studio          # 打开 Prisma Studio
npm run db:push            # 推送 schema 到数据库
npm run db:generate        # 重新生成 Prisma Client

# 数据维护
npm run cleanup:residual -- --dry-run    # 预览残留数据清理
npm run normalize:hours -- --dry-run     # 预览课时标准化
npm run check:data                       # 数据完整性检查
npm run fix:duplicate-attendance         # 修复重复考勤
npm run export:data                      # 导出核心业务数据到 exports/

# 账号维护
npm run hash-passwords                   # 哈希化明文密码
npm run fix-parent-binding               # 修复家长绑定
```

## 6. 数据备份与导出

运行 `npm run export:data` 将核心业务数据导出为 JSON 文件，保存到 `exports/` 目录。

导出内容包括：学员、教师、班级、课次、报名课时、考勤、试卷、课堂反馈、通知、学习资料、就餐菜单。

敏感字段（密码、token 等）已自动过滤，不会出现在导出文件中。

**注意：`exports/` 目录已在 .gitignore 中，不会提交到 Git。**

## 7. 数据健康检查

在数据管理中心「数据健康」Tab 可以查看数据完整性检查结果，包括：

- 重复考勤
- 孤儿通知（关联学员不存在）
- 孤儿试卷（关联学员不存在）
- 课时负数异常
- 课时账目不平
- 家长绑定异常
- 离职教师仍有未来课程
- 归档班级仍有未来课次
- 已删试卷仍有可见通知
- 停用学员仍有有效报名

也可通过命令行运行：`npm run check:data`

第一版检查只报告问题，不自动修复。发现高严重性问题请运维人员核实后手动处理。

## 8. 生产环境注意事项

- 不要在生产环境暴露 Prisma Studio 端口
- 执行清理脚本前必须先备份数据库
- 建议先使用 `--dry-run` 预览影响范围，确认后再执行正式清理
- 所有数据管理中心的写操作都会记录到 ActivityLog
- 所有删除操作都会写入 DeletedRecord 保存原始数据
- 课时调整必须通过「课时调整」入口，不要直接改数据库
