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

// Dead Letter Queue - for failed operations that need retry
export const dlq = pgTable("dlq", {
  id: serial("id").primaryKey(),
  runId: uuid("run_id").references(() => runs.id),
  operation: text("operation").notNull(), // text_generation, voice_generation, video_generation, distribution
  status: text("status").notNull().default("pending"), // pending, retrying, failed, resolved
  error: text("error").notNull(),
  payload: jsonb("payload"), // Original input that failed
  retryCount: serial("retry_count").default(0),
  maxRetries: serial("max_retries").default(3),
  lastRetryAt: timestamp("last_retry_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertDLQSchema = createInsertSchema(dlq).omit({
  id: true,
  retryCount: true,
  createdAt: true,
  updatedAt: true
});

// === TYPES ===

export type Run = typeof runs.$inferSelect;
export type InsertRun = z.infer<typeof insertRunSchema>;

export type PipelineLog = typeof pipelineLogs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type DLQEntry = typeof dlq.$inferSelect;
export type InsertDLQEntry = z.infer<typeof insertDLQSchema>;

// === API TYPES ===

export type RunResponse = Run & {
  logs?: PipelineLog[];
  assets?: Asset[];
};
