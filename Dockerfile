# 多阶段构建优化生产环境镜像

# 阶段 1: 构建主网站前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# 复制主网站 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建主网站
RUN npm run build

# 阶段 2: 构建管理后台前端（如果存在）
FROM node:18-alpine AS admin-frontend-builder

WORKDIR /app

# 复制管理后台前端源码
COPY src/admin/frontend/package*.json ./src/admin/frontend/ 2>/dev/null || true

# 安装依赖并构建（如果目录存在）
RUN if [ -f "src/admin/frontend/package.json" ]; then \
      cd src/admin/frontend && \
      npm ci --only=production && \
      npm run build; \
    fi

COPY src/admin/frontend ./src/admin/frontend 2>/dev/null || true

# 阶段 3: 生产环境
FROM nginx:alpine

# 安装 wget 用于健康检查
RUN apk add --no-cache wget

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 复制主网站构建产物
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# 复制管理后台构建产物（如果存在）
COPY --from=admin-frontend-builder /app/src/admin/frontend/dist /usr/share/nginx/html/admin 2>/dev/null || true

# 创建日志目录
RUN mkdir -p /var/log/nginx

# 暴露端口
EXPOSE 80 443

# 健康检查配置
# 间隔: 30秒, 超时: 3秒, 启动等待: 5秒, 失败阈值: 3次
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
