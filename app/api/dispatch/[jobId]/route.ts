import { NextResponse } from "next/server";
import { getJob, cancelJob } from "@/lib/job-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { jobId } = await params;

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json(
      { error: `Job not found: ${jobId}` },
      { status: 404 },
    );
  }

  return NextResponse.json(job);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { jobId } = await params;

  try {
    cancelJob(jobId);
    return NextResponse.json({ status: "cancelled" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("Job not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    // Job exists but is not running (already finished/cancelled)
    if (message.includes("is not running")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
