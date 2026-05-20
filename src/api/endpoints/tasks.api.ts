import { deleteApiData, getApiData, patchApiData, postApiData } from '@/src/api/client';
import { Message, Task, TaskSubmission } from '@/src/shared/types/domain';

export type CreateTaskRequest = {
  projectId?: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedToName?: string;
  clientEmail?: string;
  priority: Task['priority'];
  dueDate?: string;
};

export type UpdateTaskRequest = Partial<Task> & { submission?: TaskSubmission | null };

export function listTasks() {
  return getApiData<Task[]>('/v1/tasks/');
}

export function getTask(taskId: string) {
  return getApiData<Task>(`/v1/tasks/${taskId}`);
}

export function createTask(body: CreateTaskRequest) {
  return postApiData<Task, typeof body>('/v1/tasks/', body);
}

export function updateTask(taskId: string, body: UpdateTaskRequest) {
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
