import { getApiData } from '@/src/api/client';
import { Invoice } from '@/src/shared/types/domain';

export function listInvoices() {
  return getApiData<Invoice[]>('/v1/invoices/');
}
