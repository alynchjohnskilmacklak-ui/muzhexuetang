# 生产部署入口（Docker Compose 流程）

> 生产环境统一使用 **Docker 预构建发布包**：本地 Docker 构建镜像 → 导出 tar → 上传服务器 → `docker load` → 打备份 tag → `docker compose` 重建。
> 不要上传整个项目目录；不要在服务器上执行 `npm install`、`npm run build`、`prisma db push` 或旧版源码部署脚本。

**旧 PM2 / tar.gz 流程（`scripts/build-linux-release.ps1`、`deploy-prebuilt-tar.sh`、`阿里云预构建部署说明.md`、`docs/prebuilt-deployment.md`）已废弃**，仅供历史参考，不要再走。

## 0. 前置条件

- 本机 Docker Desktop 已启动。
- Docker Buildx 可用（v0.21.2，已与官方 checksums 核对一致，装在 `~/.docker/cli-plugins/docker-buildx.exe`）。
- 固定 builder **`mzt-release`**（docker-container driver）已创建；发布脚本会自动检查并在缺失时创建。
- 生产服务器 SSH：`101.200.191.201` root，compose 目录 `/opt/edu-manage-docker/source`。
- SSH 优先使用本机密钥/agent；如使用密码，在运行脚本前配置本机环境变量 `EDU_DEPLOY_SSH_PASSWORD`。脚本不再内置密码，不要将密码写入项目文件或提交 Git。

## 1. 唯一发布脚本

项目根目录 `deploy-release.py` 是**唯一**发布入口，固定执行：

```text
docker buildx build --progress=plain --load --builder mzt-release --target runner \
  --build-arg NPM_REGISTRY=https://registry.npmmirror.com -t edu-manage-app:<tag> .
```

`--load` 把镜像放入本地镜像库，供后续 `docker save` 导出。

```powershell
python deploy-release.py                      # 构建 app(runner) 并部署
python deploy-release.py --migrator           # 构建 migrator，备份数据库并执行双库迁移后更新 app
python deploy-release.py --migrator-only      # 仅部署并运行 migrator；不重建 app
python deploy-release.py --skip-build --tag <tag>   # 复用 release/ 已有 tar 只做部署
python deploy-release.py --skip-build --skip-upload --migrator --tag <tag>  # 续跑已加载到服务器的同 tag 镜像
python deploy-release.py --dry-run            # 只打印将执行的命令
```

脚本自动完成：本地构建（逐步骤计时）→ `docker save` 到 `release/edu-manage-app-<tag>.tar`（含 `.sha256`）→ 上传服务器 → 服务器 `sha256sum` 校验 → `docker load` → 删除远端临时 tar（保留本地 release 包）→ 旧版打备份 tag `pre-<tag>-backup-app` → 切 `:latest` → 可选的数据库备份及双库迁移 → 重建 app → 最多等待 240 秒，严格检查容器 healthy、`/login` HTTP 200 和实际镜像 ID，并输出每阶段耗时。
`--migrator-only` 使用相同的本地构建、tar、SHA256 校验、远端 load 与数据库备份流程，只更新 migrator 镜像并执行双库迁移及 schema 对齐检查，不切换或重启 app。用于独立发布迁移工具或 schema 防漂移校验时，避免顺带部署 app 工作区改动。
普通 app-only 发布会先比较本地 `prisma/schema.prisma` 和 `prisma/migrations` 与生产 migrator 镜像中的指纹；不一致就拒绝切换 app，要求先用 `--migrator` 完成备份、迁移和数据库 schema 对齐检查。这样漏带 `--migrator` 时会在 app 上线前失败关闭。
`--skip-upload` 仅用于上次发布已将该 tag 镜像加载到服务器的续跑场景；它要求同时指定 `--skip-build`，并在切换任何 tag 前逐个校验本地与服务器镜像 ID 完全一致。确认后会删除服务器上重复的临时 tar 副本释放空间，本地 release 包保留。

## 2. 服务器侧（不需要手工操作）

```text
/opt/edu-manage-docker/source/
├── compose.production.yaml      # app(target:runner)、migrate(target:migrator)、db、redis
├── .env                         # POSTGRES_PASSWORD、AUTH_SECRET、NEXTAUTH_URL 等（勿外传）
└── docker/postgres/init-databases.sql
```

- `app` 服务：`image: edu-manage-app:latest`，重建用 `--no-build`（镜像来自本地 load）。
- `migrate` 服务：一次性迁移容器。使用 `--migrator` 或 `--migrator-only` 时，先调用现有运行中 app 的 `scripts/backup-db.sh`，备份成功后执行 `docker compose -f compose.production.yaml --profile tools run --rm --no-deps migrate`；Compose `run` 默认使用已加载镜像且不触发构建，任一数据库迁移失败或 schema 与 Prisma 不一致都会阻止 app 更新。
- 此迁移流程用于已有生产环境，要求旧 app 可执行备份、备份目录可写。首次安装或旧 app 已不可用时，脚本会拒绝迁移，应由管理员先完成数据库备份/初始化，不会绕过备份保护。
- 失败时保留本地 release tar、远端已加载的版本镜像和备份镜像。普通发布失败会自动恢复旧 app 并再次检查健康状态；一旦尝试过数据库迁移，禁止自动降级，需人工核查双库状态及恢复方案，避免旧代码与新结构冲突。

## 3. 回滚

每个版本部署前，服务器先把旧 `:latest` 打成 `pre-<tag>-backup-app`（及 `pre-<tag>-backup-migrator`）备份 tag。没有数据库结构变更时，回滚即：

```bash
docker tag edu-manage-app:pre-<tag>-backup-app edu-manage-app:latest
cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml up -d --no-build app
```

## 4. 验证

发布脚本自带：通过 Compose 获取 app 容器 ID（不依赖固定容器名），检查容器状态 healthy、`/login` HTTP 200、`docker inspect` 确认实际镜像 ID 与本次发布一致。任何不通过都会失败退出，不再仅打印状态。追加人工检查：

```powershell
# 浏览器打开 https://muzhexuetang.xyz/login
# 教师端 /teacher/feedback、家长端 /parent/class-feedback 各走一遍
```

## 5. 构建缓存（重要）

- Dockerfile 已挂 BuildKit 持久缓存（`/root/.npm` + `/app/.next/cache`）：无代码变化时全层 CACHED（约 1s）；仅改页面约 130s；冷构建约 372s。
- **不要例行执行 `docker buildx prune`**——那会清掉 `.next/cache` 加速缓存。只留意磁盘占用即可（`docker buildx du` 查看）。
- 构建镜像内容与部署回滚方式不受缓存挂载影响（cache mount 仅构建期使用）。

## 6. 发布脚本离线回归测试

```powershell
python -m unittest discover -s scripts/tests -p test_deploy_release.py -v
```

测试使用模拟 SSH、容器和健康检查，不连接服务器、不运行迁移，也不修改真实数据库。
