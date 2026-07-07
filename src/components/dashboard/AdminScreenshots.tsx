import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/App';
import { Screenshot, User } from '@/src/types';
import { listEmployees } from '@/src/api/endpoints/employees.api';
import { listScreenshots, deleteScreenshot, bulkDeleteScreenshots } from '@/src/api/endpoints/screenshots.api';
import { listAdmins } from '@/src/api/endpoints/admins.api';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calendar, Camera, User as UserIcon, Monitor, Activity, Maximize2, Eye, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { formatDateTimeHalifax } from '@/src/lib/presence';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export const AdminScreenshots = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const [screenshotToDelete, setScreenshotToDelete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedScreenshots, setSelectedScreenshots] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (!user || !isSuperAdmin) return;

    const fetchAdmins = async () => {
      try {
        const data = await listAdmins();
        setAdmins(data);
      } catch (error) {
        console.error("AdminScreenshots fetchAdmins error:", error);
      }
    };

    fetchAdmins();
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (!user) return;

    const fetchEmployees = async () => {
      try {
        const usersData = await listEmployees();
        console.log('Employees fetched:', usersData);
        setUsers(usersData);
      } catch (error) {
        console.error("AdminScreenshots fetchEmployees error:", error);
      }
    };

    fetchEmployees();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchScreenshots = async () => {
      try {
        setLoading(true);

        let screensData = await listScreenshots();
        console.log('Screenshots fetched:', screensData);

        // Filter by selected employee
        if (selectedEmployeeId) {
          screensData = screensData.filter((screen: any) => screen.userId === selectedEmployeeId);
          console.log(`Filtered screenshots for employee ${selectedEmployeeId}:`, screensData);
        }

        setScreenshots(screensData);
        setLoading(false);
      } catch (error) {
        console.error("AdminScreenshots fetchScreenshots error:", error);
        setScreenshots([]);
        setLoading(false);
      }
    };

    fetchScreenshots();
  }, [user, selectedAdminId, selectedEmployeeId, isSuperAdmin]);

  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.uid === userId);
    return foundUser?.name || 'Unknown Staff';
  };

  const getUserAvatar = (userId: string) => {
    const foundUser = users.find(u => u.uid === userId);
    return foundUser?.photoURL || '';
  };

  const handleDeleteScreenshot = async () => {
    if (!screenshotToDelete) return;

    try {
      setDeleteLoading(true);
      console.log('🗑️ Attempting to delete screenshot:', screenshotToDelete.id);
      console.log('📤 API endpoint: DELETE /v1/screenshots/' + screenshotToDelete.id);

      const result = await deleteScreenshot(screenshotToDelete.id);
      console.log('✅ Screenshot deleted successfully:', result);

      setScreenshots(prev => prev.filter(s => s.id !== screenshotToDelete.id));
      setScreenshotToDelete(null);
      setDeleteConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.screenshots() });
    } catch (error: any) {
      console.error("❌ Failed to delete screenshot:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        details: error?.details
      });
      alert('Failed to delete screenshot:\n\n' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleSelectScreenshot = (screenshotId: string) => {
    setSelectedScreenshots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(screenshotId)) {
        newSet.delete(screenshotId);
      } else {
        newSet.add(screenshotId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedScreenshots.size === screenshots.length && screenshots.length > 0) {
      setSelectedScreenshots(new Set());
    } else {
      setSelectedScreenshots(new Set(screenshots.map(s => s.id)));
    }
  };

  const handleBulkDeleteScreenshots = async () => {
    if (!user || !user.uid) return;

    try {
      setBulkDeleteLoading(true);
      const projectId = (user.adminId || user.uid) as string;

      console.log('🗑️ Attempting bulk delete');
      console.log('📤 API endpoint: POST /v1/screenshots/bulk-delete');
      console.log('📋 Payload:', { projectId, year: selectedYear, month: selectedMonth });

      const result = await bulkDeleteScreenshots(projectId, selectedYear, selectedMonth);
      console.log('✅ Screenshots deleted successfully:', result);

      setScreenshots(prev => prev.filter(s => !selectedScreenshots.has(s.id)));
      setSelectedScreenshots(new Set());
      setBulkDeleteConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.screenshots() });
    } catch (error: any) {
      console.error("❌ Failed to bulk delete screenshots:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        details: error?.details
      });
      alert('Failed to delete screenshots:\n\n' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-10 bg-[#FAFAFA] selection:bg-zinc-200">
      <div className="max-w-[1600px] mx-auto space-y-10 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-200 pb-8">
          <div className="space-y-1 flex-1">
            <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 flex items-center gap-4">
              Monitoring Center
              <Badge variant="outline" className="h-6 px-2 text-[10px] font-bold uppercase tracking-widest bg-zinc-100 border-zinc-200">
                Live Captures
              </Badge>
              {selectedScreenshots.size > 0 && (
                <Badge className="bg-blue-500 text-white ml-4">{selectedScreenshots.size} selected</Badge>
              )}
            </h2>
            <p className="text-zinc-500 font-medium">Real-time activity tracking and employee log analysis.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1.5 rounded-xl shadow-sm">
                <div className="px-3 py-1 flex flex-col">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest text-left">Internal Agency Filter</span>
                  <Select value={selectedAdminId} onValueChange={(value) => setSelectedAdminId(value || 'all')}>
                    <SelectTrigger className="h-8 border-none bg-transparent p-0 w-[180px] font-bold focus:ring-0">
                      <SelectValue placeholder="All Agencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Global Agencies</SelectItem>
                      {admins.map(admin => (
                        <SelectItem key={admin.uid} value={admin.uid}>{admin.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1.5 rounded-xl shadow-sm">
              <div className="px-3 py-1 flex flex-col">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest text-left">Employee Filter</span>
                <Select value={selectedEmployeeId} onValueChange={(value) => setSelectedEmployeeId(value || '')}>
                  <SelectTrigger className="h-8 border-none bg-transparent p-0 w-[200px] font-bold focus:ring-0">
                    <SelectValue placeholder="All Employees">
                      {selectedEmployeeId && users.find(u => u.uid === selectedEmployeeId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Employees</SelectItem>
                    {users.map(employee => (
                      <SelectItem key={employee.uid} value={employee.uid}>{employee.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {selectedScreenshots.size > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedScreenshots(new Set())}
                disabled={bulkDeleteLoading}
              >
                Clear Selection
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => setBulkDeleteConfirmOpen(true)}
                disabled={bulkDeleteLoading}
              >
                <Trash2 className="w-4 h-4" />
                Bulk Delete
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {screenshots.map((screen) => (
            <Card
              key={screen.id}
              onClick={() => setSelectedScreenshot(screen)}
              className="group border-zinc-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden bg-white cursor-pointer"
            >
              <div className="relative aspect-video bg-zinc-100 overflow-hidden">
                <img
                  src={screen.storagePath}
                  alt={`Screenshot captured from ${getUserName(screen.userId)}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />

                {/* Always-visible title bar with employee name */}
                <div className="absolute top-0 inset-x-0 bg-linear-to-b from-black/80 via-black/40 to-transparent pt-3 pb-8 px-3 flex items-center gap-2.5">
                  <Avatar className="w-8 h-8 border-2 border-white/30 shadow-md rounded-lg shrink-0">
                    <AvatarImage src={getUserAvatar(screen.userId)} />
                    <AvatarFallback className="bg-zinc-700 text-white text-xs font-bold">{getUserName(screen.userId)[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate tracking-tight leading-tight drop-shadow-sm">
                      {getUserName(screen.userId)}
                    </p>
                    <p className="text-[10px] text-white/80 font-bold truncate">
                      {formatDateTimeHalifax(screen.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3">
                  <Maximize2 className="w-10 h-10 text-white stroke-[1.5]" />
                  <Badge className="bg-white text-zinc-900 font-black border-none shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    View Capture
                  </Badge>
                </div>
                <div className="absolute bottom-3 left-3">
                   <Badge className={`text-[9px] font-black uppercase tracking-widest border-none ${
                     screen.activityLevel > 70 ? 'bg-emerald-500 text-white' :
                     screen.activityLevel > 30 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                   }`}>
                     {screen.activityLevel}% Activity
                   </Badge>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectScreenshot(screen.id);
                  }}
                  className="absolute bottom-3 right-3 p-1.5 bg-white rounded-lg shadow-md hover:shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                >
                  {selectedScreenshots.has(screen.id) ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-300" />
                  )}
                </button>
              </div>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <p className="text-[10px] text-zinc-500 flex items-center gap-1 font-bold">
                  <Clock className="w-3 h-3" />
                  {formatDateTimeHalifax(screen.timestamp)}
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setScreenshotToDelete(screen);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {screenshots.length === 0 && !loading && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-400">
              <Camera className="w-12 h-12 mb-4 opacity-10" />
              <p className="font-medium">No screenshots captured yet.</p>
              <p className="text-sm">Active shifts will automatically log activity snapshots here.</p>
            </div>
          )}
        </div>

        <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
          <DialogContent className="max-w-none sm:max-w-none w-screen h-[100dvh] p-0 bg-zinc-950/98 border-none shadow-none flex flex-col items-center justify-start overflow-y-auto z-[100]">
            {selectedScreenshot && (
              <div className="w-full min-h-full flex flex-col items-center justify-center p-4 sm:p-8 gap-4 sm:gap-8">
                <div className="relative bg-zinc-900 w-full max-w-6xl aspect-video sm:flex-1 flex items-center justify-center rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/5 shrink-0">
                  <img 
                    src={selectedScreenshot.storagePath} 
                    alt="Full size staff capture"
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 flex justify-between items-start pointer-events-none">
                    <Badge className="bg-emerald-500 text-white font-black border-none uppercase tracking-widest px-2 sm:px-4 py-1 sm:py-2 text-[9px] sm:text-xs shadow-lg">
                      Live Diagnostic Capture
                    </Badge>
                  </div>
                </div>

                <div className="w-full max-w-6xl pb-8">
                  <div className="bg-zinc-900/90 backdrop-blur-xl px-4 sm:px-8 py-3 sm:py-5 rounded-2xl sm:rounded-[3rem] flex flex-col sm:flex-row items-center gap-4 sm:gap-12 text-white shadow-2xl border border-white/10">
                    <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto">
                      <Avatar className="w-10 h-10 sm:w-16 sm:h-16 border-2 border-white/20 shadow-2xl rounded-xl sm:rounded-[2rem] shrink-0">
                        <AvatarImage src={getUserAvatar(selectedScreenshot.userId)} />
                        <AvatarFallback className="bg-zinc-800 text-white font-black">{getUserName(selectedScreenshot.userId)[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-2xl font-black text-white tracking-tight truncate">{getUserName(selectedScreenshot.userId)}</h3>
                        <p className="text-[9px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest leading-none truncate mt-1">
                          {selectedScreenshot.activityLevel}% Diagnostic Activity • {formatDateTimeHalifax(selectedScreenshot.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:block h-12 w-px bg-white/10" />
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={deleteConfirmOpen} onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmOpen(false);
            setScreenshotToDelete(null);
          }
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Screenshot</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {screenshotToDelete && (
                <div className="bg-zinc-100 rounded-lg p-3 mb-2">
                  <p className="text-xs text-zinc-600 mb-2">Screenshot from <strong>{getUserName(screenshotToDelete.userId)}</strong></p>
                  <img src={screenshotToDelete.storagePath} alt="Screenshot to delete" className="w-full h-auto rounded max-h-40 object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <p className="text-sm text-zinc-600">
                Are you sure you want to delete this screenshot? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteScreenshot}
                  disabled={deleteLoading}
                  className="gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkDeleteConfirmOpen} onOpenChange={(open) => {
          if (!open) {
            setBulkDeleteConfirmOpen(false);
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Bulk Delete Screenshots</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-900 mb-3">Select Month & Year to delete</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Month</label>
                    <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <SelectItem key={month} value={month.toString()}>
                            {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Year</label>
                    <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <p className="text-sm text-zinc-600">
                All screenshots from <strong>{new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</strong> will be permanently deleted. This action cannot be undone.
              </p>

              <div className="bg-zinc-100 rounded-lg p-3 max-h-48 overflow-y-auto">
                <p className="text-xs text-zinc-600 mb-2 font-bold">Selected screenshots:</p>
                <div className="space-y-2">
                  {screenshots
                    .filter(s => selectedScreenshots.has(s.id))
                    .map(screen => (
                      <div key={screen.id} className="flex gap-2 items-center p-2 bg-white rounded">
                        <img
                          src={screen.storagePath}
                          alt="Screenshot"
                          className="w-12 h-12 rounded object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">{getUserName(screen.userId)}</p>
                          <p className="text-[10px] text-zinc-500">{formatDateTimeHalifax(screen.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setBulkDeleteConfirmOpen(false)}
                  disabled={bulkDeleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDeleteScreenshots}
                  disabled={bulkDeleteLoading}
                  className="gap-2"
                >
                  {bulkDeleteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete {selectedScreenshots.size} Screenshot{selectedScreenshots.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
