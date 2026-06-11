import { getApiData, postApiData } from '@/src/api/client';

export type DeleteRequestState = 'pending' | 'approved' | 'rejected';

export interface DeleteRequestStatus {
  id: string;
  email: string;
  status: DeleteRequestState;
  createdAt: string;
  resolvedAt: string | null;
}

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

export function createDeleteRequest(payload: CreateDeleteRequestPayload) {
  return postApiData<CreateDeleteRequestResult, CreateDeleteRequestPayload>('/delete-request', payload);
}

export function getDeleteRequest(id: string) {
  return getApiData<DeleteRequestStatus>(`/delete-request/${id}`);
}
