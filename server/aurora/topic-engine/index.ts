import runtime from '../config/runtime.json';
import endpoints from '../config/endpoints.json';
import { v4 as uuidv4 } from 'uuid';

async function fetchExternalTopic(runId: string) {
  const externalUrl = endpoints.topic?.external;
  
  if (!externalUrl) {
    console.warn('[WARN] External topic URL not configured, using internal generation');
    return generateInternalTopic(runId);
  }

  try {
    console.log(`[INFO] Fetching topic from external API: ${externalUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Aurora-Pipeline/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    // Validate response structure
    if (!data.id || !data.label) {
      throw new Error('Invalid external topic response structure');
    }

    console.log(`[OK] Topic fetched successfully: ${data.label}`);
    return {
      id: data.id,
      label: data.label,
      weight: data.weight || 1,
      metadata: data.metadata || { source: 'external' }
    };
  } catch (error: any) {
    console.error('[ERROR] Failed to fetch external topic:', error.message);
    console.log('[INFO] Falling back to internal topic generation');
    return generateInternalTopic(runId);
  }
}

async function generateInternalTopic(runId: string) {
  console.log('[INFO] Generating internal topic');
  
  // Internal topic generation logic
  const topics = [
    'Artificial Intelligence Revolution',
    'Cloud Computing Trends',
    'Blockchain Technology',
    'Cybersecurity Best Practices',
    'Data Science Applications',
    'DevOps Innovations',
    'Machine Learning Models',
    'Web Development Frameworks',
    'API Design Patterns',
    'Microservices Architecture'
  ];
  
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  
  return {
    id: uuidv4(),
    label: randomTopic,
    weight: 1,
    metadata: { 
      source: 'internal',
      timestamp: new Date().toISOString()
    }
  };
}

export async function getTopic(runId: string) {
  console.log(`[INFO] Getting topic for run: ${runId}`);
  
  if (runtime.topicSource === 'external') {
    return fetchExternalTopic(runId);
  }
  
  return generateInternalTopic(runId);
}
