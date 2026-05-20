import { deleteApiData, getApiData, patchApiData, postApiData } from '@/src/api/client';
import { Invite, User } from '@/src/shared/types/domain';

export function listEmployees() {
  return getApiData<User[]>('/v1/admin/employees/');
}

export function updateEmployee(
  uid: string,
  body: Partial<Pick<User, 'name' | 'phone' | 'phoneNumber' | 'photoURL' | 'status' | 'role'>>,
) {
  const payload = {
    ...body,
    phone: body.phone ?? body.phoneNumber,
  };
  return patchApiData<User, typeof payload>(`/v1/admin/employees/${uid}`, payload);
}

export function deleteEmployee(uid: string) {
  return deleteApiData<User>(`/v1/admin/employees/${uid}`);
}

export function listInvites() {
  return getApiData<Invite[]>('/v1/admin/invites/');
}

export function createInvite(body: { email: string; role?: 'employee' | 'admin' }) {
  return postApiData<Invite, typeof body>('/v1/admin/invites/', body);
}
