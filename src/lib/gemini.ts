import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function calculateProductivityScore(tasks: any[], sessions: any[]) {
  const prompt = `
    Analyze the following employee activity and provide a productivity score (0-100) and a brief feedback.
    
    Tasks: ${JSON.stringify(tasks)}
    Sessions: ${JSON.stringify(sessions)}
    
    Return a JSON object with 'score' (number) and 'feedback' (string).
  `;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING }
          },
          required: ["score", "feedback"]
        }
      }
    });

    return JSON.parse(response.text || '{"score": 0, "feedback": "Error parsing AI response"}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return { score: 0, feedback: "Unable to calculate score at this time." };
  }
}
