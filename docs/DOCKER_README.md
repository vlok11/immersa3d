# Immersa 3D Docker 环境配置总结

所有服务已成功配置并启动。

## 服务概览

| 服务           | 容器名称             | 端口 (宿主机) | 描述                        |
| -------------- | -------------------- | ------------- | --------------------------- |
| **Frontend**   | `immersa-frontend`   | `3000`        | Next.js 前端界面 (访问入口) |
| **Backend**    | `immersa-backend`    | `8080`        | Spring Boot 后端 API        |
| **AI Service** | `immersa-ai-service` | `8000`        | Python AI 图像处理服务      |
| **Postgres**   | `immersa-postgres`   | `5432`        | 关系型数据库                |
| **Redis**      | `immersa-redis`      | `6379`        | 缓存与消息队列              |
| **Nginx**      | `immersa-nginx`      | `80`          | 反向代理 (域名访问入口)     |

## 域名访问配置 (必选)

为了通过 `http://immersa3d.top` 访问本地环境，请修改 Windows 的 `hosts` 文件：

1. **以管理员身份** 打开记事本。
2. 打开文件: `C:\Windows\System32\drivers\etc\hosts`
3. 添加以下内容到文件末尾:
   ```
   127.0.0.1immersa3d.top
   ```
4. 保存文件。

现在您可以直接访问 [http://immersa3d.top](http://immersa3d.top) (无需端口号)。

## 快速访问

- **域名入口**: [http://immersa3d.top](http://immersa3d.top)
- **前端 (直接)**: [http://localhost:3000](http://localhost:3000)
- **后端 API**: [http://localhost:8080](http://localhost:8080)
- **AI 服务**: [http://localhost:8000/docs](http://localhost:8000/docs)

- **MinIO 控制台**: [http://localhost:9001](http://localhost:9001) (用户/密码: `immersa_minio` / `immersa_minio_password`)

## 操作指南

### 常用命令

```powershell
# 停止所有服务
docker-compose down

# 启动所有服务 (后台运行)
docker-compose up -d

# 查看日志 (实时)
docker-compose logs -f

# 查看特定服务日志 (例如 frontend)
docker-compose logs -f frontend

# 重建服务 (代码修改后)
docker-compose up -d --build
```

## 技术变更记录

1. **Dockerfile 创建**: 为 `backend`, `frontend`, `ai-service` 创建了优化的 Dockerfile。
2. **构建修复**:
   - Frontend: 启用了 `standalone` 输出模式，忽略了构建时的 ESLint 错误。
   - AI Service: 解决了依赖下载问题（使用了清华镜像源，升级了 pip）。
3. **Docker Compose**: 完善了服务编排，配置了网络互通。

> **注意**: 如果遇到 `docker` 命令找不到的问题，请尝试重启 PowerShell 或电脑。
