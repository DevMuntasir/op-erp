import { auth } from '@/src/lib/firebase';

interface AiGenerateOptions {
  prompt: string;
  model?: string;
  images?: { data: string; mimeType: string }[];
  responseSchema?: Record<string, unknown>;
}

/**
 * Calls the server-side Gemini proxy (POST /api/ai/generate in server.ts).
 * The API key never leaves the server; requests require a signed-in Firebase user.
 */
export async function generateAiContent({ prompt, model, images, responseSchema }: AiGenerateOptions): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('You must be signed in to use AI generation.');
  }

  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, model, images, responseSchema }),
  });

  if (!response.ok) {
    let message = `AI generation failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body; keep the status message
    }
    throw new Error(message);
  }

  const body = await response.json();
  return body.text ?? '';
}
