#!/usr/bin/env node

/**
 * Check if required services are running for E2E tests
 * This script is used by the pre-push hook to verify services before running tests
 */

const { execSync } = require("child_process");
const http = require("http");

const services = {
  pocketbase: {
    name: "PocketBase",
    check: () => {
      try {
        const output = execSync(
          'docker ps --filter name=pocketbase --filter status=running --format "{{.Names}}"',
          { encoding: "utf-8", stdio: "pipe" },
        );
        return output.trim().includes("pocketbase");
      } catch {
        return false;
      }
    },
    startCommand: "npm run dev:pocketbase",
  },
  hermes: {
    name: "Hermes",
    check: () => {
      try {
        const output = execSync(
          'docker ps --filter name=hermes-scraper --filter status=running --format "{{.Names}}"',
          { encoding: "utf-8", stdio: "pipe" },
        );
        return output.trim().includes("hermes-scraper");
      } catch {
        return false;
      }
    },
    startCommand: "npm run dev:hermes",
  },
  scraper: {
    name: "Scraper API",
    check: () => {
      // Check if scraper health endpoint is accessible (works for both Node.js and Docker)
      return new Promise((resolve) => {
        const req = http.get(
          "http://localhost:3001/health",
          { timeout: 3000 },
          (res) => {
            let data = "";
            res.on("data", (chunk) => {
              data += chunk;
            });
            res.on("end", () => {
              try {
                const health = JSON.parse(data);
                // Check if scraper is healthy and proxy is connected
                resolve(res.statusCode === 200 && health.status === "ok");
              } catch {
                resolve(res.statusCode === 200);
              }
            });
          },
        );
        req.on("error", () => resolve(false));
        req.on("timeout", () => {
          req.destroy();
          resolve(false);
        });
      });
    },
    startCommand: "npm run dev:scraper",
    optional: false, // Scraper is required for E2E tests
  },
};

async function checkServices() {
  console.log("🔍 Checking required services for E2E tests...\n");

  const results = [];

  for (const [key, service] of Object.entries(services)) {
    const isRunning = await service.check();
    results.push({ key, service, isRunning });

    if (isRunning) {
      console.log(`✅ ${service.name} is running`);
    } else {
      const prefix = service.optional ? "⚠️ " : "❌";
      console.log(`${prefix} ${service.name} is not running`);
      console.log(`   Start with: ${service.startCommand}`);
      if (service.note) {
        console.log(`   ${service.note}`);
      }
    }
  }

  const requiredFailed = results.filter(
    (r) => !r.service.optional && !r.isRunning,
  );

  if (requiredFailed.length > 0) {
    console.log("\n❌ Required services are not running");
    console.log("   Or skip this check with: git push --no-verify");
    process.exit(1);
  }

  console.log("\n✅ All required services are running");
  process.exit(0);
}

checkServices().catch((error) => {
  console.error("Error checking services:", error);
  process.exit(1);
});
