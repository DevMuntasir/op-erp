import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/App';
import { Proposal, Client } from '@/src/types';
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

export const ProposalDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === 'super_admin';
  const basePath = isSuperAdmin || user?.role === 'admin' ? '/admin' : '/employee';

  useEffect(() => {
    if (!user) return;

    const adminId = user.role === 'admin' ? user.uid : (user.adminId || user.uid);
    
    // Fetch Proposals
    const pQuery = query(
      collection(db, 'proposals'), 
      where('adminId', '==', adminId), 
      orderBy('createdAt', 'desc'), 
      limit(5)
    );
    
    const unsubP = onSnapshot(pQuery, (snap) => {
      setProposals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal)));
    }, (error) => {
      console.error("ProposalDashboard Proposals Error:", error);
    });

    // Fetch Clients Count
    const cQuery = query(collection(db, 'clients'), where('adminId', '==', adminId));
    const unsubC = onSnapshot(cQuery, (snap) => {
      setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
      setLoading(false);
    }, (error) => {
      console.error("ProposalDashboard Clients Error:", error);
      setLoading(false);
    });

    return () => {
      unsubP();
      unsubC();
    };
  }, [user]);

  const stats = [
    { label: 'Total Proposals', value: proposals.length, icon: FileText, change: '+12%', color: 'from-brand/10 to-transparent' },
    { label: 'Active Clients', value: clients.length, icon: Users, change: '+5%', color: 'from-blue-500/10 to-transparent' },
    { label: 'Won Value', value: `$${(proposals.filter(p => p.status === 'accepted').reduce((sum, p) => sum + (p.totalValue || 0), 0) / 1000).toFixed(1)}K`, icon: TrendingUp, change: '+24%', color: 'from-green-500/10 to-transparent' },
    { label: 'Conversion Rate', value: '68%', icon: BarChart3, change: '+2%', color: 'from-orange-500/10 to-transparent' },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-10 min-h-screen bg-zinc-50/50">
      <div className="max-w-6xl mx-auto space-y-10 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-zinc-900 tracking-tighter">
            <span className="text-brand italic underline decoration-4 underline-offset-8">OP</span> Proposal OS
          </h1>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em]">Premium Marketing Strategy Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="rounded-xl border-zinc-200 h-12 px-6" onClick={() => navigate(`${basePath}/clients`)}>
              <Users className="w-4 h-4 mr-2" />
              Manage Clients
           </Button>
           <Button 
            onClick={() => navigate(`${basePath}/proposals/smart-builder`)} 
            className="bg-zinc-900 text-white hover:bg-zinc-800 h-12 px-8 rounded-xl shadow-xl border-none"
           >
            <Plus className="w-4 h-4 mr-2" />
            Create New Proposal
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-zinc-100 bg-white shadow-xl shadow-zinc-200/40 rounded-[32px] overflow-hidden group hover:scale-105 transition-transform duration-300">
            <CardContent className="p-6 relative">
               <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-50`} />
               <div className="relative space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shadow-sm">
                    <stat.icon className="w-5 h-5 text-zinc-900" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{stat.label}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-zinc-900 tracking-tighter">{stat.value}</span>
                      <span className="text-[10px] font-bold text-green-500 mb-1.5">{stat.change}</span>
                    </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Proposals */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 italic tracking-tight">Recent Strategy Drafts</h2>
              <Button variant="link" className="text-brand font-bold uppercase text-[10px] tracking-widest" onClick={() => navigate(`${basePath}/proposals/all`)}>
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
           </div>
           
           <div className="space-y-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse" />)
              ) : proposals.length === 0 ? (
                <Card className="border-zinc-200 border-dashed border-2 rounded-3xl p-12 text-center bg-transparent">
                  <FileText className="w-10 h-10 mx-auto text-zinc-300 mb-4" />
                  <p className="text-zinc-500 font-bold italic">No proposals built yet.</p>
                </Card>
              ) : (
                proposals.map(p => (
                  <motion.div 
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate(`${basePath}/proposals/edit/${p.id}`)}
                    className="group bg-white p-6 rounded-[32px] border border-zinc-100 shadow-lg shadow-zinc-200/30 flex items-center justify-between cursor-pointer hover:border-brand/30 transition-all hover:scale-[1.01]"
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                           <Layout className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="font-black text-zinc-900 tracking-tight">{p.title}</h3>
                           <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                              <span>{p.clientName}</span>
                              <span>•</span>
                              <span>{format(p.createdAt?.toDate() || new Date(), 'MMM dd, yyyy')}</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-6">
                        <div className="text-right">
                           <p className="text-sm font-black text-zinc-900">${p.totalValue?.toLocaleString()}</p>
                           <Badge variant="outline" className={cn(
                             "text-[8px] h-4 mt-1 px-2 border-none font-black uppercase tracking-widest",
                             p.status === 'draft' ? "bg-zinc-100 text-zinc-500" : 
                             p.status === 'sent' ? "bg-blue-50 text-blue-500" :
                             p.status === 'accepted' ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
                           )}>
                             {p.status}
                           </Badge>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-zinc-200 group-hover:text-brand transition-colors" />
                     </div>
                  </motion.div>
                ))
              )}
           </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-8">
           {/* Template Switcher Intro */}
           <Card className="bg-zinc-900 text-white border-none rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-brand/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative space-y-4">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Star className="w-6 h-6 text-brand" />
                 </div>
                 <h3 className="text-2xl font-black tracking-tighter italic leading-tight">OP Media Agency<br/>Templates</h3>
                 <p className="text-zinc-400 font-bold text-sm leading-relaxed">Switch between Minimal, Creative, and Bold styles in one click.</p>
                 <Button variant="outline" className="w-full bg-white/5 border-white/10 rounded-xl font-bold h-10 hover:bg-white/10 text-xs tracking-widest uppercase" disabled>
                   PRO TEMPLATES COMING SOON
                 </Button>
              </div>
           </Card>

           {/* Recent Clients */}
           <div className="space-y-4">
              <h2 className="text-xl font-bold text-zinc-900 italic tracking-tight">Recent Targets</h2>
              <div className="space-y-3">
                 {clients.slice(0, 3).map(c => (
                   <div key={c.id} className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-md flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand/5 flex items-center justify-center text-brand font-black text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                         <p className="text-xs font-black text-zinc-900 leading-tight">{c.name}</p>
                         <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{c.company || 'Private Entity'}</p>
                      </div>
                      <Badge variant="outline" className="text-[8px] h-4 border-zinc-100 text-zinc-400 uppercase tracking-widest leading-none">
                        {c.status}
                      </Badge>
                   </div>
                 ))}
                 <Button variant="ghost" className="w-full text-zinc-400 font-black italic text-xs h-10" onClick={() => navigate(`${basePath}/clients`)}>
                   Manage Client Database
                 </Button>
              </div>
           </div>
        </div>
      </div>
      </div>
    </div>
  );
};
