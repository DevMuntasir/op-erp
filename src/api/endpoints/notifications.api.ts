import { getApiData, postApiData } from '@/src/api/client';
import { Notification } from '@/src/shared/types/domain';

export function listNotifications() {
  return getApiData<Notification[]>('/v1/notifications/');
}

export function markNotificationRead(id: string) {
  return postApiData<Notification, Record<string, never>>(`/v1/notifications/${id}/read`, {});
}
