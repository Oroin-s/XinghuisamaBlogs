from fastapi import APIRouter, Body, UploadFile, File, Form
import httpx

router = APIRouter()

# ============================================================
# Appwrite Storage 存储桶支持
# ------------------------------------------------------------
# 在后台「图库配置管理」中填写：
#   图床 API 地址 = https://cloud.appwrite.io/v1/{projectId}/{bucketId}
#   图床 Token    = 具有 storage.read / storage.write 权限的 API Key
# URL 中包含 appwrite 时自动切换为 Appwrite 存储桶上传。
# 上传成功后返回的图片直链格式：
#   https://cloud.appwrite.io/v1/storage/buckets/{bucketId}/files/{fileId}/view?project={projectId}
# ============================================================


def parse_appwrite_config(url: str):
    """从 url = {endpoint}/v1/{projectId}/{bucketId} 解析 Appwrite 连接参数"""
    parts = url.rstrip('/').split('/')
    if len(parts) < 2:
        return False, None, None, None
    project_id, bucket_id = parts[-2], parts[-1]
    if project_id == 'v1' or not project_id or not bucket_id:
        return False, None, None, None
    try:
        v1_idx = parts.index('v1')
    except ValueError:
        return False, None, None, None
    endpoint = '/'.join(parts[:v1_idx + 1])
    return True, endpoint, project_id, bucket_id


def _appwrite_headers(project_id: str, api_key: str):
    return {
        "X-Appwrite-Project": project_id,
        "X-Appwrite-Key": api_key,
        "X-Appwrite-Response-Format": "1.0.0",
        "Accept": "application/json",
    }


@router.post("/test")
async def test_picbed_connection(payload: dict = Body(...)):
    url = payload.get("url", "").strip().rstrip('/')
    token = payload.get("token", "").strip()

    if not url or not token:
        return {"success": False, "message": "图床 API 地址和 Token 不能为空"}

    # 📦 Appwrite 存储桶模式：探测项目 + 存储桶可访问性
    is_app, endpoint, project_id, bucket_id = parse_appwrite_config(url)
    if is_app:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{endpoint}/storage/buckets/{bucket_id}",
                    headers=_appwrite_headers(project_id, token),
                )
            if resp.status_code == 200:
                data = resp.json()
                return {"success": True, "message": f"Appwrite 连接成功！存储桶: {data.get('name', bucket_id)}"}
            msg = resp.json().get("message", f"HTTP {resp.status_code}")
            return {"success": False, "message": f"Appwrite 校验失败: {msg}"}
        except Exception as e:
            return {"success": False, "message": f"网络异常: {str(e)}"}

    # 兼容 Lsky Pro 图床模式
    test_endpoint = f"{url}/api/v1/profile"
    if not token.startswith("Bearer "):
        token = f"Bearer {token}"

    headers = {"Authorization": token, "Accept": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(test_endpoint, headers=headers)
            if response.status_code != 200:
                return {"success": False, "message": f"校验失败，服务器返回了 {response.status_code} 错误"}

            data = response.json()
            if data.get("status") is True:
                user_email = data.get("data", {}).get("email", "未知用户")
                return {"success": True, "message": f"连接成功！当前账户: {user_email}"}
            else:
                return {"success": False, "message": f"Token 无效: {data.get('message', '未知错误')}"}
    except Exception as e:
        return {"success": False, "message": f"网络异常: {str(e)}"}


# 👇 【全新追加】：真实的图床图片上传接口
@router.post("/upload")
async def upload_image(
        file: UploadFile = File(...),
        url: str = Form(...),
        token: str = Form(...)
):
    url = url.strip().rstrip('/')
    token = token.strip()

    # 📦 Appwrite 存储桶模式（优先）
    is_app, endpoint, project_id, bucket_id = parse_appwrite_config(url)
    if is_app:
        try:
            content = await file.read()
            files = {'file': (file.filename, content, file.content_type)}
            form = {"fileId": "unique()"}
            headers = _appwrite_headers(project_id, token)
            # 设置公开读取权限，发布后直链可直接访问
            headers["X-Appwrite-JSON"] = '{"createRead":["\\"any\\""]}'

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{endpoint}/storage/buckets/{bucket_id}/files",
                    headers=headers,
                    data=form,
                    files=files,
                )
            if response.status_code not in (200, 201):
                return {"success": False, "message": f"Appwrite 上传失败 ({response.status_code}): {response.text[:200]}"}
            data = response.json()
            file_id = data.get("$id")
            if not file_id:
                return {"success": False, "message": f"Appwrite 返回异常: {data}"}
            img_url = (
                f"{endpoint}/storage/buckets/{bucket_id}/files/"
                f"{file_id}/view?project={project_id}"
            )
            return {"success": True, "message": "上传成功 (Appwrite 存储桶)", "url": img_url}
        except Exception as e:
            return {"success": False, "message": f"Appwrite 上传异常: {str(e)}"}

    # 兼容 Lsky Pro 图床模式
    if not token.startswith("Bearer "):
        token = f"Bearer {token}"

    upload_endpoint = f"{url}/api/v1/upload"
    headers = {
        "Authorization": token,
        "Accept": "application/json"
    }

    try:
        content = await file.read()
        # 封装为 httpx 支持的文件上传格式
        files = {'file': (file.filename, content, file.content_type)}

        # 上传图片可能较慢，将超时设置为 30 秒
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(upload_endpoint, headers=headers, files=files)

            if response.status_code != 200:
                return {"success": False, "message": f"上传失败，图床返回了 {response.status_code} 错误"}

            data = response.json()
            # 兼容 Lsky Pro 的返回格式
            if data.get("status") is True:
                img_url = data.get("data", {}).get("links", {}).get("url")
                return {"success": True, "message": "上传成功", "url": img_url}
            else:
                return {"success": False, "message": f"图床拒绝接收: {data.get('message', '未知')}"}
    except httpx.ReadTimeout:
        return {"success": False, "message": "图片上传超时，请检查网络或图片是否过大"}
    except Exception as e:
        return {"success": False, "message": f"服务器异常: {str(e)}"}
