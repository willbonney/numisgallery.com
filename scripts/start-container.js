#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Safely start a Docker container
 * - If container is running, do nothing
 * - If container exists but is stopped, start it
 * - If container doesn't exist, create it
 */
function startContainer(containerName, port, image, command = null) {
  try {
    // Check if container is running
    try {
      const runningContainers = execSync(
        `docker ps -q -f name=${containerName}`,
        { encoding: "utf8" },
      ).trim();

      if (runningContainers) {
        console.log(`✓ Container '${containerName}' is already running`);
        return;
      }
    } catch (e) {
      // Continue to next check
    }

    // Check if container exists but is stopped
    try {
      const allContainers = execSync(`docker ps -aq -f name=${containerName}`, {
        encoding: "utf8",
      }).trim();

      if (allContainers) {
        console.log(`↻ Starting existing container '${containerName}'...`);
        execSync(`docker start ${containerName}`, { stdio: "inherit" });
        console.log(`✓ Container '${containerName}' started`);
        return;
      }
    } catch (e) {
      // Continue to create new container
    }

    // Container doesn't exist, create it
    console.log(`⟳ Creating new container '${containerName}'...`);

    let dockerRunCmd = `docker run -d -p ${port}:${port} --name ${containerName}`;

    // Add volume mounts if needed
    if (containerName === "pocketbase") {
      const pbDataPath = path.join(__dirname, "..", "backend", "pb_data");
      const pbMigrationsPath = path.join(
        __dirname,
        "..",
        "backend",
        "pb_migrations",
      );
      const pbHooksPath = path.join(__dirname, "..", "backend", "pb_hooks");

      // Ensure directories exist
      if (!fs.existsSync(pbDataPath)) {
        fs.mkdirSync(pbDataPath, { recursive: true });
      }
      if (!fs.existsSync(pbMigrationsPath)) {
        fs.mkdirSync(pbMigrationsPath, { recursive: true });
      }
      if (!fs.existsSync(pbHooksPath)) {
        fs.mkdirSync(pbHooksPath, { recursive: true });
      }

      dockerRunCmd += ` -v ${pbDataPath}:/pb_data`;
      dockerRunCmd += ` -v ${pbMigrationsPath}:/pb/pb_migrations`;
      dockerRunCmd += ` -v ${pbHooksPath}:/pb/pb_hooks`;
    }

    dockerRunCmd += ` ${image}`;

    // Add command if provided
    if (command) {
      dockerRunCmd += ` ${command}`;
    }

    execSync(dockerRunCmd, { stdio: "inherit" });
    console.log(`✓ Container '${containerName}' created and started`);
  } catch (error) {
    console.error(
      `✗ Error managing container '${containerName}':`,
      error.message,
    );
    process.exit(1);
  }
}

// Parse command line arguments
const containerName = process.argv[2];
const port = process.argv[3];
const image = process.argv[4];
const command = process.argv[5];

if (!containerName || !port || !image) {
  console.error(
    "Usage: node start-container.js <containerName> <port> <image> [command]",
  );
  process.exit(1);
}

startContainer(containerName, port, image, command);
