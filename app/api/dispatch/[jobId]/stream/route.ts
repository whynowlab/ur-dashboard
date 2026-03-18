import { getJob, getJobLogs } from "@/lib/job-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { jobId } = await params;

  // Validate job exists before opening stream
  const job = getJob(jobId);
  if (!job) {
    return new Response(JSON.stringify({ error: `Job not found: ${jobId}` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const POLL_INTERVAL = 200;

  const stream = new ReadableStream({
    async start(controller) {
      let lastIndex = 0;

      const emit = (eventName: string, payload: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      };

      if (request.signal.aborted) {
        controller.close();
        return;
      }

      request.signal.addEventListener("abort", () => {
        controller.close();
      });

      while (!request.signal.aborted) {
        try {
          const newLogs = getJobLogs(jobId, lastIndex);

          for (const log of newLogs) {
            emit("log", {
              type: log.type,
              data: log.data,
              timestamp: log.timestamp,
            });
          }

          lastIndex += newLogs.length;

          // Check if job is done
          const current = getJob(jobId);
          if (current && current.status !== "running") {
            const duration =
              current.endedAt && current.startedAt
                ? new Date(current.endedAt).getTime() -
                  new Date(current.startedAt).getTime()
                : undefined;

            emit("done", {
              type: "done",
              status: current.status,
              exitCode: current.exitCode ?? null,
              duration: duration ?? null,
            });

            controller.close();
            return;
          }
        } catch {
          // Job may have been removed; close gracefully
          emit("log", { type: "system", data: "Job no longer available" });
          controller.close();
          return;
        }

        await sleep(POLL_INTERVAL);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
