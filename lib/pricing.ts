import type { UsageRecord, TripoRecord, ModelCost } from "./types";

// Prices per 1M tokens [input, output]
const MODEL_PRICES: Record<string, [number, number]> = {
  "gpt-5.4-2026-03-05": [2.5, 15.0],
  "gpt-5.4": [2.5, 15.0],
  "gpt-5.4-pro": [30.0, 180.0],
  "gemini-3.1-pro-preview": [2.0, 12.0],
  "gemini-3.1-flash-lite-preview": [0.1, 0.4],
};

const TRIPO_PRICE_PER_TASK = 0.3;

export function calculateUsageCosts(
  openaiRecords: UsageRecord[],
  geminiRecords: UsageRecord[],
  tripoRecords: TripoRecord[]
): { costs: ModelCost[]; total: number } {
  const modelMap = new Map<
    string,
    { prompt: number; completion: number; provider: "openai" | "gemini" }
  >();

  for (const r of openaiRecords) {
    const existing = modelMap.get(r.model) || {
      prompt: 0,
      completion: 0,
      provider: "openai" as const,
    };
    existing.prompt += r.prompt_tokens;
    existing.completion += r.completion_tokens;
    modelMap.set(r.model, existing);
  }

  for (const r of geminiRecords) {
    const existing = modelMap.get(r.model) || {
      prompt: 0,
      completion: 0,
      provider: "gemini" as const,
    };
    existing.prompt += r.prompt_tokens;
    existing.completion += r.completion_tokens;
    modelMap.set(r.model, existing);
  }

  const costs: ModelCost[] = [];
  let total = 0;

  for (const [model, data] of modelMap) {
    const prices = MODEL_PRICES[model] || [1.0, 3.0];
    const cost =
      (data.prompt / 1_000_000) * prices[0] +
      (data.completion / 1_000_000) * prices[1];
    costs.push({
      model,
      provider: data.provider,
      prompt_tokens: data.prompt,
      completion_tokens: data.completion,
      cost,
    });
    total += cost;
  }

  if (tripoRecords.length > 0) {
    const tripoCost = tripoRecords.length * TRIPO_PRICE_PER_TASK;
    costs.push({
      model: "tripo3d",
      provider: "tripo",
      prompt_tokens: 0,
      completion_tokens: 0,
      cost: tripoCost,
    });
    total += tripoCost;
  }

  return { costs: costs.sort((a, b) => b.cost - a.cost), total };
}
