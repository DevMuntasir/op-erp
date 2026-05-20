import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/App';
import { Session, Project, User, Task } from '@/src/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Briefcase, User as UserIcon, Monitor, CheckSquare, ChevronRight, Filter, Search } from 'lucide-react';
import { formatDateTimeHalifax } from '@/src/lib/presence';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export const SessionHistory = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (!user) return;

    // Fetch Admins if Super Admin for the dropdown
    if (isSuperAdmin) {
      const qAdmins = query(collection(db, 'profiles'), where('role', '==', 'admin'));
      const unsubAdmins = onSnapshot(qAdmins, (snap) => {
        setAdmins(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
      }, (error) => console.error("SessionHistory unsubAdmins error:", error));
      return () => unsubAdmins();
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (!user) return;

    // Determine working adminId for context
    const contextAdminId = isSuperAdmin ? (selectedAdminId === 'all' ? null : selectedAdminId) : (user.role === 'admin' ? user.uid : user.adminId);

    // Fetch projects for mapping
    let qProjects;
    if (contextAdminId) {
      qProjects = query(collection(db, 'projects'), where('adminId', '==', contextAdminId));
    } else {
      qProjects = query(collection(db, 'projects'));
    }
    
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }, (error) => console.error("SessionHistory unsubProjects error:", error));

    // Fetch tasks for mapping
    let qTasks;
    if (contextAdminId) {
      qTasks = query(collection(db, 'tasks'), where('adminId', '==', contextAdminId));
    } else {
      qTasks = query(collection(db, 'tasks'));
    }
    
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => console.error("SessionHistory unsubTasks error:", error));

    // Fetch staff for mapping and dropdown
    let qStaff;
    if (isSuperAdmin) {
      if (selectedAdminId === 'all') {
        qStaff = query(collection(db, 'profiles'), where('role', '==', 'employee'));
      } else {
        qStaff = query(collection(db, 'profiles'), where('role', '==', 'employee'), where('adminId', '==', selectedAdminId));
      }
    } else {
      qStaff = query(collection(db, 'profiles'), where('adminId', '==', contextAdminId), where('role', '==', 'employee'));
    }
    
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      setStaff(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    }, (error) => console.error("SessionHistory unsubStaff error:", error));

    // Fetch sessions with complex filters
    let qSessions = query(collection(db, 'sessions'), orderBy('startTime', 'desc'), limit(200));

    if (isSuperAdmin) {
      if (selectedAdminId !== 'all') {
        qSessions = query(collection(db, 'sessions'), where('adminId', '==', selectedAdminId), orderBy('startTime', 'desc'), limit(200));
      }
      if (selectedUserId !== 'all') {
        qSessions = query(collection(db, 'sessions'), where('userId', '==', selectedUserId), orderBy('startTime', 'desc'), limit(200));
      }
    } else if (user.role === 'admin') {
      if (selectedUserId !== 'all') {
        qSessions = query(collection(db, 'sessions'), where('userId', '==', selectedUserId), where('adminId', '==', user.uid), orderBy('startTime', 'desc'), limit(200));
      } else {
        qSessions = query(collection(db, 'sessions'), where('adminId', '==', user.uid), orderBy('startTime', 'desc'), limit(200));
      }
    } else {
      qSessions = query(collection(db, 'sessions'), where('userId', '==', user.uid), orderBy('startTime', 'desc'), limit(200));
    }

    const unsubSessions = onSnapshot(qSessions, (snap) => {
      setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
      setLoading(false);
    }, (error) => {
      console.error("SessionHistory unsubSessions error:", error);
      setLoading(false);
    });

    return () => {
      unsubProjects();
      unsubTasks();
      unsubStaff();
      unsubSessions();
    };
  }, [user, selectedAdminId, selectedUserId, isSuperAdmin]);

  const getTaskName = (taskId?: string, projectId?: string) => {
    if (taskId) {
      return tasks.find(t => t.id === taskId)?.title || 'Task Session';
    }
    if (projectId) {
      const project = projects.find((p) => p.id === projectId);
      return project?.title || project?.name || 'Project Work';
    }
    return 'General Activity';
  };

  const getStaffName = (userId: string) => {
    return staff.find(s => s.uid === userId)?.name || 'Unknown Staff';
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const groupSessionsByDay = (sessions: Session[]) => {
    const groups: { [key: string]: Session[] } = {};
    sessions.forEach(session => {
      const date = session.startTime?.toDate ? session.startTime.toDate() : new Date(session.startTime);
      const day = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
      if (!groups[day]) groups[day] = [];
      groups[day].push(session);
    });
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(day => ({
      day,
      sessions: groups[day]
    }));
  };

  const groupedSessions = groupSessionsByDay(sessions);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-10 bg-[#FAFAFA]">
      <div className="max-w-[1400px] mx-auto space-y-10 pb-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Time Tracking History</h2>
            <p className="text-zinc-500 font-medium">Review past work sessions with industrial precision.</p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-2 pl-2">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filters</span>
              </div>
              
              {isSuperAdmin && (
                <Select value={selectedAdminId} onValueChange={(v) => { setSelectedAdminId(v); setSelectedUserId('all'); }}>
                  <SelectTrigger className="w-[180px] h-9 rounded-xl border-zinc-100 bg-zinc-50/50 text-xs font-bold ring-0 focus:ring-0">
                    <SelectValue placeholder="Agency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Global System</SelectItem>
                    {admins.map(admin => (
                      <SelectItem key={admin.uid} value={admin.uid}>{admin.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-[180px] h-9 rounded-xl border-zinc-100 bg-zinc-50/50 text-xs font-bold ring-0 focus:ring-0">
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Personnel</SelectItem>
                  {staff.map(emp => (
                    <SelectItem key={emp.uid} value={emp.uid}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(selectedAdminId !== 'all' || selectedUserId !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 px-3 text-xs font-bold text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl"
                  onClick={() => { setSelectedAdminId('all'); setSelectedUserId('all'); }}
                >
                  Reset
                </Button>
              )}
            </div>
          )}
        </div>

        {groupedSessions.length > 0 ? (
          groupedSessions.map((group) => (
            <div key={group.day} className="space-y-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-4 h-4" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">{new Date(group.day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              </div>
              <Card className="border-zinc-200 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow className="hover:bg-transparent">
                      {isAdmin && <TableHead className="w-[200px]">Staff Member</TableHead>}
                      <TableHead>Task / Activity</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.sessions.map((session) => (
                      <TableRow key={session.id} className="group transition-colors hover:bg-zinc-50/50">
                        {isAdmin && (
                          <TableCell className="font-medium text-zinc-900">
                            {getStaffName(session.userId)}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                            <span className="font-medium text-zinc-900">{getTaskName(session.taskId, session.projectId)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-600 font-mono">
                          {formatDateTimeHalifax(session.startTime).split(', ')[1]}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-600 font-mono">
                          {session.endTime ? formatDateTimeHalifax(session.endTime).split(', ')[1] : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold text-zinc-900">
                          {formatDuration(session.activeTime)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={session.status === 'active' ? 'default' : 'secondary'}
                            className={session.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-none'}
                          >
                            {session.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="bg-zinc-50 border-t border-zinc-100 px-4 py-2 flex justify-end">
                   <p className="text-xs text-zinc-500">
                     Total Daily Activity: <span className="font-bold text-zinc-900">{formatDuration(group.sessions.reduce((acc, s) => acc + s.activeTime, 0))}</span>
                   </p>
                </div>
              </Card>
            </div>
          ))
        ) : (
          !loading && (
            <Card className="border-dashed border-zinc-200 py-12 flex flex-col items-center justify-center text-center">
              <Calendar className="w-12 h-12 text-zinc-200 mb-4" />
              <p className="text-zinc-500 font-medium">No tracking history recorded yet.</p>
              <p className="text-zinc-400 text-sm max-w-xs">Start a work session to see your activity logs appear here organized by day.</p>
            </Card>
          )
        )}
      </div>
    </div>
  );
};
