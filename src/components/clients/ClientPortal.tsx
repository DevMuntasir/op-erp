import React, { useMemo, useState } from 'react';
import { Briefcase, CheckCircle2, ListTodo, Loader2, PlayCircle, Receipt, Search } from 'lucide-react';
import { useAuth } from '@/src/App';
import { useClients, useInvoices, useTasks } from '@/src/hooks/useApiQueries';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatCurrency } from '@/src/lib/utils';
import { Client, Invoice, Task } from '@/src/shared/types/domain';
import { CurrencyCode } from '@/src/types';

type ClientPortalStats = {
  totalProjects: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalInvoices: number;
  amountDue: number;
};

const buildStats = (tasks: Task[], invoices: Invoice[]): ClientPortalStats => {
  const completedTasks = tasks.filter((t) => t.status === 'submitted').length;
  const unpaid = invoices.filter((inv) => inv.status !== 'paid');

  return {
    totalProjects: new Set(tasks.map((t) => t.projectId).filter(Boolean)).size,
    totalTasks: tasks.length,
    activeTasks: tasks.length - completedTasks,
    completedTasks,
    totalInvoices: invoices.length,
    amountDue: unpaid.reduce((sum, inv) => sum + (inv.amount ?? 0), 0),
  };
};

const StatCard: React.FC<{
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
}> = ({ title, value, subtitle, icon }) => (
  <Card className="rounded-2xl border-zinc-200/80 shadow-sm">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardDescription className="text-[11px] uppercase tracking-widest text-zinc-500">{title}</CardDescription>
        <div className="text-zinc-400">{icon}</div>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-black tracking-tight text-zinc-900">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
    </CardContent>
  </Card>
);

const StatsGrid: React.FC<{ stats: ClientPortalStats; loading: boolean; currency?: CurrencyCode }> = ({ stats, loading, currency }) => {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        title="Projects"
        value={stats.totalProjects}
        subtitle="Projects with tasks under this account"
        icon={<Briefcase className="h-4 w-4" />}
      />
      <StatCard
        title="Total Tasks"
        value={stats.totalTasks}
        subtitle="Tasks across all projects"
        icon={<ListTodo className="h-4 w-4" />}
      />
      <StatCard
        title="Active Tasks"
        value={stats.activeTasks}
        subtitle="Pending or in progress"
        icon={<PlayCircle className="h-4 w-4" />}
      />
      <StatCard
        title="Completed Tasks"
        value={stats.completedTasks}
        subtitle="Delivered and submitted"
        icon={<CheckCircle2 className="h-4 w-4" />}
      />
      <StatCard
        title="Invoices"
        value={stats.totalInvoices}
        subtitle="All invoices issued"
        icon={<Receipt className="h-4 w-4" />}
      />
      <StatCard
        title="Amount Due"
        value={formatCurrency(stats.amountDue, currency)}
        subtitle="Across unpaid invoices"
        icon={<Receipt className="h-4 w-4" />}
      />
    </div>
  );
};

const ProfileField: React.FC<{ label: string; value?: string | null; capitalize?: boolean }> = ({ label, value, capitalize }) => {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-zinc-100/70 p-4">
      <p className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={cn('font-semibold text-zinc-900', capitalize && 'capitalize')}>{value}</p>
    </div>
  );
};

export const ClientPortal: React.FC = () => {
  const { user } = useAuth();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const isPortalManager = user?.role === 'admin' || user?.role === 'super_admin';
  const isClient = user?.role === 'client';

  // The backend scopes these lists to the caller's role: a client only receives
  // their own tasks/invoices, so the same hooks serve both portal views.
  const tasksQuery = useTasks({}, { refetchInterval: false });
  const invoicesQuery = useInvoices({}, { refetchInterval: false });
  const clientsQuery = useClients(undefined, { enabled: isPortalManager, refetchInterval: false });

  const clients = clientsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const statsLoading = tasksQuery.isLoading || invoicesQuery.isLoading;

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client: Client) => {
      const name = client.name?.toLowerCase() || '';
      const email = client.email?.toLowerCase() || '';
      const company = client.company?.toLowerCase() || '';
      return name.includes(term) || email.includes(term) || company.includes(term);
    });
  }, [clients, searchTerm]);

  const selectedClient = useMemo(
    () => clients.find((client: Client) => client.id === selectedClientId) || clients[0] || null,
    [clients, selectedClientId],
  );

  const selectedClientStats = useMemo(() => {
    if (!selectedClient) return null;
    const clientEmail = selectedClient.email?.toLowerCase();
    const clientTasks = tasks.filter((t: Task) => t.clientEmail?.toLowerCase() === clientEmail);
    const clientInvoices = invoices.filter(
      (inv: Invoice) => inv.clientId === selectedClient.id || inv.clientEmail?.toLowerCase() === clientEmail,
    );
    return buildStats(clientTasks, clientInvoices);
  }, [selectedClient, tasks, invoices]);

  if (isClient) {
    const clientStats = buildStats(tasks, invoices);

    return (
      <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <Card className="rounded-3xl border-zinc-200/80 bg-white shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-3xl font-black tracking-tight">{user?.name || 'Client'}</CardTitle>
                  <CardDescription>{user?.email}</CardDescription>
                </div>
                <Badge className="bg-zinc-900 px-3 py-1 text-xs uppercase tracking-wider text-white hover:bg-zinc-900">
                  Your Portal
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 text-sm text-zinc-600 md:grid-cols-2">
                <ProfileField label="Email" value={user?.email} />
                <ProfileField label="Phone" value={user?.phone ?? user?.phoneNumber} />
                <ProfileField label="Status" value={user?.isDisabled ? 'inactive' : 'active'} capitalize />
              </div>
            </CardContent>
          </Card>

          <StatsGrid stats={clientStats} loading={statsLoading} currency={invoices[0]?.currency as CurrencyCode | undefined} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="rounded-3xl border-zinc-200/80 shadow-sm">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-xl">Client Selector</CardTitle>
              <CardDescription>Pick a client to open their portal dashboard.</CardDescription>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, company"
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent>
            {clientsQuery.isLoading ? (
              <div className="flex h-60 items-center justify-center text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading clients...
              </div>
            ) : clientsQuery.isError ? (
              <p className="text-sm text-red-500">Failed to load clients. Please try again.</p>
            ) : filteredClients.length === 0 ? (
              <p className="text-sm text-zinc-500">No clients found.</p>
            ) : (
              <ScrollArea className="h-[62vh] pr-2">
                <div className="space-y-2">
                  {filteredClients.map((client: Client) => {
                    const isSelected = client.id === (selectedClient?.id ?? '');

                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className={cn(
                          'w-full rounded-2xl border px-4 py-3 text-left transition-all',
                          isSelected
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-100/60',
                        )}
                      >
                        <p className="truncate text-sm font-semibold">{client.name}</p>
                        <p
                          className={cn(
                            'truncate text-xs',
                            isSelected ? 'text-zinc-300' : 'text-zinc-500',
                          )}
                        >
                          {client.email}
                        </p>
                        {client.company ? (
                          <p className="mt-1 truncate text-[11px] text-zinc-400">
                            {client.company}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {!selectedClient ? (
            <Card className="rounded-3xl border-zinc-200/80">
              <CardContent className="py-20 text-center text-zinc-500">Select a client to view portal details.</CardContent>
            </Card>
          ) : (
            <>
              <Card className="rounded-3xl border-zinc-200/80 bg-white shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight">{selectedClient.name}</CardTitle>
                      <CardDescription>{selectedClient.email}</CardDescription>
                    </div>
                    <Badge className="bg-zinc-900 px-3 py-1 text-xs uppercase tracking-wider text-white hover:bg-zinc-900">
                      Client Portal
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-4 text-sm text-zinc-600 md:grid-cols-2">
                    <ProfileField label="Company" value={selectedClient.company} />
                    <ProfileField label="Website" value={selectedClient.website} />
                    <ProfileField label="Phone" value={selectedClient.phone} />
                    <ProfileField label="Status" value={selectedClient.status || 'active'} capitalize />
                  </div>
                </CardContent>
              </Card>

              {selectedClientStats && (
                <StatsGrid
                  stats={selectedClientStats}
                  loading={statsLoading}
                  currency={(selectedClient.currency as CurrencyCode | null) ?? undefined}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
