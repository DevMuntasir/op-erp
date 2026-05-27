import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Phone, Mail, MapPin, Globe, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { CallLoggerDialog } from '@/src/components/calls/CallLogger';
import { logCallAutomatically } from '@/src/lib/calls';
import { Lead } from '@/src/types';
import { createLead, searchLeads } from '@/src/api/endpoints/leads.api';
import type { CreateLeadRequest } from '@/src/api/endpoints/leads.api';
import { queryKeys } from '@/src/shared/constants/query-keys';

type LeadFormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  address: string;
  website: string;
  source: string;
  status: Lead['status'];
  notes: string;
};

const initialFormState = (): LeadFormState => ({
  name: '',
  email: '',
  phone: '',
  company: '',
  jobTitle: '',
  address: '',
  website: '',
  source: '',
  status: 'new',
  notes: '',
});

export const LeadFinder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [leadToAdd, setLeadToAdd] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadFormState>(initialFormState());

  const searchMutation = useMutation({
    mutationFn: (query: string) => searchLeads(query),
    onError: (error: Error) => {
      toast.error('Search failed', { description: error.message });
    },
  });

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Lead added successfully');
      setLeadToAdd(null);
      setForm(initialFormState());
    },
    onError: (error: Error) => {
      toast.error('Failed to add lead', { description: error.message });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();

    if (trimmed.length < 3) {
      toast.error('Search query must be at least 3 characters');
      return;
    }

    searchMutation.mutate(trimmed);
  };

  const results = searchMutation.data ?? [];

  const openAddLeadModal = (lead: Lead) => {
    setLeadToAdd(lead);
    setForm({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      jobTitle: lead.jobTitle || '',
      address: lead.location || lead.address || '',
      website: lead.website || '',
      source: lead.source || 'Direct Search',
      status: (lead.status || 'new') as Lead['status'],
      notes: lead.notes || '',
    });
  };

  const closeAddLeadModal = () => {
    setLeadToAdd(null);
    setForm(initialFormState());
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const payload: CreateLeadRequest = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      company: form.company.trim() || undefined,
      jobTitle: form.jobTitle.trim() || undefined,
      address: form.address.trim() || undefined,
      website: form.website.trim() || undefined,
      source: form.source.trim() || undefined,
      status: form.status || 'new',
      notes: form.notes.trim() || undefined,
    };

    await createMutation.mutateAsync(payload);
  };

  const handleCallNow = (lead: Lead) => {
    if (user) {
      logCallAutomatically(user, lead);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-zinc-50/50 overflow-hidden">
      {/* Search Header */}
      <div className="p-4 bg-white border-b border-zinc-200 shrink-0 shadow-sm z-10">
        <div className="max-w-5xl mx-auto">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search leads (minimum 3 characters)..."
                className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white transition-all shadow-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={searchMutation.isPending || searchQuery.trim().length < 3}
              className="h-11 px-8 bg-zinc-900 hover:bg-zinc-800 text-white font-bold shrink-0 shadow-lg shadow-zinc-200"
            >
              {searchMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1 bg-white flex flex-col min-h-0 overflow-hidden">
        {results.length > 0 && (
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div className="space-y-0.5">
              <h3 className="font-bold text-zinc-900">Results</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                {results.length} lead{results.length !== 1 ? 's' : ''} found
              </p>
            </div>
            {searchQuery && (
              <Badge variant="outline" className="text-xs border-zinc-200 bg-zinc-50 font-medium">
                {searchQuery}
              </Badge>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4 max-w-7xl mx-auto w-full">
            {searchMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <div className="w-10 h-10 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin mb-4" />
                <span className="text-sm font-medium">Searching leads...</span>
              </div>
            ) : searchMutation.isError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-100">
                  <div className="text-2xl">⚠️</div>
                </div>
                <h3 className="font-bold text-zinc-900 mb-2">Search failed</h3>
                <p className="text-sm text-zinc-500 max-w-xs">
                  {(searchMutation.error as Error)?.message || 'An error occurred while searching'}
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((lead) => (
                  <Card
                    key={lead.id || `${lead.name}-${lead.phone}`}
                    className="group border-zinc-100 shadow-none hover:border-zinc-900/10 hover:shadow-lg hover:shadow-zinc-100 transition-all duration-300 overflow-hidden relative"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-1">
                        <h4 className="font-bold text-zinc-900 leading-tight truncate">{lead.name}</h4>
                        {(lead.company || lead.jobTitle) && (
                          <p className="text-xs text-zinc-500">
                            {lead.jobTitle}
                            {lead.jobTitle && lead.company && ' at '}
                            {lead.company}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-zinc-600">
                            <Phone className="w-4 h-4 shrink-0 text-zinc-400" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2 text-zinc-600">
                            <Mail className="w-4 h-4 shrink-0 text-zinc-400" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}
                        {(lead.location || lead.address) && (
                          <div className="flex items-center gap-2 text-zinc-600">
                            <MapPin className="w-4 h-4 shrink-0 text-zinc-400" />
                            <span className="truncate">{lead.location || lead.address}</span>
                          </div>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                          >
                            <Globe className="w-4 h-4 shrink-0" />
                            <span className="truncate">Visit website</span>
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                          onClick={() => openAddLeadModal(lead)}
                          disabled={createMutation.isPending}
                          className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold gap-2 shadow-sm h-10"
                        >
                          <Plus className="w-4 h-4" />
                          Add Lead
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full gap-2 border-emerald-100 text-emerald-700 hover:bg-emerald-50 text-sm font-bold h-10"
                          onClick={() => handleCallNow(lead)}
                          disabled={!lead.phone}
                        >
                          <Phone className="w-4 h-4" />
                          Call Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-zinc-50/50">
                  <User className="w-8 h-8 text-zinc-300" />
                </div>
                <h4 className="font-bold text-zinc-900 mb-2">No results found</h4>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Try a different search term or create a new lead manually.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center px-8">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-zinc-50/50">
                  <Search className="w-8 h-8 text-zinc-300" />
                </div>
                <h4 className="font-bold text-zinc-900 mb-2">Find and add leads</h4>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Search for potential clients to quickly add them to your database.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      <Dialog open={!!leadToAdd} onOpenChange={(open) => !open && closeAddLeadModal()}>
        <DialogContent className="w-full max-w-[500px] max-h-[90vh] min-h-0 overflow-hidden flex flex-col p-0 rounded-2xl border-zinc-200">
          <DialogHeader className="p-6 pb-2 border-b border-zinc-100 bg-zinc-50/50">
            <DialogTitle className="text-xl font-bold">Add Lead from Search</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-4">
            <form onSubmit={handleSubmitLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Phone Number</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Company Name</Label>
                  <Input
                    value={form.company}
                    onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))}
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Job Title</Label>
                  <Input
                    value={form.jobTitle}
                    onChange={(e) => setForm((current) => ({ ...current, jobTitle: e.target.value }))}
                    placeholder="CEO"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                  placeholder="New York, USA"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Email Address</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Website</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm((current) => ({ ...current, website: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</Label>
                  <Select value={form.status} onValueChange={(value: Lead['status']) => setForm((current) => ({ ...current, status: value }))}>
                    <SelectTrigger className="h-10">
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
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Source</Label>
                  <Input
                    value={form.source}
                    onChange={(e) => setForm((current) => ({ ...current, source: e.target.value }))}
                    placeholder="Direct Search"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                  placeholder="Additional details..."
                  className="h-20"
                />
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-zinc-100 bg-white flex gap-3 justify-end shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={closeAddLeadModal}
              className="rounded-xl h-11 px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-lead-form"
              onClick={handleSubmitLead}
              disabled={createMutation.isPending}
              className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-11 px-8"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Lead'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
