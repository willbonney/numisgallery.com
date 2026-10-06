#!/usr/bin/env node

/**
 * Start or stop the local services the pre-push e2e hook requires.
 * PocketBase and Hermes are separate compose projects.
 */

const { spawnSync } = require("child_process");
const http = require("http");
const path = require("path");

const root = path.join(__dirname, "..");
const hermes = path.join(root, "..", "hermes");
const action = process.argv[2];

function docker(args, options = {}) {
  const result = spawnSync("docker", args, options);
  if (result.error) {
    console.error(`Failed to run docker: ${result.error.message}`);
    process.exit(1);
  }
  return result;
}

function compose(cwd, args) {
  const result = docker(["compose", ...args], { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function containerState(name) {
  const result = docker(
    ["inspect", "-f", "{{.State.Status}}", name],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function ensureContainer(name, composeArgs) {
  const state = containerState(name);
  if (state === "running") {
    console.log(`${name} is already running`);
    return;
  }
  if (state) {
    console.log(`Starting existing ${name} container...`);
    const started = docker(["start", name], { stdio: "inherit" });
    if (started.status !== 0) process.exit(started.status || 1);
    return;
  }
  compose(root, composeArgs);
}

function waitForHttp(url, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, { timeout: 2000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve();
          return;
        }
        retry();
      });
      req.on("error", retry);
      req.on("timeout", () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(attempt, 1000);
    };
    attempt();
  });
}

async function up() {
  const build = process.argv.includes("--build");
  console.log("Starting PocketBase...");
  ensureContainer("pocketbase", ["up", "-d"]);
  console.log("Starting Hermes (FlareSolverr + scraper)...");
  compose(hermes, build ? ["up", "-d", "--build"] : ["up", "-d"]);
  console.log("Waiting for health checks...");
  await waitForHttp("http://127.0.0.1:8090/api/health", 60000);
  await waitForHttp("http://127.0.0.1:3001/health", 60000);
  console.log("PocketBase and the scraper are up.");
}

function down() {
  console.log("Stopping Hermes...");
  compose(hermes, ["down"]);
  console.log("Stopping PocketBase...");
  compose(root, ["down"]);
}

async function main() {
  if (action === "up") {
    await up();
    return;
  }
  if (action === "down") {
    down();
    return;
  }
  console.error("Usage: node scripts/services.js <up|down>");
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
