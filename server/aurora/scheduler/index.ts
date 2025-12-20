import cron from 'node-cron';
import { runPipeline } from '../pipeline';

export function startScheduler() {
  const frequency = process.env.RUN_FREQUENCY || '0 */12 * * *';
  
  console.log(`Starting Aurora Scheduler with frequency: ${frequency}`);
  
  cron.schedule(frequency, async () => {
    if (process.env.PIPELINE_ENABLED !== 'true') {
      console.log('Pipeline disabled via env, skipping run.');
      return;
    }
    console.log('Triggering scheduled pipeline run...');
    await runPipeline();
  });
}
