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

export interface ScreenshotStatsData {
  totalScreenshots: number;
  byEmployee: EmployeeScreenshot[];
  byTask: TaskScreenshot[];
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
