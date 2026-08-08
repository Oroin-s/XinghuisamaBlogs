// lib/appwrite.ts - Appwrite Storage 存储桶集成模块
//
// 环境变量说明（在 Cloudflare 后台 / wrangler 中配置）：
//   APPWRITE_ENDPOINT  例: https://cloud.appwrite.io/v1
//   APPWRITE_PROJECT_ID      你的 Appwrite 项目 ID
//   APPWRITE_BUCKET_ID       你的存储桶 ID
//   APPWRITE_API_KEY         具有 storage.read / storage.write 权限的 API Key（仅服务端使用）
//
// 公开直链格式（图片无需鉴权即可访问）：
//   {endpoint}/storage/buckets/{bucketId}/files/{fileId}/view?project={projectId}

export const appwriteConfig = {
  endpoint: process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
  projectId: process.env.APPWRITE_PROJECT_ID || "",
  bucketId: process.env.APPWRITE_BUCKET_ID || "",
  apiKey: process.env.APPWRITE_API_KEY || "",
};

/** 是否已配置 Appwrite 存储桶 */
export function isAppwriteConfigured(): boolean {
  return Boolean(
    appwriteConfig.projectId &&
      appwriteConfig.bucketId &&
      appwriteConfig.endpoint
  );
}

/** 根据 fileId 生成 Appwrite 图片直链（公开可访问） */
export function appwriteFileUrl(fileId: string): string {
  const { endpoint, projectId, bucketId } = appwriteConfig;
  return `${endpoint.replace(/\/$/, "")}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
}

/** 解析任意链接是否为 Appwrite 文件直链，是则返回 fileId */
export function extractAppwriteFileId(url: string): string | null {
  const m =
    url.match(
      /\/storage\/buckets\/[^/]+\/files\/([^/?#]+)\/view(?:\?|$|#)/i
    );
  return m ? m[1] : null;
}

/** 上传文件到 Appwrite 存储桶（POST /api/storage/upload），返回可公开访问的直链 */
export async function uploadToAppwrite(file: File | Blob, fileName?: string) {
  const fd = new FormData();
  fd.append("file", file, fileName || "image.png");
  const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `上传失败 (${res.status})`);
  }
  return data as { url: string; fileId: string; message: string };
}