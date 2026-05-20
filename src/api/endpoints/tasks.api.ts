import { deleteApiData, getApiData, patchApiData, postApiData } from '@/src/api/client';
import { Message, Task, TaskSubmission } from '@/src/shared/types/domain';

export function listTasks() {
  return getApiData<Task[]>('/v1/tasks/');
}

export function getTask(taskId: string) {
  return getApiData<Task>(`/v1/tasks/${taskId}`);
}

export function createTask(body: Partial<Task> & Pick<Task, 'title' | 'assignedTo'>) {
  return postApiData<Task, typeof body>('/v1/tasks/', body);
}

export function updateTask(taskId: string, body: Partial<Task> & { submission?: TaskSubmission | null }) {

  console.log('call');
  
  return patchApiData<Task, typeof body>(`/v1/tasks/${taskId}`, body);
}

export function deleteTask(taskId: string) {
  return deleteApiData<Task>(`/v1/tasks/${taskId}`);
}

export function listTaskMessages(taskId: string) {
  return getApiData<Message[]>(`/v1/tasks/${taskId}/messages`);
}

export function createTaskMessage(taskId: string, text: string) {
  return postApiData<Message, { text: string }>(`/v1/tasks/${taskId}/messages`, { text });
}
