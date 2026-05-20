import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/App';
import { Call } from '@/src/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, User, Trash2, Search, Filter, Calendar, Building2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/src/components/shared/dialogs/ConfirmDialog';
import { CallEditDialog } from '@/src/components/calls/CallEditDialog';

export const CallHistory = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deletingCallId, setDeletingCallId] = useState<string | null>(null);
  const [editingCall, setEditingCall] = useState<Call | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  const canEdit = (call: Call) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (user.role === 'admin' && call.adminId === user.uid) return true;
    if (call.employeeId === user.uid) return true;
    return false;
  };

  const canDelete = (call: Call) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (user.role === 'admin' && call.adminId === user.uid) return true;
    return false;
  };

  useEffect(() => {
    if (!user) return;

    let qCalls;
    const adminId = user.role === 'admin' ? user.uid : (user.adminId || user.uid);

    if (user.role === 'super_admin') {
      qCalls = query(collection(db, 'calls'), limit(500));
    } else if (user.role === 'admin') {
      qCalls = query(collection(db, 'calls'), where('adminId', '==', user.uid), limit(500));
    } else {
      qCalls = query(collection(db, 'calls'), where('employeeId', '==', user.uid), limit(500));
    }

    const unsub = onSnapshot(qCalls, (snap) => {
      const fetchedCalls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Call));
      
      // Multi-format date helper
      const getTime = (ts: any) => {
        if (!ts) return 0;
        if (typeof ts === 'object' && ts.toMillis) return ts.toMillis();
        if (typeof ts === 'object' && ts.seconds) return ts.seconds * 1000;
        try {
          return new Date(ts).getTime() || 0;
        } catch (e) {
          return 0;
        }
      };

      // Sort in memory to avoid missing index errors
      const sortedCalls = fetchedCalls.sort((a, b) => {
        return getTime(b.timestamp) - getTime(a.timestamp);
      });
      setCalls(sortedCalls);
      setLoading(false);
    }, (error) => {
      console.error("Call History Error:", error);
      toast.error("Failed to load call history");
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleDeleteCall = async () => {
    if (!deletingCallId) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'calls', deletingCallId));
      toast.success("Call record deleted");
    } catch (error) {
      console.error("Deletion error:", error);
      toast.error("Failed to delete record");
    } finally {
      setIsDeleting(false);
      setDeletingCallId(null);
    }
  };

  const filteredCalls = calls.filter(call => {
    const matchesSearch = 
      (call.phoneNumber || '').includes(searchTerm) ||
      (call.leadName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (call.employeeName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (call.notes?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || 
      (filterType === 'incoming' && call.type === 'incoming') ||
      (filterType === 'outgoing' && call.type === 'outgoing') ||
      (filterType === 'missed' && call.status === 'missed');

    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: Call['status']) => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completed</Badge>;
      case 'missed': return <Badge className="bg-rose-100 text-rose-700 border-rose-200">Missed</Badge>;
      case 'rejected': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Rejected</Badge>;
      case 'failed': return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200">Failed</Badge>;
      default: return null;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const renderDateTime = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      let date: Date;
      if (typeof timestamp === 'object' && timestamp.toDate) {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      return format(date, 'MMM d, HH:mm');
    } catch (error) {
      console.error("Date formatting error:", error);
      return 'Invalid Date';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Call History</h2>
            <p className="text-zinc-500">View and track all communication logs.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Search by phone, lead name, or notes..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
              className="text-xs"
            >
              All
            </Button>
            <Button 
              variant={filterType === 'outgoing' ? 'default' : 'outline'}
              onClick={() => setFilterType('outgoing')}
              className="text-xs gap-1"
            >
              <PhoneOutgoing className="w-3 h-3" /> Outgoing
            </Button>
            <Button 
              variant={filterType === 'incoming' ? 'default' : 'outline'}
              onClick={() => setFilterType('incoming')}
              className="text-xs gap-1"
            >
              <PhoneIncoming className="w-3 h-3" /> Incoming
            </Button>
            <Button 
              variant={filterType === 'missed' ? 'default' : 'outline'}
              onClick={() => setFilterType('missed')}
              className="text-xs gap-1"
            >
              <PhoneMissed className="w-3 h-3" /> Missed
            </Button>
          </div>
        </div>

        <Card className="border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Lead/Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Duration</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Notes</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredCalls.map((call) => (
                      <tr key={call.id} className="group hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-zinc-200">
                              <AvatarFallback className="bg-zinc-100 text-zinc-500 text-[10px]">
                                {call.employeeName?.[0] || 'E'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-900 truncate">
                                {call.employeeName || 'Staff Member'}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-tighter">
                                ID: {call.employeeId?.substring(0, 6) || '...'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-zinc-900 truncate">
                                {call.leadName || call.phoneNumber || 'Unknown Prospect'}
                              </p>
                              {call.leadName && (
                                <p className="text-xs text-zinc-500 flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {call.phoneNumber}
                                </p>
                              )}
                              {!call.leadName && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-zinc-50 text-zinc-400 border-zinc-200">
                                  UNSAVED LEAD
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {call.type === 'incoming' ? (
                          <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600">
                            <PhoneIncoming className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600">
                            <PhoneOutgoing className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="text-xs font-medium capitalize text-zinc-600">{call.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(call.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        {formatDuration(call.duration)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {call.notes ? (
                        <div className="max-w-[200px] text-xs text-zinc-500 italic truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:bg-white group-hover:p-2 group-hover:rounded group-hover:border group-hover:shadow-sm transition-all">
                          "{call.notes}"
                        </div>
                      ) : (
                        <span className="text-zinc-300 text-[10px]">No notes</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="whitespace-nowrap">{renderDateTime(call.timestamp)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit(call) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
                            onClick={() => setEditingCall(call)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete(call) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-rose-600"
                            onClick={() => setDeletingCallId(call.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCalls.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-zinc-500 italic">
                      No call records found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ConfirmDialog 
        isOpen={!!deletingCallId}
        onClose={() => setDeletingCallId(null)}
        onConfirm={handleDeleteCall}
        isLoading={isDeleting}
        title="Delete Call Log"
        description="Are you sure you want to permanently delete this communication record? This action cannot be undone."
      />

      <CallEditDialog 
        call={editingCall}
        isOpen={!!editingCall}
        onClose={() => setEditingCall(null)}
      />
    </div>
  );
};
