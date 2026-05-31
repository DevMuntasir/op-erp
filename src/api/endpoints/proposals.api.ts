import { deleteApiData, getApiData, patchApiData, postApiData } from '@/src/api/client';
import { Proposal, ProposalPricingPlan } from '@/src/shared/types/domain';

export interface ProposalSummary {
  totalProposals: number;
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  rejectedCount: number;
  totalValue: number;
  wonValue: number;
  conversionRate: number;
  activeClients: number;
}

export interface ProposalClientSearchItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  website: string | null;
}

export interface GenerateProposalRequest {
  clientName: string;
  businessName?: string;
  location?: string;
  businessDescription?: string;
  targetAudience?: string;
  industry?: string;
  goals?: string[];
  services?: string[];
  monthlyBudget?: number;
  currency?: string;
  pricingPlans?: ProposalPricingPlan[];
}

export interface GenerateProposalResponse {
  sections: Array<{
    id?: string;
    title?: string;
    content: string;
    type?: string;
    aiGenerated?: boolean;
  }>;
}

export type CreateProposalRequest = Omit<
  Proposal,
  'id' | 'adminId' | 'createdBy' | 'creatorName' | 'createdAt'
> & {
  createClient?: boolean;
  clientPhone?: string;
  clientCompany?: string;
  clientWebsite?: string;
};

export type UpdateProposalRequest = Omit<
  Proposal,
  'id' | 'adminId' | 'createdBy' | 'creatorName' | 'createdAt'
>;

export const getProposalSummary = () =>
  getApiData<ProposalSummary>('/v1/proposals/summary');

export const searchProposalClients = (q: string) =>
  getApiData<ProposalClientSearchItem[]>('/v1/proposals/client-search', { q });

export const generateProposalContent = (body: GenerateProposalRequest) =>
  postApiData<GenerateProposalResponse, GenerateProposalRequest>(
    '/v1/proposals/generate',
    body
  );

export const listProposals = () =>
  getApiData<Proposal[]>('/v1/proposals/');

export const createProposal = (body: CreateProposalRequest) =>
  postApiData<Proposal, CreateProposalRequest>('/v1/proposals/', body);

export const getProposal = (id: string) =>
  getApiData<Proposal>(`/v1/proposals/${id}`);

export const updateProposal = (id: string, body: UpdateProposalRequest) =>
  patchApiData<Proposal, UpdateProposalRequest>(`/v1/proposals/${id}`, body);

export const deleteProposal = (id: string) =>
  deleteApiData<Proposal>(`/v1/proposals/${id}`);

export const sendProposal = (id: string) =>
  postApiData<Proposal>(`/v1/proposals/${id}/send`);
