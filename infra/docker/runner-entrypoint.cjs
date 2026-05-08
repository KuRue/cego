const { spawn } = require("node:child_process");

const parsedMs = Number.parseInt(process.env.CEGO_SHUTDOWN_DRAIN_MS ?? "25000", 10);
const drainMs = Number.isFinite(parsedMs) && parsedMs >= 0 ? parsedMs : 25000;
const child = spawn(process.execPath, ["apps/cego-web/server.js"], {
  stdio: "inherit",
});

let stopping = false;

function stop(signal) {
  if (stopping) return;
  stopping = true;

  console.log(`Received ${signal}; draining for ${drainMs}ms before stopping cego-web.`);

  const drainTimer = setTimeout(() => {
    child.kill("SIGTERM");

    setTimeout(() => {
      child.kill("SIGKILL");
    }, 10_000).unref();
  }, drainMs);
  drainTimer.unref();
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(0);
  }

  process.exit(code ?? 0);
});
