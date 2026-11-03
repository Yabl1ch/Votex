import net from "node:net";
import { spawn } from "node:child_process";

/**
 * Checks if a TCP port is currently free on 127.0.0.1
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

/**
 * Finds the first free port starting from the requested initial port
 */
async function findFreePort(startPort = 1420) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

async function main() {
  const chosenPort = await findFreePort(1420);
  console.log(`[Votex Dev] Selected isolated dev port: ${chosenPort}`);

  process.env.VITE_PORT = chosenPort.toString();

  const configOverride = JSON.stringify({
    build: {
      devUrl: `http://localhost:${chosenPort}`,
    },
  });

  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "pnpm.cmd" : "pnpm";
  const args = ["tauri", "dev", "-c", configOverride, ...process.argv.slice(2)];

  const child = spawn(cmd, args, {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      VITE_PORT: chosenPort.toString(),
    },
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error("[Votex Dev] Failed to start dev environment:", err);
  process.exit(1);
});
