// open-next.config.ts - Cloudflare 适配器配置 (@opennextjs/cloudflare)
// 不使用 R2 增量缓存，使用默认缓存策略（由 Appwrite 提供内容存储）
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});