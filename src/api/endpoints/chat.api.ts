import { getApiData, postApiData } from '@/src/api/client';
import { Message } from '@/src/shared/types/domain';

export function listChatMessages(chatId: string) {
  return getApiData<Message[]>(`/v1/chats/${chatId}/messages`);
}

export function createChatMessage(chatId: string, text: string) {
  return postApiData<Message, { text: string }>(`/v1/chats/${chatId}/messages`, { text });
}

export function markChatMessageSeen(chatId: string, id: string) {
  return postApiData<Message, Record<string, never>>(`/v1/chats/${chatId}/messages/${id}/seen`, {});
}
