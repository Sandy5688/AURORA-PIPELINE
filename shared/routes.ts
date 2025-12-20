import { z } from 'zod';
import { runs, pipelineLogs, assets } from './schema';

export const api = {
  runs: {
    list: {
      method: 'GET' as const,
      path: '/api/runs',
      responses: {
        200: z.array(z.custom<typeof runs.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/runs/:id',
      responses: {
        200: z.custom<typeof runs.$inferSelect & { logs: typeof pipelineLogs.$inferSelect[], assets: typeof assets.$inferSelect[] }>(),
        404: z.object({ message: z.string() }),
      },
    },
    trigger: {
      method: 'POST' as const,
      path: '/api/runs/trigger',
      responses: {
        200: z.object({ message: z.string(), runId: z.string() }),
        500: z.object({ message: z.string() }),
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
