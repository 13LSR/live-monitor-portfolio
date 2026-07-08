import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workerDir = join(root, "worker");
const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const defaultApiBaseUrl = "http://localhost:8787";
const children = [];

function startProcess(name, args, options = {}) {
  const child = spawn(npmCommand, getNpmArgs(args), {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  children.push(child);

  child.stdout.on("data", (chunk) => writeOutput(name, chunk));
  child.stderr.on("data", (chunk) => writeOutput(name, chunk));

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    stopChildren();
    process.exitCode = code ?? (signal ? 1 : 0);
  });

  return child;
}

function getNpmArgs(args) {
  return process.platform === "win32" ? ["/d", "/s", "/c", "npm", ...args] : args;
}

function writeOutput(name, chunk) {
  const lines = chunk.toString().split(/\r?\n/);

  for (const line of lines) {
    if (line) {
      process.stdout.write(`[${name}] ${line}\n`);
    }
  }
}

function stopChildren() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

let shuttingDown = false;

process.on("SIGINT", () => {
  shuttingDown = true;
  stopChildren();
});

process.on("SIGTERM", () => {
  shuttingDown = true;
  stopChildren();
});

console.log("Starting local app:");
console.log(`- Worker API: ${defaultApiBaseUrl}`);
console.log("- Frontend: http://localhost:3000");

startProcess("worker", ["run", "dev"], { cwd: workerDir });
startProcess("frontend", ["run", "dev"], {
  cwd: root,
  env: {
    ...process.env,
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
  },
});
