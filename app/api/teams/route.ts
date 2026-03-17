import { NextResponse } from "next/server";
import { readTeamStatuses } from "@/lib/data-reader";
import config from "@/dashboard.config.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const teams = readTeamStatuses(config.teams_path, config.data_path);
  return NextResponse.json({ teams });
}
