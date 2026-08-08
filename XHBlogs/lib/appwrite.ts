// lib/appwrite.ts - Appwrite Storage 存储桶集成模块
//
// 配置来源优先级：环境变量 > 部署包内 site-env.json（见 lib/runtime-config.ts）
//   APPWRITE_ENDPOINT  例: https://cloud.appwrite.io/v1
//   APPWRITE_PROJECT_ID      你的 Appwrite 项目 ID
//   APPWRITE_BUCKET_ID       你的存储桶 ID
//   APPWRITE_API_KEY         具有 storage.read / storage.write 权限的 API Key（仅服务端使用）
//
// 公开直链格式（图片无需鉴权即可访问）：
//   {endpoint}/storage/buckets/{bucketId}/files/{fileId}/view?project={projectId}

import { getRuntimeConfig } from "./runtime-config";

const rc = getRuntimeConfig();

export const appwriteConfig = {
  endpoint: rc.appwriteEndpoint,
  projectId: rc.appwriteProjectId,
  bucketId: rc.appwriteBucketId,
  apiKey: rc.appwriteApiKey,
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