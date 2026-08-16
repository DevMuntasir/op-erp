import { deleteApiData, getApiData, postApiData } from '@/src/api/client';
import { User } from '@/src/shared/types/domain';

export type AcceptInvitePayload = {
  email: string;
  password: string;
  code: string;
  name: string;
};

export type AcceptInviteResponse = {
  message: string;
  user: {
    uid: string;
    email: string;
    name: string;
    role: string;
  };
};

export function getCurrentUser() {
  return getApiData<User>('/v1/me/');
}

export function acceptInvite(payload: AcceptInvitePayload) {
  return postApiData<AcceptInviteResponse, AcceptInvitePayload>('/v1/me/accept-invite', payload);
}

export function deleteMyAccount() {
  return deleteApiData<{ success: boolean }>('/v1/auth/me');
}
