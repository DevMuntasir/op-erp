import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/App';
import { Client, CurrencyCode, SUPPORTED_CURRENCIES, User } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, Mail, Phone, Building, User as UserIcon, Edit2, Trash2, Users, Globe, Clock, ShieldCheck, Share2, Lock, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/src/components/shared/dialogs/ConfirmDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient, deleteClient, updateClient } from '@/src/api/endpoints/clients.api';
import type { CreateClientRequest, UpdateClientRequest } from '@/src/api/endpoints/clients.api';
import { listClients } from '@/src/api/endpoints/clients.api';
import { listEmployees } from '@/src/api/endpoints/employees.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { formatCurrency } from '@/src/lib/utils';

type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  status: Client['status'];
  assignedDate: string;
  invoiceValue: string;
  selectedCurrency: CurrencyCode;
  notes: string;
  assignedEmployees: string[];
  portalPassword: string;
};

const initialFormState = (): ClientFormState => ({
  name: '',
  email: '',
  phone: '',
  company: '',
  website: '',
  status: 'active',
  assignedDate: new Date().toISOString().split('T')[0],
  invoiceValue: '',
  selectedCurrency: 'USD',
  notes: '',
  assignedEmployees: [],
  portalPassword: '',
});

const toClientNumber = (value: Client['invoiceValue']) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeClient = (client: Client): Client => ({
  ...client,
  assignedEmployees: client.assignedEmployees ?? [],
  phone: client.phone ?? null,
  company: client.company ?? null,
  website: client.website ?? null,
  notes: client.notes ?? null,
  currency: client.currency ?? 'USD',
  invoiceValue: toClientNumber(client.invoiceValue),
});

const getClientPayload = (form: ClientFormState): CreateClientRequest => {
  const payload: CreateClientRequest = {
    name: form.name.trim(),
    email: form.email.trim(),
    status: form.status || 'active',
  };

  if (form.phone.trim()) payload.phone = form.phone.trim();
  if (form.company.trim()) payload.company = form.company.trim();
  if (form.website.trim()) payload.website = form.website.trim();
  if (form.assignedEmployees.length > 0) payload.assignedEmployees = form.assignedEmployees;
  if (form.notes.trim()) payload.notes = form.notes.trim();
  if (form.selectedCurrency) payload.currency = form.selectedCurrency;

  const parsedInvoice = Number.parseFloat(form.invoiceValue);
  if (Number.isFinite(parsedInvoice)) {
    payload.invoiceValue = parsedInvoice;
  }

  return payload;
};

const getAdminLabel = (adminId: string, currentUser: User | null) => {
  if (!adminId) return 'Direct';
  if (currentUser?.uid === adminId) return currentUser.name;
  return adminId.length > 12 ? `${adminId.slice(0, 6)}...${adminId.slice(-4)}` : adminId;
};

export const ClientManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [form, setForm] = useState<ClientFormState>(initialFormState);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  const clientsQuery = useQuery({
    queryKey: queryKeys.clients({ scope: user?.role ?? 'anonymous' }),
    queryFn: listClients,
    enabled: !!user,
  });

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees,
    queryFn: listEmployees,
    enabled: !!user && isAdmin,
  });

  const normalizedClients = useMemo(() => (clientsQuery.data ?? []).map(normalizeClient), [clientsQuery.data]);
  const employees = useMemo(() => (employeesQuery.data ?? []).filter((employee) => employee.role === 'employee'), [employeesQuery.data]);

  const adminOptions = useMemo(
    () =>
      [...new Set(normalizedClients.map((client) => client.adminId).filter(Boolean))].map((adminId) => ({
        id: adminId,
        label: getAdminLabel(adminId, user ?? null),
      })),
    [normalizedClients, user],
  );

  const employeeMap = useMemo(() => new Map(employees.map((employee) => [employee.uid, employee])), [employees]);

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Client added successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Failed to save client', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateClientRequest }) => updateClient(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Client updated successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Failed to save client', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Client removed successfully');
      setDeletingClient(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete client', { description: error.message });
    },
  });

  const disabledFeatureMessage = (label: string) => {
    toast.info(`${label} is unavailable`, {
      description: 'This action is not supported in the API-backed client module yet.',
    });
  };

  const resetForm = () => {
    setForm(initialFormState());
    setEditingClient(null);
    setIsAdding(false);
  };

  const filteredClients = useMemo(() => {
    return normalizedClients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAdmin = adminFilter === 'all' || client.adminId === adminFilter;
      const matchesEmployee = employeeFilter === 'all' || client.assignedEmployees?.includes(employeeFilter);
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

      return matchesSearch && matchesAdmin && matchesEmployee && matchesStatus;
    });
  }, [adminFilter, employeeFilter, normalizedClients, searchTerm, statusFilter]);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and Email are required');
      return;
    }

    if (form.portalPassword.trim()) {
      disabledFeatureMessage('Client portal account creation');
      return;
    }

    const payload = getClientPayload(form);
    if (editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, body: payload });
      return;
    }
    await createMutation.mutateAsync(payload);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      company: client.company || '',
      website: client.website || '',
      status: client.status || 'active',
      assignedDate:
        typeof client.assignedDate === 'string' && client.assignedDate
          ? client.assignedDate.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      invoiceValue: client.invoiceValue != null ? String(toClientNumber(client.invoiceValue)) : '',
      selectedCurrency: (client.currency as CurrencyCode) || 'USD',
      notes: client.notes || '',
      assignedEmployees: client.assignedEmployees || [],
      portalPassword: '',
    });
    setIsAdding(true);
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    await deleteMutation.mutateAsync(deletingClient.id);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const loading = clientsQuery.isLoading;
  const loadingError = clientsQuery.error as Error | null;

  return (
    <div className="p-4 lg:p-8 bg-zinc-50/50 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Client Management</h1>
          <p className="text-zinc-500 text-sm">Manage agency clients and employee assignments.</p>
        </div>
        {isAdmin && (
          <Dialog
            open={isAdding}
            onOpenChange={(open) => {
              if (!open) resetForm();
              setIsAdding(open);
            }}
          >
            <DialogTrigger
              render={
                <Button >
                  <Plus className="w-4 h-4" />
                  Add Client
                </Button>
              }
            />
            <DialogContent className="max-w-2xl max-h-[90vh] min-h-0 overflow-hidden flex flex-col p-0 rounded-2xl border-zinc-200">
              <DialogHeader className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                <DialogTitle className="text-xl font-bold">{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                <DialogDescription>Enter the client's information and assign team members.</DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6">
                <form id="client-form" onSubmit={handleSaveClient} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Contact Name</Label>
                      <Input
                        placeholder="John Doe"
                        value={form.name}
                        onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                        className="rounded-xl border-zinc-200 h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Email Address</Label>
                      <Input
                        type="email"
                        placeholder="john@company.com"
                        value={form.email}
                        onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                        className="rounded-xl border-zinc-200 h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Phone Number</Label>
                      <Input
                        placeholder="+1 (555) 000-0000"
                        value={form.phone}
                        onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                        className="rounded-xl border-zinc-200 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Company Name</Label>
                      <Input
                        placeholder="e.g. Acme Corp"
                        value={form.company}
                        onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))}
                        className="rounded-xl border-zinc-200 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Website</Label>
                      <Input
                        placeholder="https://example.com"
                        value={form.website}
                        onChange={(e) => setForm((current) => ({ ...current, website: e.target.value }))}
                        className="rounded-xl border-zinc-200 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</Label>
                      <Select value={form.status} onValueChange={(value: Client['status']) => setForm((current) => ({ ...current, status: value }))}>
                        <SelectTrigger className="rounded-xl border-zinc-200 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Assigned Date</Label>
                      <Input
                        type="date"
                        value={form.assignedDate}
                        onChange={(e) => setForm((current) => ({ ...current, assignedDate: e.target.value }))}
                        className="rounded-xl border-zinc-200 h-11"
                        disabled
                      />
                      <p className="text-[10px] text-zinc-500">Read-only placeholder. The current client API does not persist assigned dates.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Invoice Value</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={form.invoiceValue}
                          onChange={(e) => setForm((current) => ({ ...current, invoiceValue: e.target.value }))}
                          className="rounded-xl border-zinc-200 h-11 flex-1"
                        />
                        <Select
                          value={form.selectedCurrency}
                          onValueChange={(value: CurrencyCode) => setForm((current) => ({ ...current, selectedCurrency: value }))}
                        >
                          <SelectTrigger className="rounded-xl border-zinc-200 h-11 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            {SUPPORTED_CURRENCIES.map((curr) => (
                              <SelectItem key={curr.code} value={curr.code}>
                                {curr.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {!editingClient && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                          <Lock className="w-3 h-3" />
                          Portal Password (Optional)
                        </Label>
                        <Input
                          type="password"
                          placeholder="Create portal account instantly"
                          value={form.portalPassword}
                          onChange={(e) => setForm((current) => ({ ...current, portalPassword: e.target.value }))}
                          className="rounded-xl border-zinc-200 h-11"
                        />
                        <p className="text-[10px] text-zinc-500">Portal creation is unavailable in the API-backed client module.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Assign Team Members</Label>
                    <ScrollArea className="h-40 rounded-xl border border-zinc-200 bg-zinc-50/40 p-3">
                      <div className="space-y-2">
                        {employees.map((emp) => (
                          <label
                            key={emp.uid}
                            className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 border border-zinc-100 cursor-pointer hover:border-zinc-200 transition-colors"
                          >
                            <Checkbox
                              checked={form.assignedEmployees.includes(emp.uid)}
                              onCheckedChange={(checked) =>
                                setForm((current) => ({
                                  ...current,
                                  assignedEmployees: checked
                                    ? [...current.assignedEmployees, emp.uid]
                                    : current.assignedEmployees.filter((id) => id !== emp.uid),
                                }))
                              }
                            />
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={emp.photoURL || undefined} />
                              <AvatarFallback>{emp.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-zinc-900 truncate">{emp.name}</div>
                              <div className="text-xs text-zinc-500 truncate">{emp.email}</div>
                            </div>
                          </label>
                        ))}
                        {!employees.length && (
                          <div className="text-xs text-zinc-500 px-3 py-6 text-center">No employee options available for assignment.</div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Internal Notes</Label>
                    <Input
                      placeholder="Add any context about this client..."
                      value={form.notes}
                      onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                      className="rounded-xl border-zinc-200 h-11"
                    />
                  </div>
                </form>
              </div>

              <DialogFooter className="p-6 border-t border-zinc-100 bg-white">
                <Button type="button" variant="ghost" onClick={resetForm} className="rounded-xl h-11 px-6">
                  Cancel
                </Button>
                <Button type="submit" form="client-form" disabled={isSaving} className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-11 px-8">
                  {isSaving ? 'Saving...' : editingClient ? 'Update Client' : 'Create Client'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="rounded-2xl border-zinc-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/30 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search by name, email or company..."
                className="pl-10 h-10 rounded-xl bg-white border-zinc-200 focus-visible:ring-zinc-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isSuperAdmin && (
                <div className="min-w-[140px]">
                  <Select value={adminFilter} onValueChange={setAdminFilter}>
                    <SelectTrigger className="h-10 rounded-xl bg-white border-zinc-200 text-xs">
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-zinc-400" />
                        <SelectValue placeholder="All Agencies" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agencies</SelectItem>
                      {adminOptions.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="min-w-[140px]">
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-white border-zinc-200 text-xs">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <SelectValue placeholder="All Employees" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.uid} value={employee.uid}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[120px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-white border-zinc-200 text-xs">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-zinc-400" />
                      <SelectValue placeholder="Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-b border-zinc-100">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-6 h-12">Client / Company</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12">Contact Details</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12">Invoice & Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12">Assigned Team</TableHead>
                {isSuperAdmin && <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12">Agency</TableHead>}
                {isAdmin && <TableHead className="text-right h-12 px-6"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 7 : 6} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                      <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
                      <span className="text-xs font-medium">Loading clients...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadingError ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 7 : 6} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                      <p className="text-sm font-bold text-zinc-900">Failed to load clients</p>
                      <p className="text-xs max-w-[260px]">{loadingError.message}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-zinc-50/50 transition-colors border-b border-zinc-50">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0 border border-zinc-200">
                          <Building className="w-5 h-5 font-bold" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-900 truncate">{client.company || 'Private Client'}</div>
                          <div className="text-xs text-zinc-500 font-medium truncate flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3" />
                            {client.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-zinc-600 group cursor-pointer">
                          <Mail className="w-3 h-3 text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                          <span className="text-xs font-medium">{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-zinc-600 group cursor-pointer">
                            <Phone className="w-3 h-3 text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                            <span className="text-xs font-medium">{client.phone}</span>
                          </div>
                        )}
                        {client.website && (
                          <a href={client.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium">
                            <Globe className="w-3 h-3" />
                            <span className="text-[10px] uppercase tracking-wider font-bold">Visit Site</span>
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`rounded-xl px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border-none shadow-sm ${
                          client.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : client.status === 'lead'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-zinc-900">{formatCurrency(toClientNumber(client.invoiceValue), client.currency || 'USD')}</div>
                        <div className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {client.assignedDate ? new Date(client.assignedDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2 overflow-hidden">
                        {(client.assignedEmployees || []).length > 0 ? (
                          client.assignedEmployees.map((empId) => {
                            const employee = employeeMap.get(empId);
                            if (!employee) return null;
                            return (
                              <Avatar key={empId} className="w-7 h-7 border-2 border-white ring-1 ring-zinc-100" title={employee.name}>
                                <AvatarImage src={employee.photoURL || undefined} />
                                <AvatarFallback className="bg-zinc-100 text-[8px] font-black">{employee.name[0]}</AvatarFallback>
                              </Avatar>
                            );
                          })
                        ) : (
                          <span className="text-xs text-zinc-400 font-medium italic">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold border-zinc-200 text-zinc-500 bg-zinc-50">
                          {getAdminLabel(client.adminId, user ?? null)}
                        </Badge>
                      </TableCell>
                    )}
                    {isAdmin && (
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                              title="Issue Manual Invoice"
                              onClick={() => disabledFeatureMessage('Manual invoice')}
                            >
                              <Receipt className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                            title="Change Password"
                            onClick={() => disabledFeatureMessage('Client password reset')}
                          >
                            <Lock className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-brand hover:text-brand hover:bg-brand/5"
                            title="Copy Invite Link"
                            onClick={() => disabledFeatureMessage('Client invite link')}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Invite to Portal"
                            onClick={() => disabledFeatureMessage('Client portal invite')}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100" onClick={() => handleEdit(client)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeletingClient(client)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 7 : 6} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-3 text-zinc-400">
                      <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        <Users className="w-8 h-8 text-zinc-100" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-zinc-900">No clients found</p>
                        <p className="text-xs max-w-[240px] mx-auto">Try adjusting your filters or search term to find what you're looking for.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        onConfirm={handleDelete}
        title="Delete Client?"
        description={`Are you sure you want to remove ${deletingClient?.company || deletingClient?.name}? All associated assignments will be lost. This action cannot be undone.`}
      />
    </div>
  );
};
