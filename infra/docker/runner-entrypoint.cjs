const { spawn } = require("node:child_process");

const drainMs = Number.parseInt(process.env.CEGO_SHUTDOWN_DRAIN_MS ?? "25000", 10);
const child = spawn(process.execPath, ["apps/cego-web/server.js"], {
  stdio: "inherit",
});

let stopping = false;

function stop(signal) {
  if (stopping) return;
  stopping = true;

  console.log(`Received ${signal}; draining for ${drainMs}ms before stopping cego-web.`);

  setTimeout(() => {
    child.kill(signal);
  }, Math.max(0, drainMs)).unref();
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(0);
  }

  process.exit(code ?? 0);
});
