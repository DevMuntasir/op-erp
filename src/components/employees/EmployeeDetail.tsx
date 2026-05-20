import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/App';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { isUserOnline, formatLastSeenHalifax, formatDateTimeHalifax } from '@/src/lib/presence';
import { User, Task, Session } from '@/src/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  Mail, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  BarChart3,
  Timer,
  Phone
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

export const EmployeeDetail = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId || !user) {
      if (!employeeId) setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      try {
        const docRef = doc(db, 'users', employeeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as User;
          // Security check: if admin, must be their employee
          if (user.role === 'admin' && data.adminId !== user.uid) {
            toast.error("Unauthorized access");
            navigate('/admin/employees');
            return;
          }
          setEmployee({ uid: docSnap.id, ...data } as User);
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
        setLoading(false);
      }
    };

    fetchEmployee();

    // Real-time tasks for this employee - removed limit and orderBy to ensure all tasks show up
    let qTasks;
    if (user.role === 'admin') {
      qTasks = query(
        collection(db, 'tasks'),
        where('adminId', '==', user.uid),
        where('assignedTo', '==', employeeId)
      );
    } else {
      qTasks = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', employeeId)
      );
    }
    
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const allTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      const sortedTasks = allTasks.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setTasks(sortedTasks);
    });

    // Real-time sessions for this employee
    let qSessions;
    if (user.role === 'admin') {
      qSessions = query(
        collection(db, 'sessions'),
        where('adminId', '==', user.uid),
        where('userId', '==', employeeId),
        orderBy('startTime', 'desc'),
        limit(10)
      );
    } else {
      qSessions = query(
        collection(db, 'sessions'),
        where('userId', '==', employeeId),
        orderBy('startTime', 'desc'),
        limit(10)
      );
    }
    const unsubSessions = onSnapshot(qSessions, (snap) => {
      setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
    });

    return () => {
      unsubTasks();
      unsubSessions();
    };
  }, [employeeId]);

  if (loading) return <div className="p-8 text-center">Loading employee data...</div>;
  if (!employee) return <div className="p-8 text-center text-red-500">Employee not found.</div>;

  const completedTasks = tasks.filter(t => t.status === 'submitted').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;

  // Mock performance data for the chart
  const performanceData = [
    { day: 'Mon', tasks: 4, hours: 6 },
    { day: 'Tue', tasks: 6, hours: 8 },
    { day: 'Wed', tasks: 3, hours: 5 },
    { day: 'Thu', tasks: 7, hours: 9 },
    { day: 'Fri', tasks: 5, hours: 7 },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/employees')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
              <AvatarImage src={employee.photoURL} />
              <AvatarFallback className="text-xl">{employee.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{employee.name}</h1>
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Mail className="w-3 h-3" />
                {employee.email}
                <span className="mx-1">•</span>
                <Badge variant="secondary" className="capitalize text-[10px] py-0">{employee.role}</Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isUserOnline(employee) ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
            <span className="text-sm font-bold capitalize text-zinc-900">{isUserOnline(employee) ? 'Online' : 'Offline'}</span>
          </div>
          {!isUserOnline(employee) && (
            <span className="text-xs text-zinc-500 mt-1">
              Last seen: {formatLastSeenHalifax(employee.lastSeen)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Performance */}
        <div className="lg:col-span-2 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-zinc-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Completed</span>
                </div>
                <div className="text-2xl font-bold">{completedTasks}</div>
                <p className="text-xs text-zinc-500 mt-1">Tasks finished</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Timer className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active</span>
                </div>
                <div className="text-2xl font-bold">{inProgressTasks}</div>
                <p className="text-xs text-zinc-500 mt-1">Tasks in progress</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Efficiency</span>
                </div>
                <div className="text-2xl font-bold">92%</div>
                <p className="text-xs text-zinc-500 mt-1">Performance score</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Weekly Performance</CardTitle>
              <CardDescription>Tasks completed vs hours active</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7' }} />
                    <Area type="monotone" dataKey="tasks" stroke="#18181b" fill="#18181b" fillOpacity={0.05} strokeWidth={2} />
                    <Area type="monotone" dataKey="hours" stroke="#71717a" fill="#71717a" fillOpacity={0.05} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        task.status === 'submitted' ? 'bg-emerald-50 text-emerald-600' :
                        task.status === 'in-progress' ? 'bg-amber-50 text-amber-600' : 'bg-zinc-50 text-zinc-400'
                      }`}>
                        {task.status === 'submitted' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{task.title}</p>
                        <p className="text-xs text-zinc-500">
                          {task.createdAt?.toDate ? task.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {task.status}
                    </Badge>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-center py-8 text-zinc-500 text-sm">No tasks assigned yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Activity Log & Info */}
        <div className="space-y-8">
          {/* Activity Log */}
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sessions.map((session) => (
                  <div key={session.id} className="relative pl-6 border-l border-zinc-100 last:border-0 pb-6 last:pb-0">
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-zinc-200" />
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      {session.startTime?.toDate ? session.startTime.toDate().toLocaleDateString() : 'Today'}
                    </p>
                    <p className="text-sm font-medium text-zinc-900">Work Session Started</p>
                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {session.startTime?.toDate ? session.startTime.toDate().toLocaleTimeString() : ''}
                      {session.endTime && ` - ${session.endTime.toDate().toLocaleTimeString()}`}
                    </p>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-center py-8 text-zinc-500 text-sm">No recent activity recorded.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="border-zinc-200 shadow-sm bg-zinc-900 text-white">
            <CardHeader>
              <CardTitle className="text-lg text-white">Employee Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Joined Date</p>
                  <p className="text-sm">Oct 12, 2025</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <Phone className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Phone Number</p>
                  <p className="text-sm">{employee.phoneNumber || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <Clock className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Last Active</p>
                  <p className="text-sm">
                    {employee.lastSeen ? formatDateTimeHalifax(employee.lastSeen) : 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
};
