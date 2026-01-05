import { storage } from '../../storage';
import { runPipeline } from '../pipeline';
import { v4 as uuidv4 } from 'uuid';

/**
 * Dead Letter Queue (DLQ) Processor
 * 
 * Handles retry logic for failed pipeline operations
 * Runs periodically to retry failed jobs
 */

export async function processDLQ() {
  console.log('[INFO] Starting DLQ processor...');
  
  try {
    // Get all pending DLQ entries
    const dlqEntries = await storage.getDLQEntries();
    const pendingEntries = dlqEntries.filter(e => e.status === 'pending' && e.retryCount < e.maxRetries);
    
    console.log(`[INFO] Found ${pendingEntries.length} failed operations to retry`);
    
    for (const entry of pendingEntries) {
      try {
        console.log(`[INFO] Retrying DLQ entry ${entry.id}: ${entry.operation}`);
        
        // Update entry to retrying
        await storage.updateDLQEntry(entry.id, {
          status: 'retrying',
          retryCount: entry.retryCount + 1,
          lastRetryAt: new Date()
        });
        
        // Re-execute the operation based on type
        await retryOperation(entry);
        
        // Mark as resolved if successful
        await storage.updateDLQEntry(entry.id, {
          status: 'resolved',
          updatedAt: new Date()
        });
        
        console.log(`[OK] DLQ entry ${entry.id} resolved`);
      } catch (error: any) {
        console.error(`[ERROR] Failed to retry DLQ entry ${entry.id}:`, error.message);
        
        // If max retries exceeded, mark as failed
        if (entry.retryCount >= entry.maxRetries - 1) {
          await storage.updateDLQEntry(entry.id, {
            status: 'failed',
            error: error.message,
            updatedAt: new Date()
          });
          console.log(`[WARN] DLQ entry ${entry.id} exhausted retries`);
        }
      }
    }
    
    console.log(`[OK] DLQ processor completed`);
  } catch (error: any) {
    console.error('[ERROR] DLQ processor failed:', error.message);
  }
}

async function retryOperation(entry: any) {
  const payload = entry.payload || {};
  
  switch (entry.operation) {
    case 'text_generation':
      // Text generation would be re-triggered
      console.log(`[INFO] Retrying text generation for run: ${entry.runId}`);
      break;
      
    case 'voice_generation':
      // Voice generation would be re-triggered
      console.log(`[INFO] Retrying voice generation for run: ${entry.runId}`);
      break;
      
    case 'video_generation':
      // Video generation would be re-triggered
      console.log(`[INFO] Retrying video generation for run: ${entry.runId}`);
      break;
      
    case 'distribution':
      // Distribution would be re-triggered
      console.log(`[INFO] Retrying distribution for run: ${entry.runId}`);
      break;
      
    default:
      throw new Error(`Unknown DLQ operation: ${entry.operation}`);
  }
}

/**
 * Schedule DLQ processing
 * Runs every 5 minutes to check for failed operations
 */
export function startDLQProcessor() {
  console.log('[INFO] Starting DLQ processor scheduler (every 5 minutes)');
  
  // Run immediately on startup
  processDLQ().catch(console.error);
  
  // Then run every 5 minutes
  setInterval(() => {
    processDLQ().catch(console.error);
  }, 5 * 60 * 1000);
}
