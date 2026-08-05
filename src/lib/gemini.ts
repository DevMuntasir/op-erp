import { generateAiContent } from '@/src/lib/aiProxy';

export async function calculateProductivityScore(tasks: any[], sessions: any[]) {
  const prompt = `
    Analyze the following employee activity and provide a productivity score (0-100) and a brief feedback.

    Tasks: ${JSON.stringify(tasks)}
    Sessions: ${JSON.stringify(sessions)}

    Return a JSON object with 'score' (number) and 'feedback' (string).
  `;

  try {
    const text = await generateAiContent({
      prompt,
      model: 'gemini-flash-latest',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          score: { type: 'NUMBER' },
          feedback: { type: 'STRING' },
        },
        required: ['score', 'feedback'],
      },
    });

    return JSON.parse(text || '{"score": 0, "feedback": "Error parsing AI response"}');
  } catch (error) {
    console.error('Gemini Error:', error);
    return { score: 0, feedback: 'Unable to calculate score at this time.' };
  }
}
