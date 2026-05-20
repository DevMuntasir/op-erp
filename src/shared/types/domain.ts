export type UserRole = 'super_admin' | 'admin' | 'employee' | 'client';
export type TaskStatus = 'pending' | 'in-progress' | 'submitted';
export type TaskPriority = 'low' | 'medium' | 'high';
export type SessionStatus = 'active' | 'completed';
export type CurrencyCode = 'USD' | 'CAD' | 'GBP' | 'EUR' | string;
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | string;
export type Dateish = any;

export interface User {
  uid: string;
  email: string | null;
  name: string;
  role: UserRole;
  adminId: string | null;
  isDisabled?: boolean;
  disabledAt?: Dateish;
  status: 'online' | 'offline' | string;
  lastSeen: Dateish;
  photoURL?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  createdAt?: Dateish;
}

export interface TaskEditHistoryItem {
  previousTitle?: string;
  editedAt?: Dateish;
  editedBy?: string;
}

export interface TaskSubmission {
  summary: string;
  proofUrl?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  adminId: string;
  assignedTo: string;
  assignedToEmail?: string | null;
  assignedToName?: string | null;
  createdBy: string;
  clientEmail?: string | null;
  projectName?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Dateish;
  createdAt?: Dateish;
  updatedAt?: Dateish;
  submittedAt?: Dateish;
  isDeleted?: boolean;
  deletedAt?: Dateish;
  deletedBy?: string;
  editHistory?: TaskEditHistoryItem[];
  submission?: TaskSubmission | null;
}

export interface Session {
  id: string;
  userId: string;
  adminId: string;
  projectId?: string | null;
  taskId?: string | null;
  startTime: Dateish;
  endTime?: Dateish;
  activeTime: number;
  status: SessionStatus;
}

export interface Project {
  id: string;
  name: string;
  clientName?: string | null;
  adminId: string;
  status: 'active' | 'archived' | string;
  createdAt?: Dateish;
}

export interface Screenshot {
  id: string;
  sessionId: string;
  userId: string;
  adminId: string;
  screenshotUrl?: string | null;
  storagePath?: string | null;
  createdAt?: Dateish;
  timestamp?: Dateish;
}

export interface Client {
  id: string;
  adminId: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  status?: 'active' | 'inactive' | 'lead' | string;
  assignedEmployees?: string[];
  assignedDate?: Dateish;
  invoiceValue?: number | string | null;
  currency?: CurrencyCode | string | null;
  notes?: string | null;
  createdAt?: Dateish;
  updatedAt?: Dateish;
  createdBy?: string | null;
}

export interface ClientUpsertPayload {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  assignedEmployees?: string[];
  status?: 'active' | 'inactive' | 'lead' | string;
  invoiceValue?: number;
  currency?: CurrencyCode | string;
  notes?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  adminId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency?: CurrencyCode | string;
  status: string;
  dueDate: Dateish;
  paidAt?: Dateish;
  stripePaymentId?: string | null;
  createdAt?: Dateish;
  lineItems?: InvoiceLineItem[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: Dateish;
  relatedId?: string | null;
  createdAt?: Dateish;
}

export interface Invite {
  id: string;
  adminId: string;
  email: string;
  role: string;
  createdAt?: Dateish;
  acceptedAt?: Dateish;
}

export interface Message {
  id: string;
  chatId: string;
  adminId: string;
  senderId: string;
  text: string;
  status: string;
  seenAt?: Dateish;
  createdAt?: Dateish;
  timestamp?: Dateish;
  participants?: string[];
  fileUrl?: string | null;
}

export interface ProposalSection {
  id?: string;
  title?: string;
  content: string;
  type: string;
  aiGenerated?: boolean;
}

export interface ProposalPricingPlan {
  id?: string;
  label?: string;
  value?: number;
  items?: string[];
  name?: string;
  price?: number;
  features?: string[];
}

export interface Proposal {
  id: string;
  adminId: string;
  createdBy: string;
  title: string;
  templateId?: string | null;
  clientName: string;
  clientEmail: string;
  businessName?: string | null;
  industry?: string | null;
  location?: string | null;
  businessDescription?: string | null;
  goals?: string[] | string | null;
  targetAudience?: string | null;
  monthlyBudget?: number | null;
  currency?: CurrencyCode | string | null;
  services?: string[] | null;
  deliverables?: string[] | null;
  pricingPlans?: ProposalPricingPlan[];
  creatorName?: string | null;
  status: ProposalStatus | string;
  sections?: ProposalSection[];
  totalValue?: number | null;
  createdAt?: Dateish;
  updatedAt?: Dateish;
  sentAt?: Dateish;
}

export interface Report {
  id: string;
  adminId: string;
  createdBy: string;
  clientName: string;
  clientEmail?: string | null;
  projectName?: string | null;
  notes?: string | null;
  content?: string | null;
  images?: string[];
  status: string;
  sentToClient?: boolean;
  sentAt?: Dateish;
  isViewed?: boolean;
  viewedAt?: Dateish;
  createdAt?: Dateish;
}

export interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  company?: string | null;
  jobTitle?: string | null;
  location?: string | null;
  address?: string | null;
  website?: string | null;
  status?: string;
  source?: string | null;
  notes?: string | null;
  adminId?: string;
  createdBy?: string;
  createdAt?: Dateish;
  updatedAt?: Dateish;
}

export interface LeadUpsertPayload {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  website?: string;
  source?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | string;
  notes?: string;
}

export interface Call {
  id: string;
  employeeId?: string | null;
  employeeName?: string | null;
  adminId: string;
  leadId?: string | null;
  leadName?: string | null;
  phoneNumber: string;
  type: 'incoming' | 'outgoing' | string;
  status: string;
  duration?: number | null;
  notes?: string | null;
  timestamp?: Dateish;
}

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
];
