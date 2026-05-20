import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Call } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Clock, FileText, Save } from 'lucide-react';
import { toast } from 'sonner';

interface CallEditDialogProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CallEditDialog: React.FC<CallEditDialogProps> = ({ call, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Call['status']>('completed');
  const [type, setType] = useState<Call['type']>('outgoing');
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (call) {
      setStatus(call.status);
      setType(call.type);
      setDuration(call.duration || 0);
      setNotes(call.notes || '');
    }
  }, [call, isOpen]);

  const handleUpdate = async () => {
    if (!call) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'calls', call.id), {
        status,
        type,
        duration: Number(duration),
        notes,
        updatedAt: new Date().toISOString()
      });
      toast.success("Call record updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating call:", error);
      toast.error("Failed to update call record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-zinc-900" />
            Edit Call Record
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
              onChange={(e) => setDuration(Number(e.target.value))}
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
              placeholder="Enter call notes..."
              className="h-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={loading} className="bg-zinc-900 hover:bg-zinc-800 text-white">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Update Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
