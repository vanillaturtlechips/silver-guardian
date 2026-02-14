# 1단계: 빌드 스테이지
FROM oven/bun:latest AS builder
WORKDIR /app

# 의존성 파일만 먼저 복사해서 설치 (캐시 활용)
COPY package.json bun.lockb ./
RUN bun install

# 나머지 소스 코드를 복사 (여기서 .dockerignore가 node_modules를 제외해줍니다)
COPY . .

# 빌드 실행
RUN bun run build

# 2단계: 실행 스테이지
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
