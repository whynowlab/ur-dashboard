import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { UsageRecord, TripoRecord, ModelCost } from "./types";

interface PricingConfig {
  models: Record<string, [number, number]>;
  tripo_price_per_task: number;
  default_price: [number, number];
}

// Built-in defaults (same as original hardcoded values)
const DEFAULT_PRICING: PricingConfig = {
  models: {
    "gpt-5.4-2026-03-05": [2.5, 15.0],
    "gpt-5.4": [2.5, 15.0],
    "gpt-5.4-pro": [30.0, 180.0],
    "gemini-3.1-pro-preview": [2.0, 12.0],
    "gemini-3.1-flash-lite-preview": [0.1, 0.4],
  },
  tripo_price_per_task: 0.3,
  default_price: [1.0, 3.0],
};

function loadPricing(): PricingConfig {
  // 1. Check JARVIS_PRICING_PATH env var
  const envPath = process.env.JARVIS_PRICING_PATH;
  if (envPath && existsSync(envPath)) {
    try {
      return JSON.parse(readFileSync(envPath, "utf-8"));
    } catch {
      /* fall through */
    }
  }

  // 2. Check project-local pricing.json
  const localPath = join(process.cwd(), "pricing.json");
  if (existsSync(localPath)) {
    try {
      return JSON.parse(readFileSync(localPath, "utf-8"));
    } catch {
      /* fall through */
    }
  }

  // 3. Built-in defaults
  return DEFAULT_PRICING;
}

let cachedPricing: PricingConfig | null = null;

function getPricing(): PricingConfig {
  if (!cachedPricing) cachedPricing = loadPricing();
  return cachedPricing;
}

export function calculateUsageCosts(
  openaiRecords: UsageRecord[],
  geminiRecords: UsageRecord[],
  tripoRecords: TripoRecord[]
): { costs: ModelCost[]; total: number } {
  const pricing = getPricing();
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
    const prices = pricing.models[model] || pricing.default_price;
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
    const tripoCost = tripoRecords.length * pricing.tripo_price_per_task;
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
