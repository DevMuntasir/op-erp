import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/src/App';
import { listEmployees } from '@/src/api/endpoints/employees.api';
import { listTasks } from '@/src/api/endpoints/tasks.api';
import { listSessions } from '@/src/api/endpoints/sessions.api';
import { listScreenshots } from '@/src/api/endpoints/screenshots.api';
import { listInvoices } from '@/src/api/endpoints/invoices.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Activity, Camera, CheckCircle2, Clock, CreditCard, Users } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

export const DashboardOverview = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isDashboardPage = location.pathname.includes('/dashboard') || location.pathname.match(/\/(admin|super-admin|employee)$/);

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees,
    queryFn: listEmployees,
    enabled: user?.role === 'admin' || user?.role === 'super_admin',
    refetchInterval: 30_000,
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks({ dashboard: true }),
    queryFn: listTasks,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions({ dashboard: true }),
    queryFn: listSessions,
    enabled: !!user && isDashboardPage,
    refetchInterval: isDashboardPage ? 10_000 : undefined,
  });

  const screenshotsQuery = useQuery({
    queryKey: queryKeys.screenshots({ dashboard: true }),
    queryFn: listScreenshots,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const invoicesQuery = useQuery({
    queryKey: queryKeys.invoices({ dashboard: true }),
    queryFn: listInvoices,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const employees = employeesQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const screenshots = screenshotsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];

  const stats = useMemo(() => {
    const activeSessions = sessions.filter((session) => session.status === 'active');
    const completedTasks = tasks.filter((task) => task.status === 'submitted');
    const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
    const openTasks = tasks.filter((task) => task.status !== 'submitted' && !task.isDeleted);
    const revenue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

    return {
      employeeCount: employees.length,
      activeSessions: activeSessions.length,
      completedTasks: completedTasks.length,
      openTasks: openTasks.length,
      revenue,
    };
  }, [employees, sessions, tasks, invoices]);

  const recentShots = screenshots.slice(0, 4);
  const activeEmployees = employees.filter((employee) => employee.status === 'online').slice(0, 5);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          {user?.role === 'employee' ? 'My Dashboard' : 'Dashboard Overview'}
        </h1>
        <p className="text-zinc-500">
          Live agency activity powered by the backend API.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardDescription>Team Members</CardDescription>
            <CardTitle className="flex items-center justify-between text-3xl">
              {stats.employeeCount}
              <Users className="h-5 w-5 text-zinc-400" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardDescription>Active Sessions</CardDescription>
            <CardTitle className="flex items-center justify-between text-3xl">
              {stats.activeSessions}
              <Activity className="h-5 w-5 text-zinc-400" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardDescription>Completed Tasks</CardDescription>
            <CardTitle className="flex items-center justify-between text-3xl">
              {stats.completedTasks}
              <CheckCircle2 className="h-5 w-5 text-zinc-400" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardDescription>Open Tasks</CardDescription>
            <CardTitle className="flex items-center justify-between text-3xl">
              {stats.openTasks}
              <Clock className="h-5 w-5 text-zinc-400" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardDescription>Revenue</CardDescription>
            <CardTitle className="flex items-center justify-between text-3xl">
              {formatCurrency(stats.revenue)}
              <CreditCard className="h-5 w-5 text-zinc-400" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Recent Screenshots</CardTitle>
            <CardDescription>Latest monitoring captures from active sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentShots.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {recentShots.map((shot) => (
                  <div key={shot.id} className="overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50">
                    {shot.screenshotUrl || shot.storagePath ? (
                      <img
                        src={shot.screenshotUrl || shot.storagePath || ''}
                        alt="Screenshot"
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-zinc-100 text-zinc-400">
                        <Camera className="h-8 w-8" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-sm font-semibold text-zinc-900">Session {shot.sessionId}</p>
                      <p className="text-xs text-zinc-500">
                        {shot.createdAt || shot.timestamp
                          ? formatDistanceToNowStrict(new Date(shot.createdAt || shot.timestamp || ''), { addSuffix: true })
                          : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-400">
                No screenshots available yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Team Activity</CardTitle>
            <CardDescription>Who is online and currently active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeEmployees.length ? (
              activeEmployees.map((employee) => (
                <div key={employee.uid} className="flex items-center justify-between rounded-2xl border border-zinc-100 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee.photoURL || undefined} />
                      <AvatarFallback>{employee.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-zinc-900">{employee.name}</p>
                      <p className="text-xs text-zinc-500">{employee.email}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Online</Badge>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-400">
                No active team members right now.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
