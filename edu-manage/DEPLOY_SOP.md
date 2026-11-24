# 牧哲学堂部署 SOP（可复用版）

> 目标：**同一版本重复发布 = 秒级**；改代码后发布 = 构建（缓存）+ 上传，全程一条命令。
> 本文件固化了所有部署变量，避免每次发布重复踩坑。

---

## 0. 部署链路现状（一句话）

本地 Docker Buildx（持久 `mzt-release` builder）→ 镜像 tag 发布 → tar 导出 → scp 上传 → 服务器 docker load → 切 latest → 迁移（migrator）→ compose 重建 → 健康检查。

**耗时构成（最近一次 908s）**：
| 环节 | 耗时 | 能否复用 |
|---|---|---|
| 构建（代码未变，层缓存命中） | 65s~375s | ✅ 缓存命中即秒级；`--auto` 本地已有镜像直接跳过 |
| 导出 tar（977MB + 518MB） | ~60s | ✅ 复用 release/ 已有 tar |
| 上传 1.5GB | 460s + 243s | ✅ 服务器同 tag 镜像 ID 一致则整体跳过 |
| 双库迁移 + schema 校验 | 42.7s | ❌ 每次必跑（安全校验，已是最快） |
| compose 重建 + 健康检查 | 47s + 21s | ❌ 每次必跑 |

**结论**：耗时大头是「构建 + 上传」，两者都可复用 → 引入 `--auto` 自动判定。

---

## 1. 唯一发布命令

### 1.1 日常发布（推荐，自动复用）

```powershell
# 在 D:\01muzhexuetang\muzhexuetang\coding\edu-manage 下执行
$env:MZT_BUILDER="desktop-linux"
python deploy-release.py --tag 20261028 --auto --migrator
```

`--auto` 行为：
1. 本地已有 `edu-manage-app:20261028` 镜像 → **跳过构建**；
2. 服务器同 tag 镜像 ID 与本地一致 → **跳过导出/上传/load**（秒级完成，只做迁移+重启）；
3. 任一不一致 → 自动降级为「构建（缓存）+ 上传」，保证正确。

### 1.2 只改前端/API 代码后的发布

```powershell
python deploy-release.py --tag 20261028 --auto          # 不带 --migrator：跳过迁移
```

> 仅当 prisma/schema.prisma 或 prisma/migrations/ 有改动时才需要 `--migrator`。

### 1.3 强制全量重建（极少数情况）

```powershell
python deploy-release.py --tag 20261028 --migrator --no-cache
```

---

## 2. 已固化的部署配置（不要再改）

| 项 | 固定值/规则 | 原因 |
|---|---|---|
| 镜像 tag | 日期版本，如 `20261028`（同一版本保持同一 tag） | tag 不变 → `--auto` 可整链路复用 |
| buildx | Windows 发布统一使用持久构建器 `mzt-release`，运行 `docker buildx build --builder mzt-release --load`；服务器只接收已构建镜像 | 复用 `/root/.npm` 和 `/app/.next/cache`，不要切回普通 `docker build` 或新建临时 builder |
| NPM_REGISTRY | `https://registry.npmmirror.com` | 已固化进 Dockerfile build-arg 默认 |
| apt 源 | `mirrors.aliyun.com`（debs 阶段） | 已固化进 Dockerfile |
| Dockerfile | **不要改动 base 镜像 / deps 层结构** | 改动会击穿层缓存，构建回到 12 分钟 |
| `--mount=type=cache` | Dockerfile 使用 BuildKit 持久缓存；发布脚本必须指定 `mzt-release` | 新 builder 没有历史缓存，会退化为冷构建 |
| release/ 目录 | 保留当前 + 上一版 tar | 服务器镜像旧备份由脚本自动清理（prune_old_backups） |

---

## 3. 数据库迁移（已修复，此后稳定）

生产 `_prisma_migrations` 历史遗留已在本轮修复：
- `20260517062915_add_missing_model_baselines`：两库补记（对象早已存在）；
- 初中库索引 `attendanceKe_key → attendanceKey_ke`：已重命名；
- 高中库缺字段已由 migrate deploy 补齐。

**之后每次 `--migrator` 只跑增量迁移 + schema 校验（约 40s）**，不会再卡历史迁移。
新迁移写完后必须：
1. `npx prisma migrate dev` 生成 migration.sql（本地校验）；
2. **migration.sql 用 `ADD COLUMN IF NOT EXISTS` 幂等写法**（生产库可能已有手工执行的列）；
3. 提交 migration 后带 `--migrator` 发布。

---

## 4. 企微通道（随版本发布，无需额外操作）

生产 `.env` 已含 `QYWX_*` 全套配置；企微 API 白名单已加生产 IP `101.200.191.201`。
**本地调试调用企微接口会报 60020（本地 IP 不在白名单），属预期，一切企微验证走生产。**

---

## 5. 回滚

```powershell
# 脚本内置：发布失败自动回滚 app（迁移未发生时）；
# 手动回滚：
python deploy-release.py --tag <上一版本tag> --auto        # 旧 tag 镜像仍在服务器，直接复用
```

服务器保留 `pre-<tag>-backup-app / -migrator` 最近一份回滚点，脚本自动清理更旧的。

---

## 6. 故障速查

| 症状 | 处理 |
|---|---|
| `docker buildx` unknown command | 发布机应使用 Docker Desktop Buildx；先用 `docker buildx ls` 检查 `mzt-release`，不要静默回退普通 `docker build` |
| `mzt-release` builder 不可用 | 先恢复该持久 builder，再发布；不要删除其 BuildKit 容器、状态卷或缓存 |
| 双库迁移失败 `type ... already exists` | 生产库对象已存在但缺迁移记录 → 按 §3 补记 `_prisma_migrations` |
| `database still differs from schema` | 生产库与 schema 有 drift → 服务器上 `prisma migrate diff --script` 定位差异，手动补 SQL 或补迁移 |
| 上传中断 | 重跑同一条命令：服务器 sha256 校验会跳过已完整上传的 tar |
| 健康检查超时 | `docker logs edu-manage-app-1` 看启动错误；app-only 发布失败可自动回滚 |

---

## 7. 验证清单（发布完成后）

- [ ] 日志出现 `=== 发布完成 ===`，`TOTAL` 有值
- [ ] `app healthy，/login HTTP 200，实际镜像已核对`
- [ ] 生产 `https://muzhexuetang.xyz/login` 返回 200
- [ ] 生产 DB 确认新字段/迁移（如有）
