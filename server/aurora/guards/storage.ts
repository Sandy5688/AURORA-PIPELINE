import fs from 'fs';
import path from 'path';

export function createRunDirs(runId: string) {
  // In Replit, we can use /tmp or a local directory.
  // We'll use a local 'runs' directory.
  const base = path.join(process.cwd(), 'runs', runId);
  ['text', 'audio', 'video'].forEach(dir =>
    fs.mkdirSync(path.join(base, dir), { recursive: true })
  );
  return base;
}
