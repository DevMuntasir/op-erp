import { getApiData, postApiData } from '@/src/api/client';
import { Screenshot } from '@/src/shared/types/domain';

export function listScreenshots() {
  return getApiData<Screenshot[]>('/v1/screenshots/');
}

export function uploadScreenshot(body: { sessionId: string; screenshotUrl?: string; storagePath?: string; imageBase64?: string }) {
  return postApiData<Screenshot, typeof body>('/v1/screenshots/', body);
}
