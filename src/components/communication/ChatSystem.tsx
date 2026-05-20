import React, { useEffect, useState, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, where, limit, updateDoc, doc, writeBatch, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { isUserOnline, formatTimeHalifax, formatLastSeenHalifax } from '@/src/lib/presence';
import { Message, User } from '@/src/types';
import { logCallAutomatically } from '@/src/lib/calls';
import { useAuth } from '@/src/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Paperclip, ChevronLeft, MessageSquare, Check, CheckCheck, Phone } from 'lucide-react';
import { toast } from 'sonner';

export const ChatSystem = () => {
  const { user } = useAuth();
  const [chatPartners, setChatPartners] = useState<User[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.role) {
      console.log("ChatSystem: No user role yet, waiting...");
      return;
    }
    
    console.log("ChatSystem: Current user role:", user.role);
    
    let q;
    if (user.role === 'super_admin') {
      q = query(collection(db, 'profiles'), where('role', 'in', ['admin', 'employee']));
    } else if (user.role === 'admin') {
      q = query(collection(db, 'profiles'), where('adminId', '==', user.uid), where('role', '==', 'employee'));
    } else if (user.adminId) {
      // Employees see their admin and potentially colleagues
      q = query(collection(db, 'profiles'), where('adminId', '==', user.adminId));
    } else {
      console.log("ChatSystem: Employee has no adminId yet, skipping query");
      setLoading(false);
      return;
    }
    
    console.log(`ChatSystem: Querying profiles for role-based access`);
    
    return onSnapshot(q, (snap) => {
      console.log(`ChatSystem: Found ${snap.docs.length} users`);
      const partners = snap.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as User));
      console.log("ChatSystem: Partners found:", partners.map(p => p.email));
      setChatPartners(partners);
      setLoading(false);
    }, (error) => {
      console.error("ChatSystem: Profiles snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'profiles');
      toast.error("Failed to load chat partners");
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!selectedPartner || !user) {
      setMessages([]);
      return;
    }

    const partnerId = selectedPartner.uid;
    const partnerEmail = selectedPartner.email;
    if (!partnerId && !partnerEmail) {
      console.error("ChatSystem: Selected partner has no UID or Email", selectedPartner);
      return;
    }

    setMessagesLoading(true);
    
    // Get primary IDs for the partner
    const partnerIds = [partnerId, partnerEmail, partnerEmail?.toLowerCase()].filter(Boolean) as string[];
    const uniquePartnerIds = Array.from(new Set(partnerIds));

    console.log("ChatSystem: Querying messages where participants contains UID:", user.uid);
    
    // Query messages where the current user is a participant by their unique UID
    // This is the most reliable way and matches the simplified security rules
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      console.log(`ChatSystem: Received ${snap.docs.length} candidate messages`);
      
      // Filter messages to only those involving the selected partner
      const filteredMsgs = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Message))
        .filter(msg => {
          const participants = msg.participants || [];
          // Check if any of the partner's possible IDs are in the participants list
          return uniquePartnerIds.some(pId => participants.includes(pId));
        });

      console.log(`ChatSystem: ${filteredMsgs.length} messages after filtering for partner`);

      // Sort in-memory to avoid index requirement
      const sortedMsgs = filteredMsgs.sort((a, b) => {
        const getTime = (ts: any) => {
          if (!ts) return Date.now() + 10000;
          if (typeof ts.toMillis === 'function') return ts.toMillis();
          if (ts.seconds) return ts.seconds * 1000;
          return 0;
        };
        return getTime(a.timestamp) - getTime(b.timestamp);
      });
      
      setMessages(sortedMsgs);
      setMessagesLoading(false);

      // Mark unread messages from partner as seen
      const unreadFromPartner = snap.docs.filter(d => {
        const data = d.data();
        const isFromPartner = data.senderId === partnerId || data.senderId === partnerEmail;
        return isFromPartner && data.status !== 'seen';
      });

      if (unreadFromPartner.length > 0) {
        const batch = writeBatch(db);
        unreadFromPartner.forEach(d => {
          batch.update(d.ref, { 
            status: 'seen',
            seenAt: serverTimestamp()
          });
        });
        batch.commit().catch(err => console.error("Batch update error:", err));
      }
    }, (error) => {
      console.error("ChatSystem: Messages snapshot error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to load messages: ${errorMsg.slice(0, 50)}...`);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [selectedPartner, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPartner || !user) return;

    const partnerId = selectedPartner.uid;
    const partnerEmail = selectedPartner.email;
    
    // Use UID if available, otherwise fallback to email-based ID
    const myId = user.uid;
    const pId = partnerId || partnerEmail.replace(/\./g, '_');
    const chatId = [myId, pId].sort().join('_');
    
    const msg = newMessage;
    setNewMessage('');

    const participants = [user.uid];
    if (user.email) {
      participants.push(user.email);
      participants.push(user.email.toLowerCase());
      participants.push(user.email.replace(/\./g, '_'));
      participants.push(user.email.toLowerCase().replace(/\./g, '_'));
    }
    if (partnerId) participants.push(partnerId);
    if (partnerEmail) {
      participants.push(partnerEmail);
      participants.push(partnerEmail.toLowerCase());
      participants.push(partnerEmail.replace(/\./g, '_'));
      participants.push(partnerEmail.toLowerCase().replace(/\./g, '_'));
    }

    const msgAdminId = user.role === 'admin' ? user.uid : (user.adminId || selectedPartner.adminId || user.uid);

    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        participants,
        senderId: user.uid,
        text: msg,
        timestamp: serverTimestamp(),
        status: 'sent',
        adminId: msgAdminId
      });

      // Add notification for recipient
      await addDoc(collection(db, 'notifications'), {
        userId: partnerId || partnerEmail.replace(/\./g, '_'),
        title: 'New Message',
        message: `${user.name} sent you a message`,
        type: 'message',
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
      toast.error("Failed to send message");
    }
  };

  if (!user) return null;

  const handleCall = async () => {
    if (!selectedPartner) return;

    let phone = selectedPartner.phoneNumber;

    // If phone number is missing in profile, try fetching from main user document
    if (!phone) {
      try {
        const userDoc = await getDoc(doc(db, 'users', selectedPartner.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          phone = userData.phoneNumber;
        }
      } catch (error) {
        console.error("Error fetching user phone number:", error);
      }
    }

    if (!phone) {
      toast.error("This user hasn't provided a phone number yet.");
      return;
    }
    
    logCallAutomatically(user, { id: selectedPartner.uid, name: selectedPartner.name, phone });
    window.location.href = `tel:${phone}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 lg:p-8">
      <div className="flex flex-1 min-h-0 gap-6 relative">
        {/* Partner List */}
      <Card className={`w-full lg:w-80 flex flex-col border-zinc-200 overflow-hidden ${
        !showListOnMobile ? 'hidden lg:flex' : 'flex'
      }`}>
        <div className="p-4 font-bold border-b border-zinc-100">Conversations</div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col">
            {chatPartners.map((partner) => (
              <button
                key={partner.uid || partner.email}
                onClick={() => {
                  setSelectedPartner(partner);
                  setShowListOnMobile(false);
                }}
                className={`w-full flex items-center gap-3 p-4 hover:bg-zinc-50 transition-colors border-b border-zinc-50 ${
                  selectedPartner?.uid === partner.uid ? 'bg-zinc-100' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={partner.photoURL} />
                    <AvatarFallback>{partner.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    isUserOnline(partner) ? 'bg-emerald-500' : 'bg-zinc-300'
                  }`} />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-900 truncate">{partner.name}</div>
                  <div className="text-xs text-zinc-500 capitalize truncate">
                    {isUserOnline(partner) ? (
                      <span className="text-emerald-600 font-medium">Online</span>
                    ) : (
                      <span>Last seen: {formatLastSeenHalifax(partner.lastSeen)}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {chatPartners.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">No {user?.role === 'admin' ? 'employees' : 'admins'} found.</div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className={`flex-1 flex flex-col min-h-0 border-zinc-200 overflow-hidden ${
        showListOnMobile ? 'hidden lg:flex' : 'flex'
      }`}>
        {selectedPartner ? (
          <>
            <div className="p-4 border-b border-zinc-100 flex items-center gap-3 bg-white shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden -ml-2"
                onClick={() => setShowListOnMobile(true)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Avatar className="w-8 h-8">
                <AvatarImage src={selectedPartner.photoURL} />
                <AvatarFallback>{selectedPartner.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{selectedPartner.name}</div>
                <div className="text-[10px] text-zinc-500 font-medium">
                  Direct Messaging Active
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 text-emerald-600 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-200"
                  onClick={handleCall}
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Call Now</span>
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 h-full bg-white">
              <div className="p-4 lg:p-6 space-y-4">
                {messagesLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mb-2"></div>
                    <p className="text-sm text-zinc-500">Loading messages...</p>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] lg:max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          isMe ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900 border border-zinc-100'
                        }`}>
                          {msg.text}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? '' : 'flex-row-reverse'}`}>
                          <span className="text-[10px] text-zinc-400">
                            {formatTimeHalifax(msg.timestamp)}
                          </span>
                          {isMe && (
                            msg.status === 'seen' ? (
                              <CheckCheck className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Check className="w-3 h-3 text-zinc-300" />
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">No messages yet. Say hello!</p>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-100 flex items-end gap-2">
              <Button type="button" variant="ghost" size="icon" className="text-zinc-400 hidden sm:inline-flex h-10 w-10">
                <Paperclip className="w-5 h-5" />
              </Button>
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
                className="flex-1 min-h-[40px] max-h-[120px] py-2 resize-none"
              />
              <Button type="submit" size="icon" className="bg-zinc-900 shrink-0 h-10 w-10">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a {user?.role === 'admin' ? 'employee' : 'admin'} to start chatting</p>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
};
