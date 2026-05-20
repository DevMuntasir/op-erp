import { getApiData } from '@/src/api/client';
import { User } from '@/src/shared/types/domain';

export function getCurrentUser() {
  return getApiData<User>('/v1/me/');
}
