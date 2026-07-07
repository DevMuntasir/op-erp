import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ImageIcon, User as UserIcon, Briefcase, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchScreenshotStats, ScreenshotStatsData } from '@/src/services/screenshotService';

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

export const SessionHistory = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ScreenshotStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const loadScreenshotStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchScreenshotStats();
        setStats(data);
      } catch (err) {
        console.error('Error fetching screenshot stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load screenshot statistics');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadScreenshotStats();
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
        ) : stats ? (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-zinc-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-zinc-600">Total Screenshots</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-black text-emerald-600">{stats.totalScreenshots}</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-zinc-600">Active Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-black text-blue-600">{stats.byEmployee.length}</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200 bg-gradient-to-br from-purple-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-zinc-600">Associated Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-black text-purple-600">{stats.byTask.length}</p>
                </CardContent>
              </Card>
            </div>

            {stats.byEmployee.length > 0 && (
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
                      {stats.byEmployee.map((employee) => (
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

            {stats.byTask.length > 0 && (
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
                      {stats.byTask.map((task) => (
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

            {stats.sessionLogs && stats.sessionLogs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Session Logs</h3>
                </div>
                <Card className="border-zinc-200 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8" />
                        <TableHead>Employee</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>Active Time</TableHead>
                        <TableHead className="text-right">Screenshots</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.sessionLogs.map((session) => {
                        const isExpanded = expandedSessionId === session.id;
                        const hasScreenshots = session.screenshotCount > 0;
                        return (
                          <React.Fragment key={session.id}>
                            <TableRow
                              className={`group transition-colors hover:bg-zinc-50/50 ${hasScreenshots ? 'cursor-pointer' : ''}`}
                              onClick={() => hasScreenshots && setExpandedSessionId(isExpanded ? null : session.id)}
                            >
                              <TableCell>
                                {hasScreenshots && (
                                  isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                                  )
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-zinc-900">{session.employee.name}</div>
                                <div className="text-xs text-zinc-500">{session.employee.email}</div>
                              </TableCell>
                              <TableCell className="text-sm text-zinc-600">{session.taskTitle || '—'}</TableCell>
                              <TableCell className="text-sm text-zinc-600">{formatDateTime(session.startTime)}</TableCell>
                              <TableCell className="text-sm text-zinc-600">{formatDateTime(session.endTime)}</TableCell>
                              <TableCell className="text-sm text-zinc-600">{formatDuration(session.activeTimeSec)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border-none font-bold">
                                  {session.screenshotCount}
                                </Badge>
                              </TableCell>
                            </TableRow>
                            {isExpanded && hasScreenshots && (
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={7} className="bg-zinc-50/50 p-4">
                                  <div className="flex flex-wrap gap-3">
                                    {session.screenshots.map((screenshot) => {
                                      const imageSrc = screenshot.storagePath || screenshot.downloadURL || null;
                                      return (
                                      <div
                                        key={screenshot.id}
                                        className="w-32 rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm"
                                      >
                                        {imageSrc ? (
                                          <img
                                            src={imageSrc}
                                            alt="Screenshot"
                                            className="w-full h-20 object-cover cursor-zoom-in"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPreviewImage(imageSrc);
                                            }}
                                          />
                                        ) : (
                                          <div className="w-full h-20 flex items-center justify-center bg-zinc-100">
                                            <ImageIcon className="w-6 h-6 text-zinc-300" />
                                          </div>
                                        )}
                                        <p className="text-[10px] text-zinc-500 px-2 py-1 truncate">
                                          {formatDateTime(screenshot.timestamp)}
                                        </p>
                                      </div>
                                      );
                                    })}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
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

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent
          showCloseButton
          className="max-w-none w-screen h-screen p-0 bg-black/95 rounded-none flex items-center justify-center"
        >
          {previewImage && (
            <img
              src={previewImage}
              alt="Screenshot preview"
              className="max-w-full max-h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
