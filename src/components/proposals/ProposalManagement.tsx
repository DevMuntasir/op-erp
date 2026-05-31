import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteProposal, listProposals } from '@/src/api/endpoints/proposals.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { useAuth } from '@/src/App';
import { Proposal } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Trash2, Edit2, Search, ExternalLink, Download, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/src/lib/utils';
import { ToolbarContent } from '@/src/components/proposals/ProposalToolbar';

export const ProposalManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const isSuperAdmin = user?.role === 'super_admin';
  const basePath = isSuperAdmin || user?.role === 'admin' ? '/admin' : '/employee';

  const proposalsQuery = useQuery({
    queryKey: queryKeys.proposals(),
    queryFn: listProposals,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const proposals = proposalsQuery.data ?? [];
  const loading = proposalsQuery.isLoading;

  const deleteMutation = useMutation({
    mutationFn: deleteProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalSummary });
      toast.success('Proposal deleted');
    },
    onError: (error: Error) => {
      toast.error('Delete failed', { description: error.message });
    },
  });

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;
    deleteMutation.mutate(id);
  };

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
      sent: { label: 'Sent', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
      accepted: { label: 'Accepted', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
    } as const;
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={cn('capitalize border', config.cls)}>{config.label}</Badge>;
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <ToolbarContent>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Proposals</h2>
          <p className="text-zinc-500 text-sm">Create and manage marketing strategy proposals</p>
        </div>
        <Button onClick={() => navigate(`${basePath}/proposals/smart-builder`)} className="bg-zinc-900 text-white hover:bg-zinc-800 h-10 rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          New Proposal
        </Button>
      </ToolbarContent>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search by title or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-zinc-200 focus:ring-brand rounded-lg h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 border-zinc-200 h-10 rounded-lg">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse h-48 border-zinc-200 rounded-2xl" />
          ))
        ) : filteredProposals.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-zinc-200">
            <FileText className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <h3 className="text-lg font-bold text-zinc-900">No proposals found</h3>
            <p className="text-zinc-500 text-sm mb-4">Start building your first proposal</p>
            <Button className="bg-zinc-900 text-white hover:bg-zinc-800 h-9 rounded-lg" onClick={() => navigate(`${basePath}/proposals/smart-builder`)}>
              Create Proposal
            </Button>
          </div>
        ) : (
          filteredProposals.map((proposal) => (
            <Card key={proposal.id} className="group hover:shadow-md hover:border-brand/40 transition-all border-zinc-200 rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pb-3 bg-zinc-50/30 border-b border-zinc-100">
                <div className="flex justify-between items-start gap-2">
                  {getStatusBadge(proposal.status)}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-blue-600" onClick={() => navigate(`${basePath}/proposals/edit/${proposal.id}`)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-600" onClick={() => handleDelete(proposal.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-2 text-base font-bold line-clamp-2 tracking-tight">{proposal.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Client</p>
                    <p className="text-sm font-bold text-zinc-900">{proposal.clientName}</p>
                    {proposal.clientEmail && <p className="text-xs text-zinc-500">{proposal.clientEmail}</p>}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Value</p>
                      <p className="text-lg font-bold text-zinc-900">
                        ${proposal.totalValue?.toLocaleString()}
                        <span className="text-xs font-normal text-zinc-500 ml-1">/mo</span>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`${basePath}/proposals/preview/${proposal.id}`)} className="h-8 text-xs rounded-lg">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
