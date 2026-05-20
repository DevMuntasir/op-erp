import { deleteApiData, getApiData, patchApiData, postApiData } from '@/src/api/client';
import { Client, ClientUpsertPayload } from '@/src/shared/types/domain';

export type CreateClientRequest = Required<Pick<ClientUpsertPayload, 'name' | 'email'>> &
  Omit<ClientUpsertPayload, 'name' | 'email'>;

export type UpdateClientRequest = ClientUpsertPayload;

export function listClients() {
  return getApiData<Client[]>('/v1/clients/');
}

export function getClient(id: string) {
  return getApiData<Client>(`/v1/clients/${id}`);
}

export function createClient(body: CreateClientRequest) {
  return postApiData<Client, typeof body>('/v1/clients/', body);
}

export function updateClient(id: string, body: UpdateClientRequest) {
  return patchApiData<Client, typeof body>(`/v1/clients/${id}`, body);
}

export function deleteClient(id: string) {
  return deleteApiData<Client>(`/v1/clients/${id}`);
}
