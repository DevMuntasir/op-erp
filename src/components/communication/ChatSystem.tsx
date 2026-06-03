import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/src/App';
import { useWebSocket } from '@/src/hooks/useWebSocket';
import {
  getContacts,
  getConversations,
  createConversation,
  getMessages,
  markConversationRead,
  sendTextMessage,
  deleteMessage
} from '@/src/api/endpoints/chat.api';
import { Contact, Conversation, Message } from '@/src/shared/types/domain';
import { logCallAutomatically } from '@/src/lib/calls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Paperclip, ChevronLeft, MessageSquare, Check, CheckCheck, Phone, Trash2, Search, Edit as EditIcon } from 'lucide-react';
import { toast } from 'sonner';

// Messenger-style compact relative time (e.g. "now", "5m", "3h", "2d", "Jun 1")
const formatRelativeTime = (dateInput?: string | null): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return '';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatSystem = () => {
  const { user } = useAuth();
  const [contactsResponse, setContactsResponse] = useState<{ contacts: Contact[]; groups: Record<string, Contact[]> } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, 'online' | 'offline'>>({});
  const [sending, setSending] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'contacts' | 'conversations'>('conversations');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeConversationRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state on every render (synchronous, before effects)
  activeConversationRef.current = activeConversation;

  const { sendTyping } = useWebSocket({
    onMessageNew: (event) => {
      try {
        // Normalise: backend may send message fields inline or nested under event.message
        const raw = event.message || event;
        const newMsg: Message = {
          id: raw.id,
          conversationId: raw.conversationId,
          senderId: raw.senderId,
          content: raw.content,
          fileUrl: raw.fileUrl || null,
          deletedAt: raw.isDeleted ? raw.createdAt : null,
          createdAt: raw.createdAt,
          readBy: raw.readBy || [],
        };

        // Use ref to avoid stale closure
        const current = activeConversationRef.current;
        if (current && newMsg.conversationId === current.id) {
          console.log('[Chat] New message in active thread:', newMsg);
          setMessages(prev => [...prev, newMsg]);
        } else if (newMsg.conversationId) {
          console.log('[Chat] New message in background conversation:', newMsg.conversationId);
          setConversations(prev =>
            prev.map(conv =>
              conv.id === newMsg.conversationId
                ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1, lastMessage: newMsg, lastMessageAt: newMsg.createdAt }
                : conv
            )
          );
        }
      } catch (err) {
        console.error('[Chat] Error handling onMessageNew:', err);
      }
    },
    onMessageRead: (event) => {
      try {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === event.messageId
              ? { ...msg, readBy: event.readBy }
              : msg
          )
        );
      } catch (err) {
        console.error('[Chat] Error handling onMessageRead:', err);
      }
    },
    onPresenceChange: (event) => {
      try {
        setPresenceMap(prev => ({
          ...prev,
          [event.userId]: event.type === 'presence:online' ? 'online' : 'offline'
        }));
      } catch (err) {
        console.error('[Chat] Error handling onPresenceChange:', err);
      }
    },
    onTyping: (event) => {
      try {
        // Use ref to avoid stale closure
        const current = activeConversationRef.current;
        if (current && event.conversationId === current.id) {
          setIsTyping(event.type === 'typing:start');
        }
      } catch (err) {
        console.error('[Chat] Error handling onTyping:', err);
      }
    },
    onError: (error) => {
      console.log('[Chat] WebSocket unavailable - using REST API only:', error.message);
    },
    onConnect: () => {
      console.log('[Chat] WebSocket connected');
    },
    onDisconnect: () => {
      console.log('[Chat] WebSocket disconnected');
    }
  });

  const loadContacts = useCallback(async () => {
    try {
      const data = await getContacts();
      console.log('[Chat] Loaded contacts:', data);
      setContactsResponse(data);
    } catch (error) {
      console.error('[Chat] Failed to load contacts:', error);
      setContactsResponse(null);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      console.log('[Chat] Loaded conversations (raw):', data);
      console.log('[Chat] Is array?', Array.isArray(data));
      console.log('[Chat] Length:', Array.isArray(data) ? data.length : 'N/A');

      if (Array.isArray(data)) {
        console.log('[Chat] First conversation:', data[0]);
        setConversations(data);
      } else {
        console.warn('[Chat] Conversations response is not an array:', data);
        setConversations([]);
      }
    } catch (error) {
      console.error('[Chat] Failed to load conversations:', error);
      setConversations([]);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string, cursor?: string) => {
    try {
      setMessagesLoading(true);
      const data = await getMessages(conversationId, 50, cursor);
      // Messenger-style order: oldest at top, newest at bottom.
      // The API returns newest-first, so always sort ascending by createdAt.
      const sortAsc = (arr: Message[]) =>
        [...arr].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(prev => sortAsc(cursor ? [...data, ...prev] : data));
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
    loadConversations();
    setLoading(false);

    // Fallback polling for conversations if WebSocket is unavailable
    // Disable polling since WebSocket is now connected
    // const pollInterval = setInterval(() => {
    //   loadConversations();
    // }, 30000);

    // return () => clearInterval(pollInterval);
    return () => {};
  }, [loadContacts, loadConversations]);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    loadMessages(activeConversation.id);
    markConversationRead(activeConversation.id).catch(err =>
      console.error('Failed to mark conversation read:', err)
    );

    // Fallback polling for messages if WebSocket is unavailable
    // Disable polling since WebSocket is now connected
    // const pollInterval = setInterval(() => {
    //   loadMessages(activeConversation.id);
    // }, 5000);

    // return () => clearInterval(pollInterval);
    return () => {};
  }, [activeConversation, loadMessages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        const scrollArea = scrollRef.current?.parentElement;
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
      }, 0);
    }
  }, [messages]);

  const handleSelectContact = useCallback(async (contact: Contact) => {
    try {
      const conversation = await createConversation(contact.uid);
      setActiveConversation(conversation);
      setShowListOnMobile(false);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to open conversation');
    }
  }, []);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setActiveConversation(conversation);
    setShowListOnMobile(false);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    try {
      setSending(true);
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: activeConversation.id,
        senderId: user!.uid,
        content: newMessage,
        createdAt: new Date().toISOString(),
        fileUrl: null,
        deletedAt: null,
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      const sentMessage = await sendTextMessage(activeConversation.id, newMessage);
      setMessages(prev =>
        prev.map(msg => (msg.id === optimisticMessage.id ? sentMessage : msg))
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (activeConversation && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping && activeConversation) {
      sendTyping(activeConversation.id, true);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(activeConversation.id, false);
      }, 3000);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeConversation) return;

    try {
      await deleteMessage(activeConversation.id, messageId);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, deletedAt: new Date().toISOString(), content: '' }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleCall = async () => {
    if (!activeConversation?.participant || !user) return;

    const phone = activeConversation.participant.phone;
    if (!phone) {
      toast.error("This user hasn't provided a phone number yet.");
      return;
    }

    logCallAutomatically(user as any, {
      id: activeConversation.participant.uid,
      name: activeConversation.participant.name,
      phone
    });
    window.location.href = `tel:${phone}`;
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  // Group contacts by role
  const groupedContacts: Record<string, Contact[]> = {};

  if (contactsResponse?.contacts && Array.isArray(contactsResponse.contacts)) {
    // Create a map of uid -> Contact for quick lookup
    const contactMap = new Map(contactsResponse.contacts.map(c => [c.uid, c]));

    if (contactsResponse?.groups && Object.keys(contactsResponse.groups).length > 0) {
      // Groups contain UIDs, so map them back to Contact objects
      Object.entries(contactsResponse.groups).forEach(([role, value]) => {
        const uids = Array.isArray(value) ? value : [];
        groupedContacts[role] = (uids as any[])
          .map(uid => contactMap.get(uid))
          .filter((contact): contact is Contact => contact !== undefined);
      });
    } else {
      // Fallback: group by role from contacts array
      contactsResponse.contacts.forEach(contact => {
        const role = contact.role || 'unknown';
        if (!groupedContacts[role]) {
          groupedContacts[role] = [];
        }
        groupedContacts[role].push(contact);
      });
    }
  }

  console.log('[Chat] groupedContacts:', groupedContacts);

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 lg:p-8">
      <div className="flex flex-1 min-h-0 gap-6 relative">
        {/* Contacts and Conversations Sidebar */}
        <Card className={`w-full lg:w-80 flex flex-col border-zinc-200 overflow-hidden ${
          !showListOnMobile ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Messenger-style header */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-bold text-zinc-900">Chats</h2>
              <button
                onClick={() => setSidebarTab('contacts')}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors"
                title="New message"
              >
                <EditIcon className="w-4 h-4 text-zinc-700" />
              </button>
            </div>
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={sidebarTab === 'conversations' ? 'Search Messenger' : 'Search contacts'}
                className="w-full h-9 pl-9 pr-3 rounded-full bg-zinc-100 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:bg-white focus:ring-1 focus:ring-zinc-300 transition-colors"
              />
            </div>
          </div>
          <div className="flex px-4 gap-2 pb-2">
            <button
              onClick={() => setSidebarTab('conversations')}
              className={`px-3 py-1.5 rounded-full font-semibold text-sm transition-colors ${
                sidebarTab === 'conversations'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Conversations
            </button>
            <button
              onClick={() => setSidebarTab('contacts')}
              className={`px-3 py-1.5 rounded-full font-semibold text-sm transition-colors ${
                sidebarTab === 'contacts'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Contacts
            </button>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col">
              {sidebarTab === 'conversations' && (() => {
                const q = searchQuery.trim().toLowerCase();
                const filtered = q
                  ? conversations.filter((c) => {
                      const name = (c.participant?.name || c.participant?.email || '').toLowerCase();
                      const last = (c.lastMessage?.content || '').toLowerCase();
                      return name.includes(q) || last.includes(q);
                    })
                  : conversations;

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-zinc-500 text-sm">
                      {q ? 'No matches found.' : 'No conversations yet.'}
                    </div>
                  );
                }

                return filtered.map((conversation) => {
                  const isActive = activeConversation?.id === conversation.id;
                  const isUnread = (conversation.unreadCount || 0) > 0;
                  const isOnline = presenceMap[conversation.participant?.uid || ''] === 'online';
                  const isMine = conversation.lastMessage?.senderId === user?.uid;
                  const preview = conversation.lastMessage?.content
                    ? `${isMine ? 'You: ' : ''}${conversation.lastMessage.content}`
                    : 'No messages yet';
                  const time = formatRelativeTime(conversation.lastMessageAt || conversation.lastMessage?.createdAt);

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation)}
                      className={`w-full flex items-center gap-3 px-2 py-2 mx-2 my-0.5 rounded-lg transition-colors relative ${
                        isActive ? 'bg-blue-50' : 'hover:bg-zinc-100'
                      }`}
                      style={{ width: 'calc(100% - 1rem)' }}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={conversation.participant?.photoURL || undefined} />
                          <AvatarFallback className="text-lg">{conversation.participant?.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500" />
                        )}
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <div className={`text-[15px] truncate ${isUnread ? 'font-bold text-zinc-900' : 'font-normal text-zinc-900'}`}>
                          {conversation.participant?.name || conversation.participant?.email}
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`text-[13px] truncate ${isUnread ? 'font-semibold text-zinc-900' : 'text-zinc-500'}`}>
                            {preview}
                          </span>
                          {time && (
                            <span className="text-[13px] text-zinc-400 shrink-0">· {time}</span>
                          )}
                        </div>
                      </div>
                      {isUnread && (
                        <div className="ml-1 w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </button>
                  );
                });
              })()}

              {sidebarTab === 'contacts' && (() => {
                const q = searchQuery.trim().toLowerCase();
                const groups = Object.entries(groupedContacts)
                  .map(([groupName, groupContacts]) => [
                    groupName,
                    q
                      ? (groupContacts as Contact[]).filter((c) =>
                          (c.name || c.email || '').toLowerCase().includes(q)
                        )
                      : (groupContacts as Contact[]),
                  ] as [string, Contact[]])
                  .filter(([, list]) => list.length > 0);

                if (groups.length === 0) {
                  return (
                    <div className="p-8 text-center text-zinc-500 text-sm">
                      {q ? 'No matches found.' : 'No contacts available.'}
                    </div>
                  );
                }

                return (
                  <>
                    {groups.map(([groupName, groupContacts]) => (
                      <div key={groupName}>
                        <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase bg-zinc-50 sticky top-0">
                          {groupName}
                        </div>
                        {groupContacts.map((contact) => (
                          <button
                            key={contact.uid}
                            onClick={() => handleSelectContact(contact)}
                            className="w-full flex items-center gap-3 px-2 py-2 mx-2 my-0.5 rounded-lg hover:bg-zinc-100 transition-colors"
                            style={{ width: 'calc(100% - 1rem)' }}
                          >
                            <div className="relative shrink-0">
                              <Avatar className="w-14 h-14">
                                <AvatarImage src={contact.photoURL || undefined} />
                                <AvatarFallback className="text-lg">{contact.name?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                              {contact.status === 'online' && (
                                <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500" />
                              )}
                            </div>
                            <div className="text-left min-w-0 flex-1">
                              <div className="text-[15px] font-normal text-zinc-900 truncate">
                                {contact.name || contact.email || 'Unknown'}
                              </div>
                              <div className="text-[13px] capitalize">
                                {contact.status === 'online' ? (
                                  <span className="text-emerald-600 font-medium">Active now</span>
                                ) : (
                                  <span className="text-zinc-500">Offline</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className={`flex-1 flex flex-col min-h-0 border-zinc-200 overflow-hidden ${
          showListOnMobile ? 'hidden lg:flex' : 'flex'
        }`}>
          {activeConversation ? (
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
                  <AvatarImage src={activeConversation.participant?.photoURL || undefined} />
                  <AvatarFallback>{activeConversation.participant?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {activeConversation.participant?.name || activeConversation.participant?.email || 'Unknown'}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-medium">
                    {isTyping ? 'typing...' : 'Direct Messaging Active'}
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

              <ScrollArea className="flex-1 min-h-0 bg-white">
                <div className="p-4 lg:p-6 space-y-1">
                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mb-2"></div>
                      <p className="text-sm text-zinc-500">Loading messages...</p>
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === user?.uid;
                      const isDeleted = Boolean(msg.deletedAt);
                      const isLast = idx === messages.length - 1;
                      const showTime = isLast || selectedMessageId === msg.id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            onClick={() => setSelectedMessageId(prev => (prev === msg.id ? null : msg.id))}
                            className={`max-w-[85%] lg:max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm relative cursor-pointer ${
                            isMe ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900 border border-zinc-100'
                          }`}>
                            {isDeleted ? (
                              <span className="italic text-zinc-400">This message was deleted</span>
                            ) : (
                              msg.content
                            )}
                            {isMe && !isDeleted && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                                className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-200 rounded"
                              >
                                <Trash2 className="w-3 h-3 text-zinc-600" />
                              </button>
                            )}
                          </div>
                          {showTime && (
                            <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? '' : 'flex-row-reverse'}`}>
                              <span className="text-[10px] text-zinc-400">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {isMe && !isDeleted && (
                                (msg.readBy && msg.readBy.length > 0) ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Check className="w-3 h-3 text-zinc-300" />
                                )
                              )}
                            </div>
                          )}
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

              <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-100 flex items-end gap-2 shrink-0 bg-white">
                <Button type="button" variant="ghost" size="icon" className="text-zinc-400 hidden sm:inline-flex h-10 w-10">
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Textarea
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping(e.target.value.length > 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e as any);
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[40px] max-h-[120px] py-2 resize-none"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-zinc-900 shrink-0 h-10 w-10"
                  disabled={sending || !newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a contact to start chatting</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
