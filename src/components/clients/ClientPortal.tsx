import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Briefcase, CheckCircle2, ListTodo, Loader2, PlayCircle, Search, UserRound } from 'lucide-react';
import { listClients } from '@/src/api/endpoints/clients.api';
import { useAuth } from '@/src/App';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/src/lib/utils';
import { Client } from '@/src/shared/types/domain';

type ClientPortalStats = {
  totalProjects: number;
  runningProjects: number;
  totalEmployees: number;
  totalTasks: number;
  runningTasks: number;
  completedTasks: number;
};

const hashText = (value: string) =>
  value.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);

const buildDemoStats = (client: Client): ClientPortalStats => {
  const base = hashText(client.id || client.email || client.name);

  const totalProjects = (base % 8) + 3;
  const runningProjects = Math.min(totalProjects, Math.max(1, base % totalProjects));
  const totalEmployees = (base % 12) + 3;
  const totalTasks = totalProjects * ((base % 5) + 4);
  const runningTasks = Math.max(1, Math.floor(totalTasks * 0.4));
  const completedTasks = Math.max(0, totalTasks - runningTasks);

  return {
    totalProjects,
    runningProjects,
    totalEmployees,
    totalTasks,
    runningTasks,
    completedTasks,
  };
};

const StatCard: React.FC<{
  title: string;
  value: number;
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

export const ClientPortal: React.FC = () => {
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const isPortalManager = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    let isMounted = true;

    const loadClients = async () => {
      if (!isPortalManager) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await listClients();

        if (!isMounted) return;

        setClients(data || []);
        setSelectedClientId((prev) => prev || data?.[0]?.id || '');
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load clients. Please try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadClients();

    return () => {
      isMounted = false;
    };
  }, [isPortalManager]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) => {
      const name = client.name?.toLowerCase() || '';
      const email = client.email?.toLowerCase() || '';
      const company = client.company?.toLowerCase() || '';
      return name.includes(term) || email.includes(term) || company.includes(term);
    });
  }, [clients, searchTerm]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || null,
    [clients, selectedClientId],
  );

  const stats = useMemo(() => (selectedClient ? buildDemoStats(selectedClient) : null), [selectedClient]);

  if (!isPortalManager) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Card className="w-full max-w-xl rounded-2xl border-zinc-200/80">
          <CardHeader>
            <CardTitle>Client Portal</CardTitle>
            <CardDescription>You do not have access to manage client portals.</CardDescription>
          </CardHeader>
        </Card>
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
            {loading ? (
              <div className="flex h-60 items-center justify-center text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading clients...
              </div>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : filteredClients.length === 0 ? (
              <p className="text-sm text-zinc-500">No clients found.</p>
            ) : (
              <ScrollArea className="h-[62vh] pr-2">
                <div className="space-y-2">
                  {filteredClients.map((client) => {
                    const isSelected = client.id === selectedClientId;

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
                          <p
                            className={cn(
                              'mt-1 truncate text-[11px]',
                              isSelected ? 'text-zinc-400' : 'text-zinc-400',
                            )}
                          >
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
                      Demo Portal
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-4 text-sm text-zinc-600 md:grid-cols-2">
                    <div className="rounded-xl bg-zinc-100/70 p-4">
                      <p className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">Company</p>
                      <p className="font-semibold text-zinc-900">{selectedClient.company || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-100/70 p-4">
                      <p className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">Website</p>
                      <p className="font-semibold text-zinc-900">{selectedClient.website || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-100/70 p-4">
                      <p className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">Phone</p>
                      <p className="font-semibold text-zinc-900">{selectedClient.phone || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-100/70 p-4">
                      <p className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">Status</p>
                      <p className="font-semibold capitalize text-zinc-900">{selectedClient.status || 'active'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {stats && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <StatCard
                    title="Total Projects"
                    value={stats.totalProjects}
                    subtitle="All projects under this client"
                    icon={<Briefcase className="h-4 w-4" />}
                  />
                  <StatCard
                    title="Running Projects"
                    value={stats.runningProjects}
                    subtitle="Currently active projects"
                    icon={<PlayCircle className="h-4 w-4" />}
                  />
                  <StatCard
                    title="Employees"
                    value={stats.totalEmployees}
                    subtitle="Assigned team members"
                    icon={<UserRound className="h-4 w-4" />}
                  />
                  <StatCard
                    title="Total Tasks"
                    value={stats.totalTasks}
                    subtitle="Tasks across all projects"
                    icon={<ListTodo className="h-4 w-4" />}
                  />
                  <StatCard
                    title="Running Tasks"
                    value={stats.runningTasks}
                    subtitle="Tasks in progress"
                    icon={<Loader2 className="h-4 w-4" />}
                  />
                  <StatCard
                    title="Completed Tasks"
                    value={stats.completedTasks}
                    subtitle="Delivered and done"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  />
                </div>
              )}

              <Card className="rounded-3xl border-dashed border-zinc-300 bg-white/70">
                <CardHeader>
                  <CardTitle className="text-base">API Integration Next</CardTitle>
                  <CardDescription>
                    These metrics are demo values. Later you can replace them with real project/task/employee APIs for this selected client.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-xl border-zinc-300">
                    <Building2 className="mr-2 h-4 w-4" /> Connect Projects API
                  </Button>
                  <Button variant="outline" className="rounded-xl border-zinc-300">
                    <ListTodo className="mr-2 h-4 w-4" /> Connect Tasks API
                  </Button>
                  <Button variant="outline" className="rounded-xl border-zinc-300">
                    <UserRound className="mr-2 h-4 w-4" /> Connect Employees API
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
