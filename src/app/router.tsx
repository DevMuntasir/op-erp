import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/src/features/auth/LoginPage';
import { InvitePage } from '@/src/features/auth/InvitePage';
import { ProtectedRoute, RootRedirect } from '@/src/features/auth/route-guards';
import { AppLayout } from '@/src/components/layout';
import { DashboardOverview, AdminScreenshots, ReportGenerator } from '@/src/components/dashboard';
import { ProfilePage } from '@/src/components/profile';
import { EmployeeManagement } from '@/src/features/employees/EmployeeManagement';
import { TaskManagement, TaskDetail } from '@/src/components/tasks';

import { ClientManagement, ClientPortal } from '@/src/components/clients';

import { EmployeeDetail, SessionHistory } from '@/src/components/employees';

import { BillingManagement } from '@/src/components/billing';
import { LeadManagement, LeadFinder } from '@/src/components/leads';

import { ProposalDashboard, ProposalManagement, SmartProposalBuilder, ProposalPreview } from '@/src/components/proposals';

import { ChatSystem } from '@/src/components/communication';
import { CallHistory } from '@/src/components/calls';

function AdminArea() {
  return (
    <AppLayout role="admin">
      <Routes>
        <Route index element={<DashboardOverview />} />
        <Route path="employees" element={<EmployeeManagement />} />
        <Route path="employees/:employeeId" element={<EmployeeDetail />} />
        <Route path="tasks" element={<TaskManagement />} />
        <Route path="tasks/:taskId" element={<TaskDetail />} />
        <Route path="clients" element={<ClientManagement />} />
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
    </AppLayout>
  );
}

function EmployeeArea() {
  return (
    <AppLayout role="employee">
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
    </AppLayout>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route element={<ProtectedRoute roles={['super_admin', 'admin']} />}>
          <Route path="/admin/*" element={<AdminArea />} />
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
