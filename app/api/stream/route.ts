import { readJsonlFile, readTeamStatuses, readCommits } from "@/lib/data-reader";
import { calculateUsageCosts } from "@/lib/pricing";
import type { UsageRecord, TripoRecord, DashboardData } from "@/lib/types";
import config from "@/dashboard.config.json";

export const dynamic = "force-dynamic";

function collectData(): DashboardData {
  const basePath = config.data_path;
  const openai = readJsonlFile<UsageRecord>(`${basePath}/openai-usage.jsonl`);
  const gemini = readJsonlFile<UsageRecord>(`${basePath}/gemini-usage.jsonl`);
  const tripo = readJsonlFile<TripoRecord>(`${basePath}/tripo3d-usage.jsonl`);
  const { costs, total } = calculateUsageCosts(openai, gemini, tripo);

  const teams = readTeamStatuses(config.teams_path, basePath);
  const commits = readCommits(`${basePath}/timeline.jsonl`);

  return {
    usage: costs,
    totalCost: total,
    teams,
    commits,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const encoder = new TextEncoder();
  const interval = config.refresh_interval || 5000;

  let timer: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try {
          const data = collectData();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch (e) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`)
          );
        }
      };

      send();
      timer = setInterval(send, interval);
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
