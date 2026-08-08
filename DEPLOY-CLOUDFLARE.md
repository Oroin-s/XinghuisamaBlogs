# ☁️ Cloudflare 云端部署指南（XinghuisamaBlogs）

> 构建在 **Cloudflare 服务器**上进行（无需本地构建），图片/文件存储使用 **Appwrite 存储桶**。

## 一、仓库结构

| 目录 | 说明 |
|---|---|
| `XHBlogs` | 博客前端（Next.js 16 + OpenNext，部署到 Cloudflare Workers） |
| `my-blog-manager` | 本地写作/管理控制台（含 Appwrite 图床直传支持） |

## 二、Cloudflare 部署（一次性操作）

### 1. 在 Cloudflare 仪表盘连接 GitHub 仓库
1. 打开 https://dash.cloudflare.com/workers  → **Create** → **Import a GitHub Repository**
2. 授权 GitHub（连接 `heiehiehi/XinghuisamaBlogs`）
3. **Build Configuration**：
   - Root directory: `XHBlogs`
   - Build command: `npm run build`（= `next build && opennextjs-cloudflare build`）
   - 平台自动识别 `wrangler.jsonc`（Worker 名 `xinghuisama-blog`）
4. 点 Deploy，等待云端构建（约 2~4 分钟）
5. 部署完成即为 `https://xinghuisama-blog.<你的子域>.workers.dev`

### 2. 环境变量（Worker 端，设置于 Dashboard > Settings > Variables & Secrets）
```text
# 机密（Secrets）
APPWRITE_API_KEY  = 你在 Appwrite 控制台创建的 API Key（storage.read/write）
GEMINI_API_KEY    = （可选）AI 猫猫助理的 Gemini Key
QWEATHER_KEY     = （可选）和风天气 Token

# 非机密（Vars）
APPWRITE_ENDPOINT  = https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID = 6a71f41f0026ea0d8883
APPWRITE_BUCKET_ID  = 6a7284f30026de941d80
```

> 已创建：**存储桶 `blog-images`**（ID `6a7284f30026de941d80`，公开读取，10MB 上限，支持 png/jpg/jpeg/webp/gif/svg）
> API Key `cloudflare-deploy` 已创建，请到 Worker 的 **Settings→Variables** 添加 Secret：`APPWRITE_API_KEY`（值见本机 `~/.appwrite_worker_key`）

### 3. 更新博客内容
每次在本地控制台写完文章/改完设置后：
```bash
git add -A && git commit -m "更新文章" && git push origin main
```
Cloudflare 会自动重新构建部署。

## 三、Appwrite 存储桶（图片图床）

### 控制台方式（推荐一键）
1. 打开 https://cloud.appwrite.io → 创建项目（如 `XinghuisamaBlogs`）
2. **API Keys** → Create Key → 勾选 `Storage: read/write` → 复制 Key
3. **Storage → Create Bucket**：
   - 名称：`blog-images`
   - 最大文件：10MB
   - 权限：勾选“公开读取 / Read any”
4. 记录 3 个值：**Project ID / Bucket ID / API Key**，填入上方的 Worker 环境变量。

### CLI 方式（可选）
```bash
appwrite login                     # 浏览器授权
appwrite projects create ...       # 按提示创建项目
appwrite storage buckets create ...# 创建存储桶
```

### 使用入口
- **写入图片**：本机打开 `my-blog-manager`（`Start.bat`）→「图库配置管理」填写：
  - 图床 API 地址：`https://sgp.cloud.appwrite.io/v1/{项目ID}/{存储桶ID}`（本项目为 `.../v1/6a71f41f0026ea0d8883/6a7284f30026fe941d80`）
  - 图床 Token：你的 API Key（可向我要 ~/.appwrite_worker_key 的内容）
  - 点「发送探针测试」→ 通过后上传图片即为 Appwrite 直链
- **前端上传 API**：部署后的博客提供 `POST /api/storage/upload`（multipart，<10MB，返回 Appwrite 直链），环境变量需配置完。