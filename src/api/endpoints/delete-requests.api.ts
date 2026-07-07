import { getApiData, postApiData } from '@/src/api/client';

export type DeleteRequestState = 'pending' | 'approved' | 'rejected';

export interface DeleteRequestStatus {
  id: string;
  email: string;
  status: DeleteRequestState;
  createdAt: string;
  resolvedAt: string | null;
}
// delete-requests.api.ts
export interface CreateDeleteRequestPayload {
  email: string;
  name?: string;
  reason?: string;
}

export interface CreateDeleteRequestResult {
  id: string;
  status: DeleteRequestState;
  alreadyExists?: boolean;
}

export interface DeleteRequestRecord extends DeleteRequestStatus {
  name: string;
  reason: string;
  resolvedBy?: string | null;
  accountFound?: boolean;
}

// Public: submit a deletion request
export function createDeleteRequest(payload: CreateDeleteRequestPayload) {
  return postApiData<CreateDeleteRequestResult, CreateDeleteRequestPayload>('/v1/auth/delete-request', payload);
}

// Public: check the status of a deletion request
export function getDeleteRequest(id: string) {
  return getApiData<DeleteRequestStatus>(`/delete-request`);
}

// Admin: list all deletion requests
export function listDeleteRequests() {
  return getApiData<DeleteRequestRecord[]>('/v1/admin/delete-requests');
}

// Admin: approve a deletion request (soft deletes the account)
export function approveDeleteRequest(id: string) {
  return postApiData<{ id: string; status: DeleteRequestState; accountFound: boolean }>(
    `/v1/admin/delete-requests/${id}/approve`,
  );
}

// Admin: reject a deletion request (account is left untouched)
export function rejectDeleteRequest(id: string) {
  return postApiData<{ id: string; status: DeleteRequestState }>(
    `/v1/admin/delete-requests/${id}/reject`,
  );
}
