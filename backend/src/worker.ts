import { backgroundJobService } from "./services/backgroundJobService.js";
import { prisma } from "./prisma/client.js";

async function main() {
  const runOnce = process.argv.includes("--once") || process.env.WORKER_RUN_ONCE === "true";
  const intervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 0);

  async function runCycle() {
    const results = await backgroundJobService.runAll(new Date());
    console.log(JSON.stringify({ event: "background.jobs.completed", results }, null, 2));
  }

  await runCycle();

  if (runOnce || intervalMs <= 0) {
    await prisma.$disconnect();
    return;
  }

  setInterval(() => {
    runCycle().catch((error) => {
      console.error("background.jobs.failed", error);
    });
  }, intervalMs);
}

main().catch(async (error) => {
  console.error("background.worker.failed", error);
  await prisma.$disconnect();
  process.exit(1);
});
