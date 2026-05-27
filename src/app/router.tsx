import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LoginPage } from '@/src/features/auth/LoginPage';
import { InvitePage } from '@/src/features/auth/InvitePage';
import { ProtectedRoute, RootRedirect } from '@/src/features/auth/route-guards';
import { AppLayout } from '@/src/components/layout';
import { ProfilePage } from '@/src/components/profile';

// Lazy load dashboard components
const DashboardOverview = lazy(() => import('@/src/components/dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const AdminScreenshots = lazy(() => import('@/src/components/dashboard/AdminScreenshots').then(m => ({ default: m.AdminScreenshots })));
const ReportGenerator = lazy(() => import('@/src/components/dashboard/ReportGenerator').then(m => ({ default: m.ReportGenerator })));

// Lazy load employee components
const EmployeeManagement = lazy(() => import('@/src/features/employees/EmployeeManagement').then(m => ({ default: m.EmployeeManagement })));
const EmployeeDetail = lazy(() => import('@/src/components/employees/EmployeeDetail').then(m => ({ default: m.EmployeeDetail })));

// Lazy load task components
const TaskManagement = lazy(() => import('@/src/components/tasks/TaskManagement').then(m => ({ default: m.TaskManagement })));
const TaskDetail = lazy(() => import('@/src/components/tasks/TaskDetail').then(m => ({ default: m.TaskDetail })));

// Lazy load client components
const ClientManagement = lazy(() => import('@/src/components/clients/ClientManagement').then(m => ({ default: m.ClientManagement })));
const ClientPortal = lazy(() => import('@/src/components/clients/ClientPortal').then(m => ({ default: m.ClientPortal })));

// Lazy load other components
const SessionHistory = lazy(() => import('@/src/components/employees/SessionHistory').then(m => ({ default: m.SessionHistory })));
const BillingManagement = lazy(() => import('@/src/components/billing/BillingManagement').then(m => ({ default: m.BillingManagement })));
const LeadManagement = lazy(() => import('@/src/components/leads/LeadManagement').then(m => ({ default: m.LeadManagement })));
const LeadFinder = lazy(() => import('@/src/components/leads/LeadFinder').then(m => ({ default: m.LeadFinder })));
const ProjectManagement = lazy(() => import('@/src/components/projects/ProjectManagement').then(m => ({ default: m.ProjectManagement })));

// Lazy load proposal components
const ProposalDashboard = lazy(() => import('@/src/components/proposals/ProposalDashboard').then(m => ({ default: m.ProposalDashboard })));
const ProposalManagement = lazy(() => import('@/src/components/proposals/ProposalManagement').then(m => ({ default: m.ProposalManagement })));
const SmartProposalBuilder = lazy(() => import('@/src/components/proposals/SmartProposalBuilder').then(m => ({ default: m.SmartProposalBuilder })));
const ProposalPreview = lazy(() => import('@/src/components/proposals/ProposalPreview').then(m => ({ default: m.ProposalPreview })));

// Lazy load communication components
const ChatSystem = lazy(() => import('@/src/components/communication/ChatSystem').then(m => ({ default: m.ChatSystem })));
const CallHistory = lazy(() => import('@/src/components/calls/CallHistory').then(m => ({ default: m.CallHistory })));
const AdminManagement = lazy(() => import('@/src/components/admins/AdminManagement').then(m => ({ default: m.AdminManagement })));

const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
  </div>
);

function AdminArea() {
  return (
    <AppLayout role="admin">
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route index element={<DashboardOverview />} />
          <Route path="employees" element={<EmployeeManagement />} />
          <Route path="employees/:employeeId" element={<EmployeeDetail />} />
          <Route path="tasks" element={<TaskManagement />} />
          <Route path="tasks/:taskId" element={<TaskDetail />} />
          <Route path="clients" element={<ClientManagement />} />
          <Route path="projects" element={<ProjectManagement />} />
          <Route path="history" element={<SessionHistory />} />
          <Route path="monitoring" element={<AdminScreenshots />} />
          <Route path="reports" element={<ReportGenerator />} />
          <Route path="billing" element={<BillingManagement />} />
          <Route path="leads" element={<LeadManagement />} />
          <Route path="finder" element={<LeadFinder />} />
          <Route path="proposals" element={<ProposalDashboard />} />
          <Route path="proposals/all" element={<ProposalManagement />} />
          <Route path="proposals/new" element={<SmartProposalBuilder />} />
          <Route path="proposals/smart-builder" element={<SmartProposalBuilder />} />
          <Route path="proposals/edit/:id" element={<SmartProposalBuilder />} />
          <Route path="proposals/preview/:id" element={<ProposalPreview />} />
          <Route path="messages" element={<ChatSystem />} />
          <Route path="calls" element={<CallHistory />} />
          <Route path="profile" element={<ProfilePage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

function EmployeeArea() {
  return (
    <AppLayout role="employee">
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route index element={<DashboardOverview />} />
          <Route path="tasks" element={<TaskManagement />} />
          <Route path="tasks/:taskId" element={<TaskDetail />} />
          <Route path="clients" element={<ClientManagement />} />
          <Route path="history" element={<SessionHistory />} />
          <Route path="reports" element={<ReportGenerator />} />
          <Route path="leads" element={<LeadManagement />} />
          <Route path="finder" element={<LeadFinder />} />
          <Route path="proposals" element={<ProposalDashboard />} />
          <Route path="proposals/all" element={<ProposalManagement />} />
          <Route path="proposals/new" element={<SmartProposalBuilder />} />
          <Route path="proposals/smart-builder" element={<SmartProposalBuilder />} />
          <Route path="proposals/edit/:id" element={<SmartProposalBuilder />} />
          <Route path="proposals/preview/:id" element={<ProposalPreview />} />
          <Route path="messages" element={<ChatSystem />} />
          <Route path="calls" element={<CallHistory />} />
          <Route path="profile" element={<ProfilePage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

function SuperAdminArea() {
  return (
    <AppLayout role="super_admin">
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route index element={<DashboardOverview />} />
          <Route path="employees" element={<EmployeeManagement />} />
          <Route path="employees/:employeeId" element={<EmployeeDetail />} />
          <Route path="tasks" element={<TaskManagement />} />
          <Route path="tasks/:taskId" element={<TaskDetail />} />
          <Route path="clients" element={<ClientManagement />} />
          <Route path="projects" element={<ProjectManagement />} />
          <Route path="history" element={<SessionHistory />} />
          <Route path="monitoring" element={<AdminScreenshots />} />
          <Route path="reports" element={<ReportGenerator />} />
          <Route path="billing" element={<BillingManagement />} />
          <Route path="leads" element={<LeadManagement />} />
          <Route path="finder" element={<LeadFinder />} />
          <Route path="proposals" element={<ProposalDashboard />} />
          <Route path="proposals/all" element={<ProposalManagement />} />
          <Route path="proposals/new" element={<SmartProposalBuilder />} />
          <Route path="proposals/smart-builder" element={<SmartProposalBuilder />} />
          <Route path="proposals/edit/:id" element={<SmartProposalBuilder />} />
          <Route path="proposals/preview/:id" element={<ProposalPreview />} />
          <Route path="messages" element={<ChatSystem />} />
          <Route path="calls" element={<CallHistory />} />
          <Route path="admins" element={<AdminManagement />} />
          <Route path="profile" element={<ProfilePage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin/*" element={<AdminArea />} />
        </Route>
        <Route element={<ProtectedRoute roles={['super_admin']} />}>
          <Route path="/super-admin/*" element={<SuperAdminArea />} />
        </Route>
        <Route element={<ProtectedRoute roles={['employee']} />}>
          <Route path="/employee/*" element={<EmployeeArea />} />
        </Route>
        <Route element={<ProtectedRoute roles={['client', 'admin', 'super_admin']} />}>
          <Route path="/client/*" element={<ClientPortal />} />
        </Route>
        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
