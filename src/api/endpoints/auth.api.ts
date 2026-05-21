import { getApiData, postApiData } from '@/src/api/client';
import { User } from '@/src/shared/types/domain';

export function getCurrentUser() {
  return getApiData<User>('/v1/me/');
}

export function acceptInvite(code: string) {
  return postApiData('/v1/me/accept-invite', { code });
}
