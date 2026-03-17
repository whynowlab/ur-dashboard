import { NextResponse } from "next/server";
import { readCommits } from "@/lib/data-reader";
import config from "@/dashboard.config.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const commits = readCommits(`${config.data_path}/timeline.jsonl`);
  return NextResponse.json({ commits });
}
