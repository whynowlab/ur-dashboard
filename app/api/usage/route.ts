import { NextResponse } from "next/server";
import { readJsonlFile } from "@/lib/data-reader";
import { calculateUsageCosts } from "@/lib/pricing";
import type { UsageRecord, TripoRecord } from "@/lib/types";
import config from "@/dashboard.config.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const basePath = config.data_path;
  const openai = readJsonlFile<UsageRecord>(`${basePath}/openai-usage.jsonl`);
  const gemini = readJsonlFile<UsageRecord>(`${basePath}/gemini-usage.jsonl`);
  const tripo = readJsonlFile<TripoRecord>(`${basePath}/tripo3d-usage.jsonl`);

  const { costs, total } = calculateUsageCosts(openai, gemini, tripo);
  return NextResponse.json({ costs, total });
}
