import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProposalSummary, listProposals } from '@/src/api/endpoints/proposals.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { useAuth } from '@/src/App';
import { Proposal } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Plus, Search, ChevronRight,
  Users, BarChart3, TrendingUp, Calendar,
  ArrowUpRight, Clock, Star, Layout
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { ToolbarContent } from '@/src/components/proposals/ProposalToolbar';

export const ProposalDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'super_admin';
  const basePath = isSuperAdmin || user?.role === 'admin' ? '/admin' : '/employee';

  const summaryQuery = useQuery({
    queryKey: queryKeys.proposalSummary,
    queryFn: getProposalSummary,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const proposalsQuery = useQuery({
    queryKey: queryKeys.proposals(),
    queryFn: listProposals,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const summary = summaryQuery.data;
  const proposals = proposalsQuery.data ?? [];
  const loading = proposalsQuery.isLoading || summaryQuery.isLoading;

  const stats = [
    { label: 'Total Proposals', value: summary?.totalProposals ?? proposals.length, icon: FileText, change: '+12%', color: 'from-brand/10 to-transparent' },
    { label: 'Active Clients', value: summary?.activeClients ?? '—', icon: Users, change: '+5%', color: 'from-blue-500/10 to-transparent' },
    { label: 'Won Value', value: summary ? `$${(summary.wonValue / 1000).toFixed(1)}K` : '—', icon: TrendingUp, change: '+24%', color: 'from-green-500/10 to-transparent' },
    { label: 'Conversion Rate', value: summary ? `${summary.conversionRate.toFixed(0)}%` : '—', icon: BarChart3, change: '+2%', color: 'from-orange-500/10 to-transparent' },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 min-h-screen bg-zinc-50/50">
      <div className="max-w-6xl mx-auto space-y-6 pb-20">

      <ToolbarContent>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
            <span className="text-brand font-black">OP</span> Proposal Dashboard
          </h2>
          <p className="text-zinc-500 text-sm">Create and manage your marketing strategy proposals</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="rounded-lg border-zinc-200 h-10 px-4" onClick={() => navigate(`${basePath}/clients`)}>
              <Users className="w-4 h-4 mr-2" />
              Manage Clients
           </Button>
           <Button
            onClick={() => navigate(`${basePath}/proposals/smart-builder`)}
            className="bg-zinc-900 text-white hover:bg-zinc-800 h-10 px-6 rounded-lg shadow-lg border-none"
           >
            <Plus className="w-4 h-4 mr-2" />
            New Proposal
          </Button>
        </div>
      </ToolbarContent>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-zinc-200 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <CardHeader className="pb-2 relative">
               <CardDescription className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{stat.label}</CardDescription>
               <div className="flex items-end gap-2">
                  <CardTitle className="text-3xl font-bold text-zinc-900 tracking-tighter">{stat.value}</CardTitle>
                  <span className="text-[10px] font-bold text-green-500 mb-1">{stat.change}</span>
               </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Proposals */}
        <div className="lg:col-span-2 space-y-4">
           <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Recent Proposals</h3>
              <Button variant="link" className="text-brand font-bold text-xs h-auto p-0" onClick={() => navigate(`${basePath}/proposals/all`)}>
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
           </div>

           <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              {loading ? (
                <div className="h-64 animate-pulse bg-zinc-50" />
              ) : proposals.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
                  <p className="text-zinc-500 font-medium">No proposals yet</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {proposals.slice(0, 5).map((p, idx) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => navigate(`${basePath}/proposals/edit/${p.id}`)}
                      className="group p-4 cursor-pointer hover:bg-zinc-50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Layout className="w-5 h-5 text-zinc-400 group-hover:text-brand transition-colors shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-zinc-900 truncate text-sm">{p.title}</h4>
                          <p className="text-xs text-zinc-500">{p.clientName} • {format(new Date(p.createdAt ?? Date.now()), 'MMM dd')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-zinc-900">${(p.totalValue ?? 0).toLocaleString()}</p>
                          <Badge className={cn(
                            "text-[8px] h-5 px-2 font-bold uppercase tracking-widest border",
                            p.status === 'draft' ? "bg-zinc-100 text-zinc-600 border-zinc-200" :
                            p.status === 'sent' ? "bg-blue-100 text-blue-700 border-blue-200" :
                            p.status === 'accepted' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"
                          )}>
                            {p.status}
                          </Badge>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-brand transition-colors" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
           </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-4">
           {/* Template Switcher Intro */}
           <Card className="bg-zinc-900 text-white border-none rounded-2xl p-6 shadow-lg relative overflow-hidden group">
              <div className="absolute -top-5 -right-5 w-40 h-40 bg-brand/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative space-y-3">
                 <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-brand" />
                 </div>
                 <h3 className="text-lg font-bold tracking-tight leading-tight">OP Templates</h3>
                 <p className="text-zinc-400 font-medium text-xs leading-relaxed">Minimal, Creative, and Bold styles.</p>
                 <Button variant="outline" className="w-full bg-white/5 border-white/10 rounded-lg font-bold h-9 hover:bg-white/10 text-xs uppercase" disabled>
                   Coming Soon
                 </Button>
              </div>
           </Card>

           {/* Active Clients */}
           <Card className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
              <div className="space-y-3">
                 <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Active Clients</h3>
                 <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-zinc-900">{summary?.activeClients ?? '—'}</span>
                    <span className="text-xs text-zinc-500 font-medium mb-0.5">clients</span>
                 </div>
                 <Button variant="outline" className="w-full text-zinc-900 font-bold text-xs h-9 rounded-lg border-zinc-200" onClick={() => navigate(`${basePath}/clients`)}>
                   Manage Database
                 </Button>
              </div>
           </Card>
        </div>
      </div>
      </div>
    </div>
  );
};
