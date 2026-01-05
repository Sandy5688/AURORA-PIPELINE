export async function generateText(topic: any, runId: string) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.warn('[WARN] OPENAI_API_KEY not set, using mock text generation');
    // Fallback to mock for demo
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      primary: `This is a generated script for topic: ${topic.label}. It contains informative content about the subject.`,
      derivatives: [
        { id: "tweet", content: `Check out ${topic.label}! #aurora` },
        { id: "linkedin", content: `Professional insights on ${topic.label}.` }
      ]
    };
  }

  // Real OpenAI API call
  try {
    console.log(`[INFO] Calling OpenAI API for text generation on topic: ${topic.label}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional content creator. Generate engaging, informative content.',
          },
          {
            role: 'user',
            content: `Create content about: ${topic.label}\n\nProvide:\n1. A main script (primary)\n2. Twitter post (short, with hashtags)\n3. LinkedIn post (professional)\n\nFormat as JSON with keys: primary, tweet, linkedin`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.choices[0].message.content;
    
    // Parse response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback structure if JSON parsing fails
      parsed = {
        primary: content,
        tweet: content.substring(0, 280),
        linkedin: content
      };
    }

    const result = {
      primary: parsed.primary || content,
      derivatives: [
        { id: 'tweet', content: parsed.tweet || content.substring(0, 280) },
        { id: 'linkedin', content: parsed.linkedin || content }
      ]
    };

    console.log(`[OK] Text generated successfully for topic: ${topic.label}`);
    return result;
  } catch (error: any) {
    console.error('[ERROR] OpenAI API call failed:', error.message);
    throw error;
  }
}

export function validateTextPayload(payload: any) {
  if (!payload.primary || !Array.isArray(payload.derivatives)) {
    throw new Error('Invalid text payload: missing primary or derivatives');
  }
  
  if (typeof payload.primary !== 'string' || payload.primary.length === 0) {
    throw new Error('Invalid text payload: primary must be non-empty string');
  }
  
  if (payload.derivatives.length === 0) {
    throw new Error('Invalid text payload: must have at least one derivative');
  }
  
  for (const derivative of payload.derivatives) {
    if (!derivative.id || !derivative.content) {
      throw new Error('Invalid text payload: each derivative must have id and content');
    }
  }
}
