import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { startScheduler } from "./aurora/scheduler";
import { runPipeline } from "./aurora/pipeline";

async function seedDatabase() {
  const runs = await storage.getRuns();
  if (runs.length === 0) {
    console.log("Seeding database...");
    const run = await storage.createRun({
      status: "completed",
      completedAt: new Date()
    });
    await storage.createLog({
      runId: run.id,
      level: "info",
      message: "Pipeline started (Seed Data)"
    });
    await storage.createAsset({
      runId: run.id,
      type: "text",
      status: "generated",
      path: "Seed text content"
    });
    console.log("Database seeded!");
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed Data
  await seedDatabase();

  // Start the scheduler
  startScheduler();

  app.get(api.runs.list.path, async (req, res) => {
    const runs = await storage.getRuns();
    res.json(runs);
  });

  app.get(api.runs.get.path, async (req, res) => {
    const run = await storage.getRun(req.params.id);
    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }
    const logs = await storage.getLogs(run.id);
    const assets = await storage.getAssets(run.id);
    res.json({ ...run, logs, assets });
  });

  app.post(api.runs.trigger.path, async (req, res) => {
    // Manually trigger the pipeline
    // We don't await this, we just start it
    runPipeline().catch(console.error);
    res.json({ message: "Pipeline triggered", runId: "pending" });
  });

  return httpServer;
}
