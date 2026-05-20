import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/App';
import { Lead } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface CallLoggerDialogProps {
  lead?: Lead;
  onLogged?: () => void;
  trigger?: React.ReactElement;
}

export const CallLoggerDialog: React.FC<CallLoggerDialogProps> = ({ lead, onLogged, trigger }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [phoneNumber, setPhoneNumber] = useState(lead?.phone || '');
  const [status, setStatus] = useState<'completed' | 'missed' | 'rejected' | 'failed'>('completed');
  const [type, setType] = useState<'incoming' | 'outgoing'>('outgoing');
  const [duration, setDuration] = useState('0');
  const [notes, setNotes] = useState('');

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!phoneNumber) {
      toast.error("Phone number is required");
      return;
    }

    setLoading(true);
    try {
      const adminId = user.role === 'admin' ? user.uid : (user.adminId || user.uid);
      
      await addDoc(collection(db, 'calls'), {
        employeeId: user.uid,
        employeeName: user.name || user.email,
        adminId: adminId,
        leadId: lead?.id || null,
        leadName: lead?.name || null,
        phoneNumber,
        type,
        status,
        duration: parseInt(duration) || 0,
        notes,
        timestamp: new Date().toISOString(),
      });

      toast.success("Call logged successfully");
      setOpen(false);
      resetForm();
      onLogged?.();
    } catch (error) {
      console.error("Error logging call:", error);
      toast.error("Failed to log call");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPhoneNumber(lead?.phone || '');
    setStatus('completed');
    setType('outgoing');
    setDuration('0');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger render={
        trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Phone className="w-4 h-4" /> Log Call
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-600" />
            Log {lead ? `Call with ${lead.name}` : 'Call Record'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleLogCall} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)} 
              placeholder="+1 (555) 000-0000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                  <SelectItem value="incoming">Incoming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> Duration (seconds)
            </Label>
            <Input 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)}
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Notes
            </Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Briefly describe the call outcome..."
              className="h-24"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
            disabled={loading}
          >
            {loading ? 'Logging...' : 'Save Call Record'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
