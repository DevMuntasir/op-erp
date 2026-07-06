import { getApiData } from '@/src/api/client';

export interface EmployeeScreenshot {
  uid: string;
  name: string;
  email: string;
  count: number;
}

export interface TaskScreenshot {
  taskId: string;
  taskTitle: string;
  count: number;
}

export interface SessionScreenshot {
  id: string;
  userId: string;
  adminId: string;
  sessionId: string;
  taskId: string;
  storagePath: string;
  downloadURL: string | null;
  timestamp: string;
}

export interface SessionLogEmployee {
  uid: string;
  name: string;
  email: string;
}

export interface SessionLog {
  id: string;
  employee: SessionLogEmployee;
  taskTitle: string;
  startTime: string;
  endTime: string;
  activeTimeSec: number;
  screenshotCount: number;
  screenshots: SessionScreenshot[];
}

export interface ScreenshotStatsData {
  totalScreenshots: number;
  byEmployee: EmployeeScreenshot[];
  byTask: TaskScreenshot[];
  sessionLogs: SessionLog[];
}

export async function fetchScreenshotStats(): Promise<ScreenshotStatsData> {
  try {
    const data = await getApiData<ScreenshotStatsData>('/v1/screenshots/stats');
    return data;
  } catch (error) {
    console.error('Error fetching screenshot stats:', error);
    throw error;
  }
}
