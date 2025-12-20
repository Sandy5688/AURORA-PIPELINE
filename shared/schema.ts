import { pgTable, text, serial, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  error: text("error"),
});

export const pipelineLogs = pgTable("pipeline_logs", {
  id: serial("id").primaryKey(),
  runId: uuid("run_id").references(() => runs.id),
  level: text("level").notNull(), // info, warn, error
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"),
});

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  runId: uuid("run_id").references(() => runs.id),
  type: text("type").notNull(), // text, audio, video
  path: text("path"), // or content for text
  status: text("status").notNull(), // pending, generated, distributed, failed
  metadata: jsonb("metadata"),
});

// === SCHEMAS ===

export const insertRunSchema = createInsertSchema(runs).omit({ 
  id: true, 
  startedAt: true, 
  completedAt: true 
});

export const insertLogSchema = createInsertSchema(pipelineLogs).omit({ 
  id: true, 
  timestamp: true 
});

export const insertAssetSchema = createInsertSchema(assets).omit({ 
  id: true 
});

// === TYPES ===

export type Run = typeof runs.$inferSelect;
export type InsertRun = z.infer<typeof insertRunSchema>;

export type PipelineLog = typeof pipelineLogs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

// === API TYPES ===

export type RunResponse = Run & {
  logs?: PipelineLog[];
  assets?: Asset[];
};
