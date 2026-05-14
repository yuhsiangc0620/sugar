import OpenAI from "openai";
import { soundLabelCopy } from "./audio-labels";
import type { DailyAggregate } from "./types";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
}

export async function generateDailyInterpretation(
  aggregate: DailyAggregate,
  promptMemory: string[],
): Promise<string> {
  const client = getOpenAIClient();

  if (!client) {
    return fallbackSummary(aggregate, promptMemory);
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "你是 SUGAR，一台溫柔、詩意、低壓力的資料糖果機。請用繁體中文寫一段每日理解。不要診斷使用者，不要命令，只描述資料與可能的差異。",
      },
      {
        role: "user",
        content: JSON.stringify({
          aggregate,
          promptMemory,
          instruction:
            "請輸出 2 到 4 句。核心是 Data → Interpretation → Reflection → Correction → Evolution，並保留 AI 理解可能不等於使用者自己的空間。",
        }),
      },
    ],
    max_output_tokens: 420,
  });

  return response.output_text?.trim() || fallbackSummary(aggregate, promptMemory);
}

export function fallbackSummary(aggregate: DailyAggregate, promptMemory: string[] = []): string {
  const topLabel = aggregate.topSoundLabel ? soundLabelCopy[aggregate.topSoundLabel] : "很少聲音";
  const acceptedText =
    aggregate.dispensedCount === 0
      ? "今天還沒有吐出糖果"
      : `你接受了 ${aggregate.acceptedCount} 顆糖果，也退回了 ${aggregate.returnedCount} 顆`;
  const memoryHint = promptMemory.at(-1)
    ? `我也記得你上一次修正過：${promptMemory.at(-1)}`
    : "這只是一個初步的理解，還等你把它校正成真正的今天。";

  return `今天最明顯的聲音像是「${topLabel}」，工作痕跡約 ${aggregate.workDurationMinutes} 分鐘。${acceptedText}，接受率是 ${Math.round(
    aggregate.acceptanceRate * 100,
  )}%。也許獎勵和需要之間還有一點距離。${memoryHint}`;
}
