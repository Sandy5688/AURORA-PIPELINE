import { db } from "./db";
import {
  runs, pipelineLogs, assets,
  type Run, type InsertRun,
  type PipelineLog, type InsertLog,
  type Asset, type InsertAsset
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Runs
  createRun(run: InsertRun): Promise<Run>;
  updateRun(id: string, updates: Partial<Run>): Promise<Run>;
  getRun(id: string): Promise<Run | undefined>;
  getRuns(): Promise<Run[]>;

  // Logs
  createLog(log: InsertLog): Promise<PipelineLog>;
  getLogs(runId: string): Promise<PipelineLog[]>;

  // Assets
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, updates: Partial<Asset>): Promise<Asset>;
  getAssets(runId: string): Promise<Asset[]>;
}

export class DatabaseStorage implements IStorage {
  // Runs
  async createRun(run: InsertRun): Promise<Run> {
    const [newRun] = await db.insert(runs).values(run).returning();
    return newRun;
  }

  async updateRun(id: string, updates: Partial<Run>): Promise<Run> {
    const [updated] = await db.update(runs)
      .set(updates)
      .where(eq(runs.id, id))
      .returning();
    return updated;
  }

  async getRun(id: string): Promise<Run | undefined> {
    const [run] = await db.select().from(runs).where(eq(runs.id, id));
    return run;
  }

  async getRuns(): Promise<Run[]> {
    return await db.select().from(runs).orderBy(desc(runs.startedAt));
  }

  // Logs
  async createLog(log: InsertLog): Promise<PipelineLog> {
    const [newLog] = await db.insert(pipelineLogs).values(log).returning();
    return newLog;
  }

  async getLogs(runId: string): Promise<PipelineLog[]> {
    return await db.select().from(pipelineLogs)
      .where(eq(pipelineLogs.runId, runId))
      .orderBy(pipelineLogs.timestamp);
  }

  // Assets
  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async updateAsset(id: number, updates: Partial<Asset>): Promise<Asset> {
    const [updated] = await db.update(assets)
      .set(updates)
      .where(eq(assets.id, id))
      .returning();
    return updated;
  }

  async getAssets(runId: string): Promise<Asset[]> {
    return await db.select().from(assets).where(eq(assets.runId, runId));
  }
}

export const storage = new DatabaseStorage();
