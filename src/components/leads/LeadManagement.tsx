import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/App';
import { Lead } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Phone, Mail, User, Edit2, Trash2, Search, Filter, MapPin, ClipboardList, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { CallLoggerDialog } from '@/src/components/calls/CallLogger';
import { ConfirmDialog } from '@/src/components/shared/dialogs/ConfirmDialog';
import { logCallAutomatically } from '@/src/lib/calls';
import { createLead, deleteLead, listLeads, updateLead } from '@/src/api/endpoints/leads.api';
import type { CreateLeadRequest, UpdateLeadRequest } from '@/src/api/endpoints/leads.api';
import { queryKeys } from '@/src/shared/constants/query-keys';

type LeadFormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  location: string;
  website: string;
  status: Lead['status'];
  source: string;
  notes: string;
};

const initialFormState = (): LeadFormState => ({
  name: '',
  email: '',
  phone: '',
  company: '',
  jobTitle: '',
  location: '',
  website: '',
  status: 'new',
  source: '',
  notes: '',
});

const toLeadPayload = (form: LeadFormState): CreateLeadRequest => {
  const payload: CreateLeadRequest = {
    name: form.name.trim(),
    status: form.status || 'new',
  };

  if (form.email.trim()) payload.email = form.email.trim();
  if (form.phone.trim()) payload.phone = form.phone.trim();
  if (form.company.trim()) payload.company = form.company.trim();
  if (form.jobTitle.trim()) payload.jobTitle = form.jobTitle.trim();
  if (form.location.trim()) payload.address = form.location.trim();
  if (form.website.trim()) payload.website = form.website.trim();
  if (form.source.trim()) payload.source = form.source.trim();
  if (form.notes.trim()) payload.notes = form.notes.trim();

  return payload;
};

export const LeadManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadFormState>(initialFormState);

  const leadsQuery = useQuery({
    queryKey: queryKeys.leads({ scope: user?.role ?? 'anonymous' }),
    queryFn: listLeads,
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Lead added successfully');
      setIsAdding(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Failed to add lead', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLeadRequest }) => updateLead(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Lead updated successfully');
      setEditingLead(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Failed to update lead', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Lead deleted successfully');
      setDeletingLead(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete lead', { description: error.message });
    },
  });

  const resetForm = () => {
    setForm(initialFormState());
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    await createMutation.mutateAsync(toLeadPayload(form));
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead || !form.name.trim()) return;
    await updateMutation.mutateAsync({ id: editingLead.id, body: toLeadPayload(form) });
  };

  const handleDeleteLead = async () => {
    if (!deletingLead) return;
    await deleteMutation.mutateAsync(deletingLead.id);
  };

  const handleCallNow = (lead: Lead) => {
    if (user) {
      logCallAutomatically(user, lead);
    }
  };

  const startEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone,
      company: lead.company || '',
      jobTitle: lead.jobTitle || '',
      location: lead.location || lead.address || '',
      website: lead.website || '',
      status: lead.status || 'new',
      source: lead.source || '',
      notes: lead.notes || '',
    });
  };

  const leads = leadsQuery.data ?? [];
  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const matchesSearch =
          lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.phone.includes(searchTerm) ||
          (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.jobTitle && lead.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
          ((lead.location || lead.address) && (lead.location || lead.address || '').toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [leads, searchTerm, statusFilter],
  );

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'contacted':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'qualified':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'lost':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'won':
        return 'bg-zinc-900 text-white border-zinc-900';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  const renderLeadForm = (onSubmit: (e: React.FormEvent) => Promise<void> | void, submitLabel: string, isSubmitting: boolean) => (
    <form onSubmit={onSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="John Doe" required />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Company Name</Label>
          <Input value={form.company} onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))} placeholder="Acme Inc." />
        </div>
        <div className="space-y-2">
          <Label>Job Title</Label>
          <Input value={form.jobTitle} onChange={(e) => setForm((current) => ({ ...current, jobTitle: e.target.value }))} placeholder="CEO" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} placeholder="New York, USA" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email Address</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} placeholder="john@example.com" />
        </div>
        <div className="space-y-2">
          <Label>Website</Label>
          <Input value={form.website} onChange={(e) => setForm((current) => ({ ...current, website: e.target.value }))} placeholder="https://example.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(value: Lead['status']) => setForm((current) => ({ ...current, status: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="won">Won</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Source</Label>
          <Input value={form.source} onChange={(e) => setForm((current) => ({ ...current, source: e.target.value }))} placeholder="Website, Referral, etc." />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Additional details..." className="h-24" />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full bg-zinc-900 hover:bg-zinc-800">
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Lead Management</h2>
            <p className="text-zinc-500">Track and manage your agency's potential clients.</p>
          </div>
          <Dialog
            open={isAdding}
            onOpenChange={(open) => {
              setIsAdding(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger
              render={
                <Button className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Lead
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] min-h-0 overflow-hidden flex flex-col p-0">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 pt-0">{renderLeadForm(handleAddLead, 'Create Lead', createMutation.isPending)}</div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input placeholder="Search leads by name, email or phone..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="won">Won</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {leadsQuery.isLoading ? (
          <div className="py-20 text-center text-zinc-500">Loading leads...</div>
        ) : leadsQuery.error ? (
          <div className="py-20 text-center">
            <h3 className="text-lg font-medium text-zinc-900">Failed to load leads</h3>
            <p className="text-zinc-500">{(leadsQuery.error as Error).message}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => (
              <Card key={lead.id || `${lead.name}-${lead.phone}`} className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={`${getStatusColor(lead.status)} font-medium`}>
                      {(lead.status || 'new').toUpperCase()}
                    </Badge>
                    <div className="flex gap-1">
                      <Dialog open={editingLead?.id === lead.id} onOpenChange={(open) => !open && setEditingLead(null)}>
                        <DialogTrigger
                          render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" onClick={() => startEdit(lead)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Edit Lead</DialogTitle>
                          </DialogHeader>
                          {renderLeadForm(handleUpdateLead, 'Update Lead', updateMutation.isPending)}
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-rose-600" onClick={() => setDeletingLead(lead)} disabled={!lead.id}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl mt-2">{lead.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {(lead.company || lead.jobTitle) && (
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                        <User className="w-4 h-4 text-zinc-400" />
                        {lead.jobTitle}
                        {lead.jobTitle && lead.company && ' at '}
                        {lead.company}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Phone className="w-4 h-4" />
                        {lead.phone}
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Mail className="w-4 h-4" />
                        {lead.email}
                      </div>
                    )}
                    {(lead.location || lead.address) && (
                      <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <MapPin className="w-4 h-4" />
                        {lead.location || lead.address}
                      </div>
                    )}
                    {lead.website && (
                      <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700">
                        <Globe className="w-4 h-4" />
                        Visit website
                      </a>
                    )}
                    {lead.source && (
                      <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Search className="w-4 h-4" />
                        Source: {lead.source}
                      </div>
                    )}
                  </div>
                  {lead.notes && <div className="bg-zinc-50 p-3 rounded-lg text-xs text-zinc-500 line-clamp-2">{lead.notes}</div>}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={lead.phone ? `tel:${lead.phone}` : '#'}
                      onClick={() => handleCallNow(lead)}
                      className="flex-1 flex items-center justify-center h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-2 text-sm font-medium transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Call Now
                    </a>
                    <CallLoggerDialog
                      lead={lead}
                      trigger={
                        <Button variant="outline" size="sm" className="h-9 gap-2 flex-1">
                          <ClipboardList className="w-4 h-4" /> Log Call
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredLeads.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="bg-zinc-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900">No leads found</h3>
                <p className="text-zinc-500">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deletingLead}
        onClose={() => setDeletingLead(null)}
        onConfirm={handleDeleteLead}
        isLoading={deleteMutation.isPending}
        title="Delete Lead"
        description={`Are you sure you want to delete "${deletingLead?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};
