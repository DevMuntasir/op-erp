import { getApiData, deleteApiData, patchApiData } from '@/src/api/client';
import { Call } from '@/src/shared/types/domain';

interface ApiCall {
  id: string;
  adminId: string;
  employeeId: string;
  employeeName: string;
  leadId: string;
  leadName: string;
  contactPhone: string;
  type: string;
  status: string;
  durationSec: number;
  notes: string;
  createdAt: string;
}

const mapApiCallToCall = (apiCall: ApiCall): Call => ({
  id: apiCall.id,
  adminId: apiCall.adminId,
  employeeId: apiCall.employeeId,
  employeeName: apiCall.employeeName,
  leadId: apiCall.leadId,
  leadName: apiCall.leadName,
  phoneNumber: apiCall.contactPhone,
  type: apiCall.type,
  status: apiCall.status,
  duration: apiCall.durationSec,
  notes: apiCall.notes,
  timestamp: apiCall.createdAt,
});

export function listCalls() {
  return getApiData<ApiCall[]>('/v1/calls/').then(calls =>
    calls.map(mapApiCallToCall)
  );
}

export function deleteCall(callId: string) {
  return deleteApiData(`/v1/calls/${callId}`);
}

export interface UpdateCallPayload {
  notes?: string;
  status?: string;
  leadName?: string;
}

export interface CreateCallPayload {
  employeeId: string;
  employeeName: string;
  adminId: string;
  leadId?: string | null;
  leadName?: string | null;
  contactPhone: string;
  type: 'incoming' | 'outgoing';
  status: string;
  durationSec?: number;
  notes?: string;
}

export function createCall(body: CreateCallPayload) {
  return postApiData<Call>('/v1/calls/', body);
}

export function updateCall(callId: string, body: UpdateCallPayload) {
  return patchApiData(`/v1/calls/${callId}`, body);
}
