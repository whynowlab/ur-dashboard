import { NextResponse } from "next/server";
import {
  dispatchJob,
  getAllJobs,
  MAX_CONCURRENT,
} from "@/lib/job-manager";
import { detectCli, getCachedCapabilities } from "@/lib/cli-detector";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Check CLI availability (use cache if warm, otherwise detect)
    let caps = getCachedCapabilities();
    if (!caps) {
      caps = await detectCli();
    }

    if (!caps.canDispatch) {
      return NextResponse.json(
        { error: "Claude CLI is not available on this machine" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { agent, prompt, permissionMode, timeout } = body as {
      agent?: string;
      prompt?: string;
      permissionMode?: string;
      timeout?: number;
    };

    if (!agent || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: agent, prompt" },
        { status: 400 },
      );
    }

    // Validate agent name — no path traversal
    if (/[/\\]|\.\./.test(agent)) {
      return NextResponse.json(
        { error: "Invalid agent name" },
        { status: 400 },
      );
    }

    // Validate timeout
    if (timeout !== undefined) {
      if (typeof timeout !== "number" || !isFinite(timeout) || timeout <= 0 || timeout > 3600) {
        return NextResponse.json(
          { error: "Timeout must be a positive number between 1 and 3600 seconds" },
          { status: 400 },
        );
      }
    }

    // Validate permissionMode allowlist
    const ALLOWED_MODES = ["default", "acceptEdits", "plan"];
    if (permissionMode && !ALLOWED_MODES.includes(permissionMode)) {
      return NextResponse.json(
        { error: `Invalid permissionMode. Allowed: ${ALLOWED_MODES.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate prompt length (max 10KB)
    if (prompt.length > 10240) {
      return NextResponse.json(
        { error: "Prompt too long (max 10KB)" },
        { status: 400 },
      );
    }

    const job = dispatchJob(agent, prompt, { permissionMode, timeout });

    return NextResponse.json({ jobId: job.jobId, status: job.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Agent not found
    if (message.includes("Agent not found")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Concurrent limit
    if (message.includes("Concurrent job limit")) {
      return NextResponse.json(
        { error: message, maxConcurrent: MAX_CONCURRENT },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const jobs = getAllJobs();
    return NextResponse.json({ jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
