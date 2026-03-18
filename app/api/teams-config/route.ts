import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { getAutoDetectedTeams, getAllAgentFilenames } from "@/lib/agent-scanner";
import type { TeamConfig } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getTeamsJsonPath(): string {
  return join(homedir(), ".claude", "agents", "teams.json");
}

export async function GET() {
  const teamsJsonPath = getTeamsJsonPath();

  if (existsSync(teamsJsonPath)) {
    try {
      const raw = readFileSync(teamsJsonPath, "utf-8");
      const config: TeamConfig = JSON.parse(raw);
      return Response.json({ teams: config.teams, source: "file", allAgents: getAllAgentFilenames() });
    } catch (e) {
      return Response.json(
        { error: `Failed to parse teams.json: ${String(e)}` },
        { status: 500 }
      );
    }
  }

  // Fallback: auto-detect from agent files
  const teams = getAutoDetectedTeams();
  return Response.json({ teams, source: "auto", allAgents: getAllAgentFilenames() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Re-scan: delete teams.json and return fresh auto-detect
    if (body._rescan) {
      const teamsJsonPath = getTeamsJsonPath();
      if (existsSync(teamsJsonPath)) unlinkSync(teamsJsonPath);
      return Response.json({ success: true, rescan: true });
    }

    // Validate body shape
    if (!body || typeof body !== "object" || !body.teams || typeof body.teams !== "object") {
      return Response.json(
        { error: "Invalid body: expected { teams: { [name]: { description, agents } } }" },
        { status: 400 }
      );
    }

    // Validate each team entry
    for (const [key, val] of Object.entries(body.teams)) {
      const team = val as Record<string, unknown>;
      if (!team || typeof team !== "object" || !Array.isArray(team.agents)) {
        return Response.json(
          { error: `Invalid team "${key}": must have agents array` },
          { status: 400 }
        );
      }
    }

    const teamsJsonPath = getTeamsJsonPath();

    // Ensure directory exists
    const dir = dirname(teamsJsonPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(teamsJsonPath, JSON.stringify(body, null, 2), "utf-8");
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: `Failed to write teams config: ${String(e)}` },
      { status: 500 }
    );
  }
}
