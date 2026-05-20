import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/src/App';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User as UserIcon } from 'lucide-react';
import { formatTimeHalifax } from '@/src/lib/presence';
import { toast } from 'sonner';
import { createTaskMessage, listTaskMessages } from '@/src/api/endpoints/tasks.api';
import { Message } from '@/src/shared/types/domain';

type TaskMessage = Message & {
  taskId?: string;
  senderName?: string | null;
};

interface TaskChatProps {
  taskId: string;
  assignedTo: string;
  className?: string;
  hideHeader?: boolean;
}

export const TaskChat: React.FC<TaskChatProps> = ({ taskId, className, hideHeader }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;

    const loadMessages = async (showError = true) => {
      try {
        const nextMessages = await listTaskMessages(taskId);
        if (cancelled) return;
        setMessages(nextMessages);
      } catch (error: any) {
        if (cancelled) return;
        console.error('Task messages fetch failed:', error);
        if (showError) {
          toast.error('Failed to load task discussion', {
            description: error?.message || 'Please try again.',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMessages();
    const intervalId = window.setInterval(() => {
      void loadMessages(false);
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [taskId, user?.uid, user?.email, user?.role]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const createdMessage = await createTaskMessage(taskId, newMessage.trim());
      setMessages((current) => [...current, createdMessage]);
      setNewMessage('');
    } catch (error: any) {
      console.error("Error sending task message:", error);
      toast.error("Failed to send message", {
        description: error?.message || 'Check permissions and try again.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex flex-col border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm ${className || 'h-[400px]'}`}>
      {!hideHeader && (
        <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-zinc-500" />
            Task Discussion
          </h3>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
            {messages.length} Messages
          </span>
        </div>
      )}

      <ScrollArea className="flex-1 h-full bg-white">
        <div className="p-4 space-y-4">
          {loading && (
            <div className="text-xs text-zinc-400">Loading discussion...</div>
          )}
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {!isMe && <span className="text-[10px] font-bold text-zinc-500">{msg.senderName || 'User'}</span>}
                  <span className="text-[10px] text-zinc-400">
                    {formatTimeHalifax(msg.createdAt || msg.timestamp)}
                  </span>
                </div>
                <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                  isMe 
                    ? 'bg-zinc-900 text-white rounded-tr-none' 
                    : 'bg-zinc-100 text-zinc-900 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
              <UserIcon className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs">No messages yet. Start the discussion!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-100 bg-white shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e as any);
              }
            }}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-[120px] py-2 text-sm resize-none"
            disabled={sending}
          />
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0 bg-zinc-900" disabled={sending || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};
