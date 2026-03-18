import { scanEnvironment } from "@/lib/env-detector";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = scanEnvironment();

  // Add dashboard config paths
  const projectRoot = process.cwd();
  env.configFiles.push(
    ...[
      { name: "dashboard.config.json", path: `${projectRoot}/dashboard.config.json` },
      { name: "pricing.json", path: `${projectRoot}/pricing.json` },
    ]
      .filter((f) => {
        try { require("fs").statSync(f.path); return true; } catch { return false; }
      })
      .map((f) => {
        const s = require("fs").statSync(f.path);
        return {
          path: f.path,
          name: f.name,
          exists: true,
          mtime: s.mtime.toISOString(),
          size: s.size,
          type: "file" as const,
          category: "Dashboard",
        };
      })
  );

  return Response.json(env);
}
