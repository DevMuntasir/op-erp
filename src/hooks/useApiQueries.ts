import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/App';
import { listEmployees } from '@/src/api/endpoints/employees.api';
import { listAdmins } from '@/src/api/endpoints/admins.api';
import { listClients } from '@/src/api/endpoints/clients.api';
import { listTasks } from '@/src/api/endpoints/tasks.api';
import { listSessions } from '@/src/api/endpoints/sessions.api';
import { listScreenshots } from '@/src/api/endpoints/screenshots.api';
import { listInvoices } from '@/src/api/endpoints/invoices.api';
import { listProjects } from '@/src/api/endpoints/projects.api';
import { listLeads } from '@/src/api/endpoints/leads.api';
import { listReports } from '@/src/api/endpoints/reports.api';
import { queryKeys } from '@/src/shared/constants/query-keys';

/**
 * Shared query hooks for common API calls.
 * This centralizes data fetching, deduplicates queries, and ensures consistent caching strategies.
 */

interface QueryConfig {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number | false;
}

/**
 * Hook for fetching employees
 * Used by: Dashboard, EmployeeManagement, ProjectCreationWizard, TaskManagement
 */
export const useEmployees = (config: QueryConfig = {}) => {
  const { user } = useAuth();
  const {
    enabled = user?.role === 'admin' || user?.role === 'super_admin',
    refetchOnWindowFocus = false,
    refetchInterval = 60_000, // Reduced from 30s to 60s
  } = config;

  return useQuery({
    queryKey: queryKeys.employees,
    queryFn: listEmployees,
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 30_000,
  });
};

/**
 * Hook for fetching tasks with optional dashboard filtering
 * Used by: Dashboard, TaskManagement, TaskDetail
 */
export const useTasks = (filters: { dashboard?: boolean } = {}, config: QueryConfig = {}) => {
  const { user } = useAuth();
  const {
    enabled = !!user,
    refetchOnWindowFocus = false,
    refetchInterval = 60_000, // Reduced from 30s to 60s
  } = config;

  return useQuery({
    queryKey: queryKeys.tasks(filters),
    queryFn: () => listTasks(),
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 30_000,
  });
};

/**
 * Hook for fetching sessions (very frequently updated)
 * Used by: Dashboard, SessionHistory
 */
export const useSessions = (filters: { dashboard?: boolean } = {}, isDashboardPage = false, config: QueryConfig = {}) => {
  const { user } = useAuth();
  const {
    enabled = !!user && isDashboardPage,
    refetchOnWindowFocus = false,
    refetchInterval = isDashboardPage ? 15_000 : false, // Reduced from 10s, and only when on dashboard
  } = config;

  return useQuery({
    queryKey: queryKeys.sessions(filters),
    queryFn: listSessions,
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 5_000, // Sessions change frequently, so shorter stale time
  });
};

/**
 * Hook for fetching screenshots
 * Used by: Dashboard, AdminScreenshots
 */
export const useScreenshots = (filters: { dashboard?: boolean } = {}, config: QueryConfig = {}) => {
  const { user } = useAuth();
  const {
    enabled = !!user,
    refetchOnWindowFocus = false,
    refetchInterval = 60_000, // Reduced from 30s to 60s
  } = config;

  return useQuery({
    queryKey: queryKeys.screenshots(filters),
    queryFn: listScreenshots,
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 30_000,
  });
};

/**
 * Hook for fetching invoices
 * Used by: Dashboard, BillingManagement
 */
export const useInvoices = (filters: { dashboard?: boolean } = {}, config: QueryConfig = {}) => {
  const { user } = useAuth();
  const {
    enabled = !!user,
    refetchOnWindowFocus = false,
    refetchInterval = 120_000, // Invoices rarely change, extended to 2 minutes
  } = config;

  return useQuery({
    queryKey: queryKeys.invoices(filters),
    queryFn: listInvoices,
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 60_000,
  });
};

/**
 * Hook for fetching clients
 * Used by: ClientManagement, ClientPortal, ProposalBuilder
 */
export const useClients = (filters?: unknown, config: QueryConfig = {}) => {
  const { user } = useAuth();
  const {
    enabled = !!user,
    refetchOnWindowFocus = false,
    refetchInterval = 120_000, // Clients rarely change, extended to 2 minutes
  } = config;

  return useQuery({
    queryKey: queryKeys.clients(filters),
    queryFn: () => listClients(),
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 60_000,
  });
};

/**
 * Hook for fetching projects
 * Used by: ProjectManagement, ProjectCreationWizard
 */
export const useProjects = (filters?: unknown, config: QueryConfig = {}) => {
  const { user } = useAuth();
  const {
    enabled = !!user,
    refetchOnWindowFocus = false,
    refetchInterval = 120_000, // Extended to 2 minutes
  } = config;

  return useQuery({
    queryKey: queryKeys.projects(filters),
    queryFn: () => listProjects(),
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 60_000,
  });
};

/**
 * Hook for fetching leads
 * Used by: LeadManagement, LeadFinder
 */
export const useLeads = (filters?: unknown, config: QueryConfig = {}) => {
  const { user } = useAuth();
  const {
    enabled = !!user,
    refetchOnWindowFocus = false,
    refetchInterval = 120_000, // Extended to 2 minutes
  } = config;

  return useQuery({
    queryKey: queryKeys.leads(filters),
    queryFn: () => listLeads(),
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 60_000,
  });
};

/**
 * Hook for fetching reports
 * Used by: ReportGenerator
 */
export const useReports = (filters?: unknown, config: QueryConfig = {}) => {
  const { user } = useAuth();
  const {
    enabled = !!user,
    refetchOnWindowFocus = false,
    refetchInterval = 60_000,
  } = config;

  return useQuery({
    queryKey: queryKeys.reports(filters),
    queryFn: listReports,
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 30_000,
  });
};

/**
 * Hook for fetching admins
 * Used by: AdminManagement
 */
export const useAdmins = (config: QueryConfig = {}) => {
  const { user } = useAuth();
  const {
    enabled = user?.role === 'super_admin',
    refetchOnWindowFocus = false,
    refetchInterval = 120_000, // Admins rarely change, extended to 2 minutes
  } = config;

  return useQuery({
    queryKey: queryKeys.admins,
    queryFn: listAdmins,
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 60_000,
  });
};

/**
 * Hook for fetching user's active session
 * Used by: TaskManagement (employees only)
 */
export const useUserSessions = (config: QueryConfig = {}) => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const {
    enabled = !!user && isEmployee,
    refetchOnWindowFocus = false,
    refetchInterval = 15_000, // Keep this frequent for active session tracking
  } = config;

  return useQuery({
    queryKey: queryKeys.sessions({ scope: 'me' }),
    queryFn: listSessions,
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 3_000,
  });
};
