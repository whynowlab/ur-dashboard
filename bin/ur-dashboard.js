#!/usr/bin/env node

const { spawn } = require("child_process");
const { join } = require("path");
const { existsSync } = require("fs");
const os = require("os");

// --- Colors (ANSI escape codes, no deps) ---
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bgCyan: "\x1b[46m",
  bgMagenta: "\x1b[45m",
};

// --- Banner ---
function printBanner() {
  console.log();
  console.log(`${c.cyan}${c.bold}  ╭──────────────────────────────────────╮${c.reset}`);
  console.log(`${c.cyan}${c.bold}  │${c.reset}                                      ${c.cyan}${c.bold}│${c.reset}`);
  console.log(`${c.cyan}${c.bold}  │${c.reset}   ${c.magenta}${c.bold}ur${c.white}${c.bold}-dashboard${c.reset}  ${c.dim}v${version}${c.reset}              ${c.cyan}${c.bold}│${c.reset}`);
  console.log(`${c.cyan}${c.bold}  │${c.reset}   ${c.dim}AI Orchestrator Monitor${c.reset}             ${c.cyan}${c.bold}│${c.reset}`);
  console.log(`${c.cyan}${c.bold}  │${c.reset}                                      ${c.cyan}${c.bold}│${c.reset}`);
  console.log(`${c.cyan}${c.bold}  ╰──────────────────────────────────────╯${c.reset}`);
  console.log();
}

function printStatus(label, value, ok) {
  const icon = ok ? `${c.green}●${c.reset}` : `${c.yellow}○${c.reset}`;
  console.log(`  ${icon} ${c.dim}${label}${c.reset} ${c.white}${value}${c.reset}`);
}

// --- Parse args ---
const args = process.argv.slice(2);
let port = 3000;
let claudeHome = "";

const pkg = require(join(__dirname, "..", "package.json"));
const version = pkg.version || "0.1.0";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--claude-home" && args[i + 1]) {
    claudeHome = args[i + 1];
    i++;
  } else if (args[i] === "--help" || args[i] === "-h") {
    printBanner();
    console.log(`  ${c.bold}Usage${c.reset}`);
    console.log(`    ${c.cyan}ur-dashboard${c.reset} ${c.dim}[options]${c.reset}`);
    console.log();
    console.log(`  ${c.bold}Options${c.reset}`);
    console.log(`    ${c.cyan}--port${c.reset} <number>        Port ${c.dim}(default: 3000)${c.reset}`);
    console.log(`    ${c.cyan}--claude-home${c.reset} <path>   Claude home dir ${c.dim}(default: ~/.claude)${c.reset}`);
    console.log(`    ${c.cyan}-h, --help${c.reset}             Show this message`);
    console.log();
    process.exit(0);
  }
}

// --- Environment detection ---
if (claudeHome) {
  process.env.CLAUDE_HOME = claudeHome;
}

const home = claudeHome || join(os.homedir(), ".claude");
const hasOrch = existsSync(join(home, "orchestrator", "state"));
const hasSettings = existsSync(join(home, "settings.json"));
const hasClaude = existsSync(join(os.homedir(), "CLAUDE.md"));

let setupLevel = "none";
if (hasOrch) setupLevel = "full";
else if (existsSync(home)) setupLevel = "minimal";

const setupLabel = {
  full: `${c.green}${c.bold}Full Setup${c.reset}`,
  minimal: `${c.yellow}${c.bold}Minimal Setup${c.reset}`,
  none: `${c.dim}No Environment${c.reset}`,
};

// --- Print startup ---
printBanner();

console.log(`  ${c.bold}Environment${c.reset}`);
printStatus("Claude home", home, existsSync(home));
printStatus("Orchestrator", hasOrch ? "detected" : "not found", hasOrch);
printStatus("Settings", hasSettings ? "detected" : "not found", hasSettings);
printStatus("CLAUDE.md", hasClaude ? "detected" : "not found", hasClaude);
console.log(`  ${c.dim}─────────────────────────────────${c.reset}`);
console.log(`  ${c.dim}Setup level:${c.reset} ${setupLabel[setupLevel]}`);
console.log();

console.log(`  ${c.bold}Server${c.reset}`);
console.log(`  ${c.green}●${c.reset} ${c.dim}Port${c.reset}     ${c.white}${port}${c.reset}`);
console.log(`  ${c.green}●${c.reset} ${c.dim}Open${c.reset}     ${c.cyan}${c.bold}http://localhost:${port}${c.reset}`);
console.log();
console.log(`  ${c.dim}Starting...${c.reset}`);
console.log();

// --- Start server ---
const pkgDir = join(__dirname, "..");
const isWindows = process.platform === "win32";
const cmd = isWindows ? "npx.cmd" : "npx";

const server = spawn(cmd, ["next", "start", "-p", String(port)], {
  cwd: pkgDir,
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
  shell: isWindows,
});

server.on("close", (code) => {
  process.exit(code || 0);
});

process.on("SIGINT", () => server.kill());
process.on("SIGTERM", () => server.kill());
