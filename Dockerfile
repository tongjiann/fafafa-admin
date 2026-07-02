# ===== 构建阶段 =====
FROM node:22 AS build

# 启用 corepack 并激活 pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# 先复制依赖描述文件，利用 Docker 缓存加速
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# 复制源码并构建
COPY . .
RUN pnpm build

# ===== 运行阶段 =====
FROM nginx:alpine

# 将构建产物复制到 Nginx 静态目录
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
