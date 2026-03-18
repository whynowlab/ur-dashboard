"use client";

import { useEffect, useRef, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface Props {
  jobId: string;
  onClose: () => void;
}

type JobStatus = "running" | "completed" | "failed" | "cancelled" | "timeout";

interface LogLine {
  type: "stdout" | "stderr" | "system";
  data: string;
  timestamp: string;
}

const STATUS_BADGE: Record<JobStatus, { label: string; className: string }> = {
  running: { label: "Running", className: "bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-600 border-red-200" },
  cancelled: { label: "Cancelled", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  timeout: { label: "Timeout", className: "bg-orange-100 text-orange-700 border-orange-200" },
};

export function JobOutputView({ jobId, onClose }: Props) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<JobStatus>("running");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // EventSource connection
  useEffect(() => {
    const es = new EventSource(`/api/dispatch/${jobId}/stream`);

    es.addEventListener("log", (event) => {
      try {
        const line = JSON.parse(event.data) as LogLine;
        setLogs((prev) => [...prev, line]);
      } catch {
        /* ignore parse errors */
      }
    });

    es.addEventListener("status", (event) => {
      try {
        const data = JSON.parse(event.data) as { status: JobStatus };
        setStatus(data.status);
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("done", (event) => {
      try {
        const data = JSON.parse(event.data) as {
          status: JobStatus;
          exitCode?: number;
          duration?: string;
        };
        setStatus(data.status);
        if (data.exitCode !== undefined) setExitCode(data.exitCode);
        if (data.duration) setDuration(data.duration);
      } catch {
        /* ignore */
      }
      es.close();
    });

    es.onerror = () => {
      // Connection lost — mark as failed if still running
      setStatus((prev) => (prev === "running" ? "failed" : prev));
      es.close();
    };

    return () => es.close();
  }, [jobId]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await fetch(`/api/dispatch/${jobId}`, { method: "DELETE" });
    } catch {
      /* ignore */
    } finally {
      setCancelling(false);
    }
  }

  const badge = STATUS_BADGE[status];
  const truncatedId = jobId.length > 12 ? `${jobId.slice(0, 12)}...` : jobId;

  return (
    <GlassCard className="relative flex flex-col max-h-[600px]">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Job Output
        </h2>
        <span className="text-xs text-gray-400 font-mono">{truncatedId}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Terminal output */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 leading-relaxed"
      >
        {logs.length === 0 && status === "running" && (
          <span className="text-gray-500">Waiting for output...</span>
        )}
        {logs.map((line, i) => (
          <div
            key={i}
            className={
              line.type === "stderr"
                ? "text-red-400"
                : line.type === "system"
                  ? "text-yellow-400 italic"
                  : "text-green-400"
            }
          >
            {line.data}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-gray-500 space-x-3">
          {exitCode !== null && (
            <span>Exit code: <span className={exitCode === 0 ? "text-emerald-600" : "text-red-500"}>{exitCode}</span></span>
          )}
          {duration && (
            <span>Duration: {duration}</span>
          )}
        </div>
        {status === "running" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              cancelling
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
            }`}
          >
            {cancelling ? "Cancelling..." : "Cancel"}
          </button>
        )}
      </div>
    </GlassCard>
  );
}
