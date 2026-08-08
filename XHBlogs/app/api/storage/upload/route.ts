// app/api/storage/upload/route.ts
// 将图片上传到 Appwrite 存储桶，返回公开直链
import { NextResponse } from "next/server";
import { appwriteConfig } from "../../../../lib/appwrite";

export const runtime = "edge";

export async function POST(req: Request) {
  if (!appwriteConfig.apiKey || !appwriteConfig.projectId || !appwriteConfig.bucketId) {
    return NextResponse.json(
      { message: "服务端未配置 Appwrite（检查 APPWRITE_API_KEY / PROJECT_ID / BUCKET_ID）" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "缺少 file 字段" }, { status: 400 });
    }

    // 文件大小上限 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: "文件不能超过 10MB" }, { status: 400 });
    }

    const { endpoint, projectId, bucketId, apiKey } = appwriteConfig;

    // 直接调用 Appwrite REST API（edge 运行时下比官方 SDK 更稳妥）
    const body = new FormData();
    body.set("fileId", "unique()");
    body.append("file", file, file.name);

    const resp = await fetch(`${endpoint}/storage/buckets/${bucketId}/files`, {
      method: "POST",
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
        "X-Appwrite-Response-Format": "1.0.0",
        "X-Appwrite-JSON": '{"createRead":["\\"any\\""]}',
      },
      body,
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json(
        { message: data.message || `Appwrite 上传失败 (${resp.status})` },
        { status: resp.status }
      );
    }

    const fileId = data.$id;
    const url = `${endpoint.replace(/\/$/, "")}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
    return NextResponse.json({ url, fileId, message: "上传成功" });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || "上传异常" }, { status: 500 });
  }
}