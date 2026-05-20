import { startSession } from '@/src/api/endpoints/sessions.api';
import { updateTask } from '@/src/api/endpoints/tasks.api';
import { Session, Task, TaskStatus } from '@/src/shared/types/domain';

type StartableTask = Pick<Task, 'id' | 'status'>;

interface StartTaskWorkOptions {
  activeSession?: Session | null;
}

interface StartTaskWorkResult {
  session: Session;
  updatedStatus: TaskStatus;
  sessionStarted: boolean;
}

export async function startTaskWork(task: StartableTask, options: StartTaskWorkOptions = {}): Promise<StartTaskWorkResult> {
  const { activeSession } = options;

  if (activeSession?.status === 'active') {
    if (activeSession.taskId && activeSession.taskId !== task.id) {
      throw new Error('Another active session is already running. Stop it before starting a new task.');
    }

    if (task.status === 'pending') {
      await updateTask(task.id, { status: 'in-progress' });
    }

    return {
      session: activeSession,
      updatedStatus: 'in-progress',
      sessionStarted: false,
    };
  }

  if (task.status === 'pending') {
    await updateTask(task.id, { status: 'in-progress' });
  }

  const session = await startSession({ taskId: task.id });

  return {
    session,
    updatedStatus: 'in-progress',
    sessionStarted: true,
  };
}
