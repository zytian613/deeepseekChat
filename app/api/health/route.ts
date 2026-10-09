import { getConfig } from "@/lib/deepseek";
import { json } from "@/lib/api";

export async function GET() {
  const config = getConfig();
  return json({
    status: "ok",
    model: config.model,
    baseURL: config.baseURL,
    mock: config.mock,
    hasApiKey: Boolean(config.apiKey),
    version: "0.1.0",
    time: new Date().toISOString(),
  });
}
