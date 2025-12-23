# Docker 安装任务

## 进度

- [x] 启用并安装 WSL 2
- [x] 安装 Ubuntu 发行版
- [x] 设置 WSL 用户密码
- [x] 下载 Docker Desktop
- [x] 安装 Docker Desktop
- [x] 验证 Docker 安装

## 项目 Docker 环境配置

- [x] 分析项目结构
  - [x] 初步查看根目录
  - [x] 分析 immersa-3d 目录 (发现已有 docker-compose.yml)
  - [x] 检查现有 Dockerfile 和 compose 配置
  - [x] 分析依赖 (Node.js/Python/Java)
- [x] 制定 Docker 修复/优化方案 (Implementation Plan)
- [x] 验证现有配置并修复
  - [x] Frontend 构建成功
  - [x] Backend 构建成功
  - [x] AI Service 构建成功 (已修复 Hash 和网络问题)
- [x] 创建 Dockerfile (Frontend/Backend)
  - [x] Backend Dockerfile (Spring Boot)
  - [x] Frontend Dockerfile (Next.js)
  - [x] AI Service Dockerfile (Python)
- [x] 创建 docker-compose.yml
- [x] 验证运行 (服务已启动)

## 优化与配置

- [x] 配置 Docker 镜像加速源 (已配置 DaoCloud 等通用源，需重启 Docker)
- [x] 配置域名与 Nginx 反向代理
  - [x] 创建 Nginx 配置文件
  - [x] 更新 docker-compose.yml 添加 Nginx
  - [/] 验证域名访问 (等待用户配置 Hosts)
