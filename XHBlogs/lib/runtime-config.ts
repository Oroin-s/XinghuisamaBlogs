// lib/runtime-config.ts
// 读取随部署包附带的 site-env.json（该文件不提交 Git，只在打包上传时生成），
// 并允许环境变量覆盖（例如未来在 Cloudflare 上用 wrangler put secret 时）。
// 适配 Appwrite Sites：目前没有环境变量注入通道，所以把配置烘焙进部署产物。
import fs from "node:fs";
import path from "node:path";

export interface RuntimeConfig {
  appwriteEndpoint: string;
  appwriteProjectId: string;
  appwriteBucketId: string;
  appwriteApiKey: string;
  chatBaseUrl: string;
  chatModel: string;
  chatApiKey: string;
  qweatherKey: string;
}

let cached: RuntimeConfig | null = null;

function loadFile(): Partial<RuntimeConfig> {
  const candidates = [
    path.join(process.cwd(), "site-env.json"),
    path.join(process.cwd(), ".next", "server", "site-env.json"),
    "/var/task/site-env.json",
    "/usr/local/server/task/site-env.json",
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        return JSON.parse(fs.readFileSync(c, "utf8")) as Partial<RuntimeConfig>;
      }
    } catch {
      // 忽略坏文件，继续尝试下一个候选路径
    }
  }
  return {};
}

export function getRuntimeConfig(): RuntimeConfig {
  if (cached) return cached;
  const f = loadFile();
  const env = process.env;
  cached = {
    appwriteEndpoint:
      env.APPWRITE_ENDPOINT || f.appwriteEndpoint || "https://cloud.appwrite.io/v1",
    appwriteProjectId: env.APPWRITE_PROJECT_ID || f.appwriteProjectId || "",
    appwriteBucketId: env.APPWRITE_BUCKET_ID || f.appwriteBucketId || "",
    appwriteApiKey: env.APPWRITE_API_KEY || f.appwriteApiKey || "",
    chatBaseUrl:
      env.CHAT_BASE_URL ||
      f.chatBaseUrl ||
      "https://redumbrellacloudlink.himscp.top/v1",
    chatModel: env.CHAT_MODEL || f.chatModel || "deepseek-v4-pro",
    chatApiKey: env.CHAT_API_KEY || f.chatApiKey || "",
    qweatherKey: env.QWEATHER_KEY || f.qweatherKey || "",
  };
  return cached;
}
