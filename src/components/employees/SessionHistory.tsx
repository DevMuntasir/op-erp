import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, User as UserIcon, Briefcase } from 'lucide-react';

interface EmployeeScreenshot {
  uid: string;
  name: string;
  email: string;
  count: number;
}

interface TaskScreenshot {
  taskId: string;
  taskTitle: string;
  count: number;
}

interface ScreenshotStats {
  success: boolean;
  data: {
    totalScreenshots: number;
    byEmployee: EmployeeScreenshot[];
    byTask: TaskScreenshot[];
  };
  meta: {
    requestId: string;
  };
}

export const SessionHistory = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ScreenshotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScreenshotStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/v1/screenshots/stats');

        if (!response.ok) {
          throw new Error(`Failed to fetch screenshot stats: ${response.statusText}`);
        }

        const data: ScreenshotStats = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching screenshot stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load screenshot statistics');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchScreenshotStats();
    }
  }, [user]);

  if (error && !loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 lg:p-10 bg-[#FAFAFA]">
        <div className="max-w-[1400px] mx-auto">
          <Card className="border-dashed border-red-200 bg-red-50 py-12 flex flex-col items-center justify-center text-center">
            <ImageIcon className="w-12 h-12 text-red-200 mb-4" />
            <p className="text-red-600 font-medium">Failed to load screenshot statistics</p>
            <p className="text-red-500 text-sm max-w-xs">{error}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-10 bg-[#FAFAFA]">
      <div className="max-w-[1400px] mx-auto space-y-10 pb-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Screenshot Statistics</h2>
            <p className="text-zinc-500 font-medium">Review captured screenshots activity and task distribution.</p>
          </div>
        </div>

        {loading ? (
          <Card className="border-zinc-200 py-12 flex flex-col items-center justify-center text-center">
            <ImageIcon className="w-12 h-12 text-zinc-200 mb-4 animate-pulse" />
            <p className="text-zinc-500 font-medium">Loading screenshot statistics...</p>
          </Card>
        ) : stats && stats.data ? (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-zinc-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-zinc-600">Total Screenshots</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-black text-emerald-600">{stats.data.totalScreenshots}</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-zinc-600">Active Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-black text-blue-600">{stats.data.byEmployee.length}</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200 bg-gradient-to-br from-purple-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-zinc-600">Associated Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-black text-purple-600">{stats.data.byTask.length}</p>
                </CardContent>
              </Card>
            </div>

            {stats.data.byEmployee.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Screenshots by Employee</h3>
                </div>
                <Card className="border-zinc-200 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Screenshots</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.data.byEmployee.map((employee) => (
                        <TableRow key={employee.uid} className="group transition-colors hover:bg-zinc-50/50">
                          <TableCell className="font-medium text-zinc-900">
                            {employee.name}
                          </TableCell>
                          <TableCell className="text-sm text-zinc-600">
                            {employee.email}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-900 hover:bg-blue-200 border-none font-bold">
                              {employee.count}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}

            {stats.data.byTask.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Screenshots by Task</h3>
                </div>
                <Card className="border-zinc-200 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Task</TableHead>
                        <TableHead className="text-right">Screenshots</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.data.byTask.map((task) => (
                        <TableRow key={task.taskId} className="group transition-colors hover:bg-zinc-50/50">
                          <TableCell className="font-medium text-zinc-900">
                            {task.taskTitle}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-900 hover:bg-purple-200 border-none font-bold">
                              {task.count}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}
          </div>
        ) : (
          !loading && (
            <Card className="border-dashed border-zinc-200 py-12 flex flex-col items-center justify-center text-center">
              <ImageIcon className="w-12 h-12 text-zinc-200 mb-4" />
              <p className="text-zinc-500 font-medium">No screenshot data available</p>
              <p className="text-zinc-400 text-sm max-w-xs">Screenshots will appear here once they are captured.</p>
            </Card>
          )
        )}
      </div>
    </div>
  );
};
