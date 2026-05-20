import { deleteApiData, getApiData, patchApiData, postApiData } from '@/src/api/client';
import { Lead, LeadUpsertPayload } from '@/src/shared/types/domain';

export type CreateLeadRequest = Required<Pick<LeadUpsertPayload, 'name'>> & Omit<LeadUpsertPayload, 'name'>;
export type UpdateLeadRequest = LeadUpsertPayload;

const normalizeLead = (lead: Partial<Lead>): Lead => ({
  id: typeof lead.id === 'string' ? lead.id : '',
  name: lead.name ?? '',
  email: lead.email ?? '',
  phone: lead.phone ?? '',
  company: lead.company ?? '',
  jobTitle: lead.jobTitle ?? '',
  location: lead.location ?? lead.address ?? '',
  address: lead.address ?? lead.location ?? '',
  website: lead.website ?? '',
  status: lead.status ?? 'new',
  source: lead.source ?? '',
  notes: lead.notes ?? '',
  adminId: lead.adminId,
  createdBy: lead.createdBy,
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
});

export async function listLeads() {
  const data = await getApiData<Lead[] | Lead>('/v1/leads/');
  const items = Array.isArray(data) ? data : data ? [data] : [];
  return items.map(normalizeLead);
}

export async function getLead(id: string) {
  const lead = await getApiData<Lead>(`/v1/leads/${id}`);
  return normalizeLead(lead);
}

export async function createLead(body: CreateLeadRequest) {
  const lead = await postApiData<Lead, typeof body>('/v1/leads/', body);
  return normalizeLead(lead);
}

export async function updateLead(id: string, body: UpdateLeadRequest) {
  const lead = await patchApiData<Lead, typeof body>(`/v1/leads/${id}`, body);
  return normalizeLead(lead);
}

export async function deleteLead(id: string) {
  const lead = await deleteApiData<Lead>(`/v1/leads/${id}`);
  return normalizeLead(lead);
}
