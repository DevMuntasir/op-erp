import { deleteApiData, getApiData, patchApiData, postApiData } from '@/src/api/client';
import {
  GenerateReportPayload,
  Report,
  ReportClient,
  ReportUpdatePayload,
} from '@/src/shared/types/domain';

const normalizeReport = (report: Partial<Report>): Report => ({
  id: typeof report.id === 'string' ? report.id : '',
  adminId: report.adminId ?? '',
  createdBy: report.createdBy ?? '',
  projectId: report.projectId ?? null,
  clientName: report.clientName ?? '',
  clientEmail: report.clientEmail ?? null,
  projectName: report.projectName ?? null,
  reportingPeriod: report.reportingPeriod ?? null,
  employeeNotes: report.employeeNotes ?? null,
  screenshotUrls: Array.isArray(report.screenshotUrls) ? report.screenshotUrls : [],
  contentMd: report.contentMd ?? '',
  status: report.status ?? 'draft',
  sentToClients: report.sentToClients,
  sentToClient: report.sentToClient ?? false,
  isViewed: report.isViewed ?? false,
  viewedAt: report.viewedAt ?? null,
  createdAt: report.createdAt,
  updatedAt: report.updatedAt ?? null,
});

export async function listReports() {
  const data = await getApiData<Report[] | Report>('/v1/reports/');
  const items = Array.isArray(data) ? data : data ? [data] : [];
  return items.map(normalizeReport);
}

export async function getReport(id: string) {
  const report = await getApiData<Report>(`/v1/reports/${id}`);
  return normalizeReport(report);
}

export async function generateReport(body: GenerateReportPayload) {
  const report = await postApiData<Report, typeof body>('/v1/reports/generate', body);
  return normalizeReport(report);
}

export async function updateReport(id: string, body: ReportUpdatePayload) {
  const report = await patchApiData<Report, typeof body>(`/v1/reports/${id}`, body);
  return normalizeReport(report);
}

export async function deleteReport(id: string) {
  const report = await deleteApiData<Report>(`/v1/reports/${id}`);
  return normalizeReport(report);
}

export async function getReportClients(id: string) {
  const data = await getApiData<ReportClient[]>(`/v1/reports/${id}/clients`);
  return Array.isArray(data) ? data : [];
}

export async function sendReport(id: string, clientIds: string[]) {
  const report = await postApiData<Report, { clientIds: string[] }>(`/v1/reports/${id}/send`, {
    clientIds,
  });
  return normalizeReport(report);
}

export async function markReportViewed(id: string) {
  const report = await postApiData<Report>(`/v1/reports/${id}/mark-viewed`);
  return normalizeReport(report);
}
