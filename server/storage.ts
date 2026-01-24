import { db } from "./db";
import {
  runs, pipelineLogs, assets, dlq,
  type Run, type InsertRun,
  type PipelineLog, type InsertLog,
  type Asset, type InsertAsset,
  type DLQEntry, type InsertDLQEntry
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

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

  // DLQ (Dead Letter Queue)
  createDLQEntry(entry: InsertDLQEntry): Promise<DLQEntry>;
  getDLQEntries(runId?: string): Promise<DLQEntry[]>;
  updateDLQEntry(id: number, updates: Partial<DLQEntry>): Promise<DLQEntry>;
  deleteDLQEntry(id: number): Promise<void>;
  checkDLQExists(runId: string, operation: string): Promise<boolean>;
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

  // DLQ Operations
  async createDLQEntry(entry: InsertDLQEntry): Promise<DLQEntry> {
    const [newEntry] = await db.insert(dlq).values(entry).returning();
    return newEntry;
  }

  async getDLQEntries(runId?: string): Promise<DLQEntry[]> {
    if (runId) {
      return await db.select().from(dlq)
        .where(eq(dlq.runId, runId))
        .orderBy(desc(dlq.createdAt));
    }
    return await db.select().from(dlq).orderBy(desc(dlq.createdAt));
  }

  async updateDLQEntry(id: number, updates: Partial<DLQEntry>): Promise<DLQEntry> {
    const [updated] = await db.update(dlq)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dlq.id, id))
      .returning();
    return updated;
  }

  async deleteDLQEntry(id: number): Promise<void> {
    await db.delete(dlq).where(eq(dlq.id, id));
  }

  async checkDLQExists(runId: string, operation: string): Promise<boolean> {
    const entries = await db.select().from(dlq)
      .where(and(
        eq(dlq.runId, runId),
        eq(dlq.operation, operation)
      ));
    return entries.length > 0;
  }
}

export const storage = new DatabaseStorage();
