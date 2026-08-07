import { getApiData, postApiData, deleteApiData } from '@/src/api/client';
import { User } from '@/src/shared/types/domain';

export type InviteAdminPayload = {
  email: string;
  type: 'password';
  role: 'admin';
  password: string;
  name: string;
};

export function listAdmins() {
  return getApiData<User[]>('/v1/admin/admins/');
}

export function inviteAdmin(body: InviteAdminPayload) {
  return postApiData('/v1/admin/admins/invite', body);
}

export function deleteAdmin(uid: string) {
  return deleteApiData<void>(`/v1/admin/admins/${uid}`);
}
