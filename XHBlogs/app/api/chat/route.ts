// app/api/chat/route.ts
// OpenAI 兼容中转（可由 site-env.json / 环境变量配置 baseURL 与 model）
import { siteConfig } from "../../../siteConfig";
import { getRuntimeConfig } from "../../../lib/runtime-config";

// 去除 edge runtime：Appwrite Sites / Node 环境下运行
export async function POST(req: Request) {
  console.log("🚀 [1/5] 路由进入：OpenAI 兼容中转调用");

  try {
    const { message } = await req.json();
    const rc = getRuntimeConfig();

    const apiKey = rc.chatApiKey.trim();
    if (!apiKey) {
      console.error("❌ 找不到 CHAT_API_KEY");
      return new Response(JSON.stringify({ error: "Key missing" }), { status: 500 });
    }

    const modelId = rc.chatModel;
    const baseUrl = rc.chatBaseUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/chat/completions`;

    console.log(`📡 呼叫模型: ${modelId} @ ${baseUrl}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: siteConfig.geminiConfig.systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: siteConfig.geminiConfig.maxOutputTokens,
        temperature: siteConfig.geminiConfig.temperature,
        stream: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("🚨 模型接口拒绝请求:", JSON.stringify(data));
      return new Response(
        JSON.stringify({
          error: `模型拒绝访问: ${response.status}`,
          details: data.error?.message || data.message || "未知错误",
        }),
        { status: response.status }
      );
    }

    console.log("✅ [3/5] 模型成功响应");
    const reply =
      data.choices?.[0]?.message?.content || "本喵现在不想理你喵...";

    console.log("🎉 [4/5] 回复已生成，准备传回前端");

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("🔥 [5/5] 运行时崩溃:", error?.message);
    return new Response(JSON.stringify({ error: error?.message }), {
      status: 500,
    });
  }
}

export async function GET() {
  const rc = getRuntimeConfig();
  return new Response(
    JSON.stringify({ status: "Ready", model: rc.chatModel }),
    { status: 200 }
  );
}