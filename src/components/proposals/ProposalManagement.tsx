import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, orderBy, deleteDoc, doc, limit } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/App';
import { Proposal } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2, Edit2, Search, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';

export const ProposalManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isSuperAdmin = user?.role === 'super_admin';
  const basePath = isSuperAdmin || user?.role === 'admin' ? '/admin' : '/employee';

  useEffect(() => {
    if (!user) return;

    let q;
    if (isSuperAdmin) {
      q = query(collection(db, 'proposals'), orderBy('createdAt', 'desc'), limit(100));
    } else if (user.role === 'admin') {
      q = query(collection(db, 'proposals'), where('adminId', '==', user.uid), orderBy('createdAt', 'desc'), limit(100));
    } else {
      q = query(collection(db, 'proposals'), where('createdBy', '==', user.uid), orderBy('createdAt', 'desc'), limit(100));
    }

    const unsub = onSnapshot(q, (snap) => {
      setProposals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal)));
      setLoading(false);
    }, (err) => {
      console.error("Firestore Proposals Error:", err);
      toast.error("Failed to load proposals");
      setLoading(false);
    });

    return () => unsub();
  }, [user, isSuperAdmin]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this proposal?")) return;
    try {
      await deleteDoc(doc(db, 'proposals', id));
      toast.success("Proposal deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const filteredProposals = proposals.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary" className="capitalize">{status}</Badge>;
      case 'sent': return <Badge variant="default" className="bg-blue-100 text-blue-700 capitalize">{status}</Badge>;
      case 'accepted': return <Badge variant="default" className="bg-green-100 text-green-700 capitalize">{status}</Badge>;
      case 'rejected': return <Badge variant="destructive" className="capitalize">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Marketing Proposals</h2>
          <p className="text-zinc-500">Create and manage your digital marketing strategy proposals</p>
        </div>
        <Button onClick={() => navigate(`${basePath}/proposals/new`)} className="bg-zinc-900 text-white hover:bg-zinc-800">
          <Plus className="w-4 h-4 mr-2" />
          Build New Proposal
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Search proposals by title or client..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-zinc-200 focus:ring-zinc-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse h-48 border-zinc-200" />
          ))
        ) : filteredProposals.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-zinc-200">
            <FileText className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900">No proposals found</h3>
            <p className="text-zinc-500 mb-6">Start building your first digital marketing proposal today</p>
            <Button variant="outline" onClick={() => navigate(`${basePath}/proposals/new`)}>
              Build New Proposal
            </Button>
          </div>
        ) : (
          filteredProposals.map((proposal) => (
            <Card key={proposal.id} className="group hover:shadow-md transition-shadow border-zinc-200 overflow-hidden">
              <CardHeader className="pb-3 bg-zinc-50/50 border-bottom border-zinc-100">
                <div className="flex justify-between items-start">
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
                <CardTitle className="mt-2 text-lg font-bold line-clamp-1">{proposal.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 h-full">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Client</p>
                    <p className="text-sm font-medium text-zinc-900">{proposal.clientName}</p>
                    {proposal.clientEmail && <p className="text-xs text-zinc-500">{proposal.clientEmail}</p>}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <div>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Value</p>
                      <p className="text-lg font-bold text-zinc-900">
                        ${proposal.totalValue?.toLocaleString()}
                        <span className="text-xs font-normal text-zinc-400 ml-1">/mo</span>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`${basePath}/proposals/preview/${proposal.id}`)}>
                      <ExternalLink className="w-4 h-4 mr-2" />
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
