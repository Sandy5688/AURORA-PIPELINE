import runtime from '../config/runtime.json';
import { v4 as uuidv4 } from 'uuid';

async function fetchExternalTopic(runId: string) {
  // Mock external fetch
  return {
    id: uuidv4(),
    label: "External Topic " + runId,
    weight: 1,
    metadata: { source: "external" }
  };
}

async function generateInternalTopic(runId: string) {
  return {
    id: uuidv4(),
    label: "Generated Topic " + new Date().toISOString(),
    weight: 1,
    metadata: { source: "internal" }
  };
}

export async function getTopic(runId: string) {
  if (runtime.topicSource === 'external') {
    return fetchExternalTopic(runId);
  }
  return generateInternalTopic(runId);
}
