import { getApiData, postApiData } from '@/src/api/client';
import { User } from '@/src/shared/types/domain';

export type InviteAdminPayload = {
  email: string;
  type: 'invitation' | 'password';
  role: 'admin';
  password?: string;
  name: string;
};

export function listAdmins() {
  return getApiData<User[]>('/v1/admin/admins/');
}

export function inviteAdmin(body: InviteAdminPayload) {
  return postApiData('/v1/admin/admins/invite', body);
}
