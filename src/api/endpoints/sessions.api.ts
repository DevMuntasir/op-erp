import { getApiData, postApiData } from '@/src/api/client';
import { Session } from '@/src/shared/types/domain';

export function listSessions() {
  return getApiData<Session[]>('/v1/sessions/');
}

export function startSession(body: { taskId?: string | null }) {
  return postApiData<Session, typeof body>('/v1/sessions/start', body);
}

export interface StopSessionPayload {
  sessionId: string;
  activeTimeSec: number;
}

export function stopSession({ sessionId, activeTimeSec }: StopSessionPayload) {
  return postApiData<Session, { activeTimeSec: number }>(`/v1/sessions/${sessionId}/stop`, { activeTimeSec });
}
