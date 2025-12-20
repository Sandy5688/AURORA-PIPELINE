export async function generateText(topic: any, runId: string) {
  // Mock Text Generation
  // In production, this would fetch(process.env.TEXT_API, ...)
  
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

  return {
    primary: `This is a generated script for topic: ${topic.label}. It contains informative content about the subject.`,
    derivatives: [
      { id: "tweet", content: `Check out ${topic.label}! #aurora` },
      { id: "linkedin", content: `Professional insights on ${topic.label}.` }
    ]
  };
}

export function validateTextPayload(payload: any) {
  if (!payload.primary || !Array.isArray(payload.derivatives)) {
    throw new Error('Invalid text payload');
  }
}
