import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/App';
import { Task, User, TaskPriority, TaskStatus, TaskSubmission, Client, Project } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, ExternalLink, Edit2, Trash2, History, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTimeHalifax, formatToHalifax } from '@/src/lib/presence';
import { TaskChat } from './TaskChat';
import { ConfirmDialog } from '@/src/components/shared/dialogs/ConfirmDialog';
import { listTasks, createTask, updateTask, deleteTask as deleteTaskRequest } from '@/src/api/endpoints/tasks.api';
import { listEmployees } from '@/src/api/endpoints/employees.api';
import { listClients } from '@/src/api/endpoints/clients.api';
import { listProjects } from '@/src/api/endpoints/projects.api';
import { listSessions } from '@/src/api/endpoints/sessions.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { startTaskWork } from '@/src/shared/tasks/start-task-work';

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && value !== null) {
    const maybeDate = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybeDate.toDate === 'function') {
      const parsed = maybeDate.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof maybeDate.seconds === 'number') {
      const parsed = new Date(maybeDate.seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateInputValue = (value: unknown): string => {
  const parsed = toDate(value);
  if (!parsed) return '';
  return parsed.toISOString().slice(0, 10);
};

const toApiDateTime = (value: string): string | undefined => {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const sortTasks = (items: Task[], sortBy: 'createdAt' | 'dueDate') => {
  return [...items].sort((a, b) => {
    if (sortBy === 'dueDate') {
      const dateA = toDate(a.dueDate)?.getTime() ?? 0;
      const dateB = toDate(b.dueDate)?.getTime() ?? 0;
      if (dateA === 0) return 1;
      if (dateB === 0) return -1;
      return dateA - dateB;
    }

    const timeA = toDate(a.createdAt)?.getTime() ?? 0;
    const timeB = toDate(b.createdAt)?.getTime() ?? 0;
    return timeB - timeA;
  });
};

const resetTaskForm = (
  setTitle: React.Dispatch<React.SetStateAction<string>>,
  setDescription: React.Dispatch<React.SetStateAction<string>>,
  setAssignedTo: React.Dispatch<React.SetStateAction<string>>,
  setPriority: React.Dispatch<React.SetStateAction<TaskPriority>>,
  setDueDate: React.Dispatch<React.SetStateAction<string>>,
  setSelectedClientEmail: React.Dispatch<React.SetStateAction<string>>,
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string>>,
) => {
  setTitle('');
  setDescription('');
  setAssignedTo('');
  setPriority('medium');
  setDueDate('');
  setSelectedClientEmail('');
  setSelectedProjectId('');
};

export const TaskManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [chattingTask, setChattingTask] = useState<Task | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [isEditingSubmission, setIsEditingSubmission] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedClientEmail, setSelectedClientEmail] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Filter state
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate'>('createdAt');

  // Submission state
  const [summary, setSummary] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions({ scope: 'me' }),
    queryFn: listSessions,
    enabled: !!user && !isAdmin,
    refetchInterval: 10_000,
  });

  const activeSession = useMemo(
    () => sessionsQuery.data?.find((session) => session.userId === user?.uid && session.status === 'active') ?? null,
    [sessionsQuery.data, user?.uid],
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [taskData, employeeData, clientData, projectData] = await Promise.all([
          listTasks(),
          isAdmin ? listEmployees() : Promise.resolve([] as User[]),
          isAdmin ? listClients() : Promise.resolve([] as Client[]),
          isAdmin ? listProjects() : Promise.resolve([] as Project[]),
        ]);

        if (cancelled) return;

        setTasks(taskData);
        setAllUsers(employeeData.filter((employee) => employee.role === 'employee'));
        setClients(clientData);
        setProjects(projectData);
      } catch (error: any) {
        if (cancelled) return;
        console.error('Failed to load task management data:', error);
        toast.error('Failed to load tasks', {
          description: error?.message || 'Please check your connection and try again.',
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, user?.uid]);

  const reloadTasks = async () => {
    const taskData = await listTasks();
    setTasks(taskData);
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus, submissionData?: TaskSubmission | null) => {
    try {
      const updatedTask = await updateTask(taskId, {
        status: newStatus,
        ...(newStatus === 'submitted' ? {
          submission: submissionData,
        } : {}),
      });
      setTasks((current) => current.map((task) => task.id === taskId ? updatedTask : task));
      toast.success(`Task ${newStatus === 'submitted' ? 'submitted' : 'marked as ' + newStatus}`);
      setSubmittingTask(null);
      setIsEditingSubmission(false);
      setSummary('');
      setProofUrl('');
    } catch (error: any) {
      console.error('Task status update error:', error);
      toast.error('Failed to update task status', {
        description: error.message?.includes('permission-denied') 
          ? 'You do not have permission to update this task.' 
          : 'A network error occurred. Please try again.'
      });
    }
  };

  const handleStartTask = async (task: Task) => {
    if (startingTaskId) return;

    if (activeSession?.taskId && activeSession.taskId !== task.id) {
      toast.error('Another task session is already active', {
        description: 'Stop the current session before starting a different task.',
      });
      return;
    }

    setStartingTaskId(task.id);
    try {
      const result = await startTaskWork(task, { activeSession });
      await reloadTasks();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks({ assigned: 'me' }) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks({ dashboard: true }) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions({ scope: 'me' }) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions({ dashboard: true }) }),
      ]);
      toast.success(result.sessionStarted ? 'Task started and tracking enabled' : 'Task updated for the active session');
    } catch (error: any) {
      toast.error('Failed to start task', {
        description: error?.message || 'A network error occurred. Please try again.',
      });
    } finally {
      setStartingTaskId(null);
    }
  };

  const handleSubmitWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary) {
      toast.error('Please provide a work summary');
      return;
    }
    if (submittingTask) {
      handleUpdateStatus(submittingTask.id, 'submitted', {
        summary,
        proofUrl: proofUrl || ''
      });
    }
  };

  const handleEditSubmission = (task: Task) => {
    setSubmittingTask(task);
    setIsEditingSubmission(true);
    setSummary(task.submission?.summary || '');
    setProofUrl(task.submission?.proofUrl || '');
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !title || !assignedTo) return;
    const assignedUser = allUsers.find((u) => u.uid === assignedTo);

    try {
      const updatedTask = await updateTask(editingTask.id, {
        projectId: selectedProjectId || null,
        title,
        description,
        assignedTo,
        assignedToName: assignedUser?.name || null,
        priority,
        dueDate: toApiDateTime(dueDate),
        clientEmail: selectedClientEmail || null,
      });
      setTasks((current) => current.map((task) => task.id === editingTask.id ? updatedTask : task));
      toast.success('Task updated successfully');
      setEditingTask(null);
      resetTaskForm(setTitle, setDescription, setAssignedTo, setPriority, setDueDate, setSelectedClientEmail, setSelectedProjectId);
    } catch (error: any) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    
    setIsDeleting(true);
    try {
      const deletedTask = await deleteTaskRequest(deletingTask.id);
      setTasks((current) => current.map((task) => task.id === deletingTask.id ? deletedTask : task));
      toast.success('Task deleted (archived)');
    } catch (error: any) {
      console.error("Deletion error:", error);
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
      setDeletingTask(null);
    }
  };

  const handleRestoreTask = async (taskId: string) => {
    try {
      const restoredTask = await updateTask(taskId, {
        isDeleted: false,
      });
      setTasks((current) => current.map((task) => task.id === taskId ? restoredTask : task));
      toast.success('Task restored successfully');
    } catch (error: any) {
      toast.error('Failed to restore task');
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setAssignedTo(task.assignedTo);
    setPriority(task.priority);
    setDueDate(toDateInputValue(task.dueDate));
    setSelectedClientEmail(task.clientEmail || '');
    setSelectedProjectId(task.projectId || '');
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !assignedTo || !selectedProjectId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const assignedUser = allUsers.find(u => u.uid === assignedTo);
    if (!assignedUser?.email) {
      toast.error('Selected employee email not found');
      return;
    }

    try {
      const createdTask = await createTask({
        projectId: selectedProjectId,
        title,
        description,
        assignedTo,
        assignedToName: assignedUser.name || undefined,
        priority,
        dueDate: toApiDateTime(dueDate),
        clientEmail: selectedClientEmail || undefined,
      });
      setTasks((current) => [createdTask, ...current]);

      toast.success('Task assigned successfully');
      setIsAdding(false);
      resetTaskForm(setTitle, setDescription, setAssignedTo, setPriority, setDueDate, setSelectedClientEmail, setSelectedProjectId);
    } catch (error: any) {
      console.error('Task creation error:', error);
      toast.error('Failed to assign task', {
        description: error?.message || 'An unexpected error occurred.',
      });
    }
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'high': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  const employeeUsers = allUsers.filter((u) => u.role === 'employee' && !u.isDisabled);
  const activeProjects = projects.filter((project) => project.status.toLowerCase() !== 'archived');
  const formatEmployeeLabel = (employee: User) => employee.name 
  const selectedAssignedToUser = employeeUsers.find((employee) => employee.uid === assignedTo);
  const selectedAssignedToLabel = selectedAssignedToUser ? formatEmployeeLabel(selectedAssignedToUser) : '';
  const selectedProject = activeProjects.find((project) => project.id === selectedProjectId) ?? projects.find((project) => project.id === selectedProjectId);
  const selectedProjectLabel = selectedProject?.title ?? '';
  const sortedTasks = useMemo(() => sortTasks(tasks, sortBy), [tasks, sortBy]);

  const filteredTasks = sortedTasks.filter(task => {
    // Handle soft-delete for employees in-memory
    if (!isAdmin && task.isDeleted) return false;

    const matchesEmployee = !isAdmin || filterEmployee === 'all' || task.assignedTo === filterEmployee;
    
    let matchesDate = true;
    if (filterDate) {
      const createdAt = toDate(task.createdAt);
      if (!createdAt) {
        matchesDate = false;
      } else {
        try {
          const taskDate = formatToHalifax(createdAt, { year: 'numeric', month: '2-digit', day: '2-digit' });
          matchesDate = taskDate === filterDate;
        } catch (e) {
          console.error("Date parsing error:", e);
          matchesDate = false;
        }
      }
    }
    
    return matchesEmployee && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isAdmin ? 'Task Management' : 'My Tasks'}
            <span className="ml-2 text-sm font-normal text-zinc-400">
              ({filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'})
            </span>
          </h2>
          <p className="text-zinc-500">
            {isAdmin ? 'Create and monitor tasks for your team.' : 'Manage and update your assigned tasks.'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Dialog open={isAdding} onOpenChange={(open) => {
              setIsAdding(open);
              if (!open) {
                resetTaskForm(setTitle, setDescription, setAssignedTo, setPriority, setDueDate, setSelectedClientEmail, setSelectedProjectId);
              }
            }}>
              <DialogTrigger render={
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Task
                </Button>
              }>
              </DialogTrigger>
              <DialogContent className="overflow-hidden border-zinc-200 p-0 sm:max-w-xl">
                <DialogHeader>
                  <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4">
                    <DialogTitle className="text-base font-semibold">Assign New Task</DialogTitle>
                    <p className="mt-1 text-xs text-zinc-500">Create a structured task with project ownership, assignee, and deadline.</p>
                  </div>
                </DialogHeader>
                <form onSubmit={handleAddTask} className="space-y-4 px-5 py-5">
                  <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="title" className="text-xs uppercase tracking-wide text-zinc-500">
                        Task Title
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Cold Calling - Real Estate"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-zinc-500">Project</Label>
                      <Select  value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select project">
                            {selectedProjectLabel || undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {activeProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="desc" className="text-xs uppercase tracking-wide text-zinc-500">
                        Description
                      </Label>
                      <Textarea
                        id="desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Task details, expected output, or execution notes..."
                        className="min-h-[96px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wide text-zinc-500">Assign To</Label>
                        <Select value={assignedTo} onValueChange={setAssignedTo}>
                          <SelectTrigger className={"w-full"}>
                            <SelectValue placeholder="Select employee">
                              {selectedAssignedToLabel || undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {employeeUsers.map((emp) => (
                              <SelectItem key={emp.uid} value={emp.uid}>
                                {formatEmployeeLabel(emp)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wide text-zinc-500">Priority</Label>
                        <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wide text-zinc-500">Target Client</Label>
                        <Select value={selectedClientEmail} onValueChange={setSelectedClientEmail}>
                            <SelectTrigger className="w-full">
                            <SelectValue placeholder="No Client (Internal)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None (Internal)</SelectItem>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.email}>
                                {client.name} ({client.company || 'Private'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="due-date" className="text-xs uppercase tracking-wide text-zinc-500">
                          Due Date
                        </Label>
                        <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                      </div>
                    </div>
                  </div>

<div className=' flex gap-4 justify-end'>
                    <div>

                        <Button type="submit" className="h-10 w-full" disabled={!activeProjects.length}>
                          {activeProjects.length ? 'Create Task' : 'Create a Project First'}
                        </Button>
                      
                    </div>
            <div>
                        <Button
                          type="button"
                          variant="ghost"

                          onClick={() => resetTaskForm(setTitle, setDescription, setAssignedTo, setPriority, setDueDate, setSelectedClientEmail, setSelectedProjectId)}
                        >
                          Reset form
                        </Button>
            </div>
</div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {isAdmin && (
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <Label className="text-xs text-zinc-500">Filter by Employee</Label>
                <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employeeUsers.map(emp => (
                      <SelectItem key={emp.uid} value={emp.uid}>{formatEmployeeLabel(emp)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs text-zinc-500">Filter by Date</Label>
              <Input 
                type="date" 
                className="h-9" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <Label className="text-xs text-zinc-500">Sort By</Label>
              <Select value={sortBy} onValueChange={(v: 'createdAt' | 'dueDate') => setSortBy(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 text-zinc-500"
              onClick={() => {
                setFilterEmployee('all');
                setFilterDate('');
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!submittingTask} onOpenChange={(open) => {
        if (!open) {
          setSubmittingTask(null);
          setIsEditingSubmission(false);
          setSummary('');
          setProofUrl('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingSubmission ? 'Edit Submission' : 'Submit Work'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitWork} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="summary">Work Summary</Label>
              <Textarea 
                id="summary" 
                placeholder="Describe what you completed..." 
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proof">Proof URL (Optional)</Label>
              <Input 
                id="proof" 
                type="url" 
                placeholder="Link to screenshot, document, or recording" 
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
              <p className="text-[10px] text-zinc-500">
                Provide a link to Google Drive, Loom, or any other proof of work.
              </p>
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
              {isEditingSubmission ? 'Update Submission' : 'Confirm Submission'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={(open) => {
        if (!open) {
          setEditingTask(null);
          resetTaskForm(setTitle, setDescription, setAssignedTo, setPriority, setDueDate, setSelectedClientEmail, setSelectedProjectId);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTask} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Task Title</Label>
              <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project">
                    {selectedProjectLabel || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select employee">
                      {selectedAssignedToLabel || undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {employeeUsers.map(emp => (
                      <SelectItem key={emp.uid} value={emp.uid}>{formatEmployeeLabel(emp)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Target Client</Label>
                <Select value={selectedClientEmail} onValueChange={setSelectedClientEmail}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No Client (Internal)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Internal)</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.email}>{client.name} ({client.company || 'Private'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-due-date">Due Date</Label>
              <Input id="edit-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Update Task</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!chattingTask} onOpenChange={(open) => !open && setChattingTask(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {chattingTask && (
            <div className="flex flex-col h-[70vh] max-h-[600px]">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
                <DialogTitle className="text-lg font-bold">{chattingTask.title}</DialogTitle>
                <p className="text-xs text-zinc-500 mt-1">Task Discussion</p>
              </div>
              <div className="flex-1 min-h-0">
                <TaskChat 
                  taskId={chattingTask.id} 
                  assignedTo={chattingTask.assignedTo} 
                  className="h-full border-0 rounded-none shadow-none" 
                  hideHeader
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyTask} onOpenChange={(open) => !open && setHistoryTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Task Edit History
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {historyTask?.editHistory && historyTask.editHistory.length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {historyTask.editHistory.map((edit, i) => {
                    const editor = allUsers.find(u => u.uid === edit.editedBy);
                    return (
                      <div key={i} className="text-sm flex flex-col gap-1 border-b border-zinc-50 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-zinc-900">Changed from "{edit.previousTitle}"</span>
                          <span className="text-[10px] text-zinc-400 shrink-0 ml-4">{new Date(edit.editedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <div className="w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center text-[8px] font-bold">
                            {editor?.name?.[0] || '?'}
                          </div>
                          <span>Edited by {editor?.name || (edit.editedBy === user?.uid ? 'You' : 'Administrator')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-center text-zinc-500 py-4">No edit history available for this task.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <Card key={task.id} className={`border-zinc-200 shadow-sm hover:shadow-md transition-shadow ${task.isDeleted ? 'opacity-60 bg-zinc-50 grayscale' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <Badge variant="outline" className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  {task.dueDate && (() => {
                    const due = toDate(task.dueDate);
                    if (!due) return null;
                    return (
                      <Badge variant="outline" className={due < new Date() && task.status !== 'submitted' ? "border-rose-200 text-rose-600 bg-rose-50" : "border-zinc-200 text-zinc-600"}>
                        Due: {formatToHalifax(due, { month: 'short', day: 'numeric' })}
                      </Badge>
                    );
                  })()}
                  {task.isDeleted && (
                    <Badge variant="destructive" className="text-[10px]">DELETED</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-7 h-7 text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => setChattingTask(task)}
                    title="Task Discussion"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>
                  <Badge variant="secondary" className="capitalize">
                    {task.status}
                  </Badge>
                  <div className="flex gap-1 ml-2">
                    {isAdmin ? (
                      task.isDeleted ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-7 h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                          onClick={() => handleRestoreTask(task.id)}
                          title="Restore Task"
                        >
                          <Plus className="w-3.5 h-3.5 rotate-45" />
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEditDialog(task)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => setDeletingTask(task)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )
                    ) : (
                      !task.isDeleted && (
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEditDialog(task)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
              <CardTitle className="text-lg mt-2 hover:text-zinc-600 cursor-pointer" onClick={() => navigate(`${isAdmin ? '/admin' : '/employee'}/tasks/${task.id}`)}>
                {task.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{task.description}</p>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mb-4 text-xs h-8"
                onClick={() => navigate(`${isAdmin ? '/admin' : '/employee'}/tasks/${task.id}`)}
              >
                View Full Details
              </Button>

              {!isAdmin && task.status !== 'submitted' && (
                <div className="flex gap-2 mb-4">
                  {task.status === 'pending' && (
                    <Button 
                      size="sm" 
                      className="w-full bg-zinc-900"
                      disabled={startingTaskId === task.id}
                      onClick={() => handleStartTask(task)}
                    >
                      {startingTaskId === task.id ? 'Starting...' : 'Start Task'}
                    </Button>
                  )}
                  {task.status === 'in-progress' && (
                    <Button 
                      size="sm" 
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setSubmittingTask(task)}
                    >
                      Submit Task
                    </Button>
                  )}
                </div>
              )}

              {task.submission && (
                <div className="mb-4 p-3 bg-zinc-50 rounded-lg border border-zinc-100 relative group">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-semibold text-zinc-900">Work Summary:</p>
                    {!isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleEditSubmission(task)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 line-clamp-3 mb-2">{task.submission.summary}</p>
                  {task.submission.proofUrl && (
                    <a 
                      href={task.submission.proofUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Proof File <ExternalLink className="w-2 h-2" />
                    </a>
                  )}
                </div>
              )}

              {task.editHistory && task.editHistory.length > 0 && (
                <button 
                  onClick={() => setHistoryTask(task)}
                  className="mt-2 flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <History className="w-3 h-3" />
                  <span>Edited {task.editHistory.length} times (View History)</span>
                </button>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold">
                    {task.assignedToName?.[0] || allUsers.find(e => e.uid === task.assignedTo)?.name?.[0] || '?'}
                  </div>
                  <span className="text-xs text-zinc-600">
                    {task.assignedToName || allUsers.find(e => e.uid === task.assignedTo)?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px]">
                    {task.createdAt ? formatDateTimeHalifax(task.createdAt) : 'Just now'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredTasks.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-zinc-500">No tasks found matching your filters.</p>
          </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteTask}
        isLoading={isDeleting}
        title="Archive Task"
        description={`Are you sure you want to archive "${deletingTask?.title}"? It will be hidden from the employee but kept in your records.`}
      />
      </div>
    </div>
  );
};
