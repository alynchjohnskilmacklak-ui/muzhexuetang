# 本地 Codex 浏览器与 Docker 维护流程

这份流程用于避免 Codex 浏览器打开未运行的 `localhost:3000`，并安全回收 Docker WSL 数据盘空间。先检查服务，再操作浏览器；维护 Docker 数据盘时必须完成恢复验证。

## 打开本地页面

1. 检查 Docker Desktop、容器和本地端口：

   ```powershell
   rtk docker desktop status
   rtk docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
   Get-NetTCPConnection -State Listen -LocalPort 3000,5432 -ErrorAction SilentlyContinue
   ```

2. 如果本地数据库容器未运行，先恢复 Docker Desktop 与 `edu-manage-local-db`，并确认 PostgreSQL 接受连接：

   ```powershell
   rtk docker exec edu-manage-local-db pg_isready
   ```

3. 如果 3000 端口没有监听，在项目目录用隐藏的后台进程启动开发服务器。这样会运行项目已有的 `predev` 数据库 schema 检查，进程不依赖临时终端会话：

   ```powershell
   $logRoot = Join-Path $env:TEMP 'muzhexuetang-local-dev'
   New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
   Start-Process -FilePath (Get-Command rtk).Source `
     -ArgumentList @('npm', 'run', 'dev') `
     -WorkingDirectory 'D:\01muzhexuetang\muzhexuetang\coding\edu-manage' `
     -WindowStyle Hidden `
     -RedirectStandardOutput (Join-Path $logRoot 'stdout.log') `
     -RedirectStandardError (Join-Path $logRoot 'stderr.log')
   ```

   如果端口已经监听，先复用已有服务，不要再启动第二份。schema 预检失败时查看 `%TEMP%\muzhexuetang-local-dev\stderr.log`，不要跳过检查。

4. 打开 Codex 内置浏览器之前，先确认页面能返回 HTTP 200：

   ```powershell
   Invoke-WebRequest 'http://localhost:3000/teacher/dashboard' -TimeoutSec 20 -UseBasicParsing
   ```

   `ERR_CONNECTION_REFUSED` 表示本地服务没有监听，是服务启动问题；不要把它当成浏览器故障反复刷新。服务就绪后，再在 Codex 浏览器打开 `/teacher/dashboard?division=JUNIOR`，检查页面并截图。

## 回收 Docker WSL 数据盘空间

1. 先核对 Docker 空间分类和实际数据盘文件。只清理明确可再生成的构建缓存；保留数据库卷及带版本标签的回滚镜像：

   ```powershell
   rtk docker system df -v
   rtk docker buildx du --builder mzt-release
   ```

   如需为 `mzt-release` 回收旧缓存，可保留约 20 GB：

   ```powershell
   rtk docker buildx prune --builder mzt-release --max-used-space 20GB --force
   ```

   prune 释放的是 Docker 文件系统内部空间，不保证 D 盘的 VHDX 文件立刻变小。

2. 检查 Docker 数据挂载后，再标记已释放的 ext4 空间供宿主回收。只有当 `findmnt` 确认 `/mnt/docker-desktop-disk` 是 Docker 数据盘时才执行 `fstrim`：

   ```powershell
   rtk wsl -d docker-desktop -u root -- findmnt -T /mnt/docker-desktop-disk
   rtk wsl -d docker-desktop -u root -- fstrim -v /mnt/docker-desktop-disk
   ```

3. 得到用户授权后，正常停止 Docker Desktop 和 WSL；核实发行版已停止、数据盘已卸载。用管理员 PowerShell 对实际确认的动态 VHDX 执行 `Optimize-VHD -Mode Quick`。此操作需要管理员权限；如果当前令牌没有权限，停在这里并说明需要管理员授权。

4. 如果 Docker Desktop 报错路径为 `Docker\run\dockerInference` 或 `docker-secrets-engine\engine.sock`，先停止 Docker 和 WSL。只有在检查确认对应目录仅含该单个失效 reparse-point socket 后，才把**整个运行目录**改名留档并创建空目录供 Docker 重建。不要直接删除 socket；Windows 可能因该特殊文件返回错误 1920。不要使用 “Reset to factory defaults”，不要删除数据盘、数据库卷或镜像。

5. 压缩后启动 Docker Desktop，确认两个容器、数据库、网站和磁盘指标：

   ```powershell
   rtk docker desktop status
   rtk docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
   rtk docker exec edu-manage-local-db pg_isready
   Get-NetTCPConnection -State Listen -LocalPort 3000,5432 -ErrorAction SilentlyContinue
   Get-Item 'D:\DockerData\engine-469-user\disk\docker_data.vhdx'
   Get-PSDrive D
   ```

   最后请求本地页面确认 HTTP 200，并在 Codex 浏览器截图确认。比较 D 盘可用 GiB 和 VHDX 实际文件大小；资源管理器显示的整数百分比可能会四舍五入，看起来暂时不变。

## 本次验证结果

- 清理 51.14 GB BuildKit 缓存后，单独压缩最初只释放约 1.68 GiB；原因是 ext4 尚未 trim。
- trim Docker 数据盘后再压缩，`docker_data.vhdx` 从 110.89 GiB 降至 58.22 GiB；Docker 重启后约 58.25 GiB，D 盘可用空间从约 32.96 GiB 增至约 85.61 GiB。
- Docker 重启时两个旧 socket 曾阻断启动。将仅包含目标 socket 的两个运行目录改名留档并创建新目录后，Docker、PostgreSQL 和本地教师端恢复正常。
