import { apiClient, getApiData, postApiData, deleteApiData } from '@/src/api/client';
import { Contact, ContactsResponse, Conversation, Message } from '@/src/shared/types/domain';

export async function getContacts() {
  const response = await getApiData<ContactsResponse>('/v1/messages/contacts');
  console.log('[API] getContacts raw response:', response);
  if (response?.contacts) {
    console.log('[API] First contact:', response.contacts[0]);
  }
  return response;
}

export async function getConversations() {
  const response = await getApiData<Conversation[]>('/v1/messages/conversations');
  console.log('[API] getConversations response:', response);

  // Response is already an array of Conversation objects with proper participant data
  if (Array.isArray(response)) {
    // Convert lastMessage to proper Message type if needed
    const conversations = response.map((conv: any) => ({
      ...conv,
      lastMessage: conv.lastMessage ? {
        id: conv.lastMessage.id,
        conversationId: conv.lastMessage.conversationId,
        senderId: conv.lastMessage.senderId,
        content: conv.lastMessage.content,
        createdAt: conv.lastMessage.createdAt,
        fileUrl: conv.lastMessage.fileUrl || null,
        deletedAt: conv.lastMessage.isDeleted ? conv.lastMessage.createdAt : null,
        readBy: [],
      } as Message : null,
    } as Conversation));

    console.log('[API] Processed conversations:', conversations);
    return conversations;
  }

  return [];
}

export function createConversation(recipientId: string) {
  return postApiData<Conversation, { recipientId: string }>('/v1/messages/conversations', { recipientId });
}

export async function getMessages(conversationId: string, limit = 50, cursor?: string) {
  const rawMessages = await getApiData<any[]>(`/v1/messages/conversations/${conversationId}/messages`, { limit, ...(cursor && { cursor }) });

  // Convert API response to Message type
  const messages: Message[] = (Array.isArray(rawMessages) ? rawMessages : []).map((msg: any) => ({
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    content: msg.content,
    fileUrl: msg.fileUrl || null,
    deletedAt: msg.isDeleted ? new Date().toISOString() : null,
    createdAt: msg.createdAt,
    readBy: msg.readBy || [],
  }));

  return messages;
}

export function markConversationRead(conversationId: string) {
  return postApiData<void, Record<string, never>>(`/v1/messages/conversations/${conversationId}/messages/read`, {});
}

export function sendTextMessage(conversationId: string, content: string) {
  return postApiData<Message, { content: string }>(`/v1/messages/conversations/${conversationId}/messages`, { content });
}

export function sendFileMessage(conversationId: string, file: File, content?: string) {
  const form = new FormData();
  form.append('file', file);
  if (content) form.append('content', content);
  return apiClient.post<{ data: Message }>(`/v1/messages/conversations/${conversationId}/messages`, form).then(r => r.data.data);
}

export function deleteMessage(conversationId: string, messageId: string) {
  return deleteApiData<void>(`/v1/messages/conversations/${conversationId}/messages/${messageId}`);
}
