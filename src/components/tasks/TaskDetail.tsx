import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/App';
import { Task, User, TaskPriority, TaskStatus } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Save, Clock, ExternalLink, History, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { TaskChat } from './TaskChat';
import { getTask, updateTask } from '@/src/api/endpoints/tasks.api';
import { listEmployees } from '@/src/api/endpoints/employees.api';

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

export const TaskDetail = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [dueDate, setDueDate] = useState('');
  const [summary, setSummary] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const emailId = user?.email?.replace(/\./g, '_');
  const isAssignee = task?.assignedTo === user?.uid || task?.assignedTo === user?.email || task?.assignedTo === emailId;
  const canEditSubmission = isAdmin || isAssignee;

  useEffect(() => {
    if (!taskId || !user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [taskData, employeeData] = await Promise.all([
          getTask(taskId),
          isAdmin ? listEmployees() : Promise.resolve([] as User[]),
        ]);

        if (cancelled) return;

        setTask(taskData);
        setTitle(taskData.title);
        setDescription(taskData.description || '');
        setAssignedTo(taskData.assignedTo);
        setPriority(taskData.priority);
        setStatus(taskData.status);
        setDueDate(toDateInputValue(taskData.dueDate));
        setSummary(taskData.submission?.summary || '');
        setProofUrl(taskData.submission?.proofUrl || '');
        setAllUsers(employeeData.filter((employee) => employee.role === 'employee'));
      } catch (error: any) {
        if (cancelled) return;
        console.error("Error fetching task:", error);
        toast.error("Failed to load task details", {
          description: error?.message || 'Please try again.',
        });
        navigate(isAdmin ? '/admin/tasks' : '/employee/tasks');
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
  }, [taskId, isAdmin, user?.uid, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !user) return;

    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};

      if (isAdmin) {
        updates.title = title;
        updates.description = description;
        updates.assignedTo = assignedTo;
        updates.assignedToName = allUsers.find((item) => item.uid === assignedTo)?.name || task.assignedToName || null;
        updates.priority = priority;
        updates.dueDate = toApiDateTime(dueDate);
        updates.status = status;
      }

      // Both admin and employee can update submission if it's relevant
      // But user request says employee can edit submission message and link
      if (!isAdmin || (isAdmin && status === 'submitted')) {
        updates.submission = {
          summary,
          proofUrl: proofUrl || '',
        };
        if (!isAdmin && task.status !== 'submitted' && summary.trim()) {
          updates.status = 'submitted';
        }
      }

      const updatedTask = await updateTask(task.id, updates as Partial<Task>);
      setTask(updatedTask);
      setTitle(updatedTask.title);
      setDescription(updatedTask.description || '');
      setAssignedTo(updatedTask.assignedTo);
      setPriority(updatedTask.priority);
      setStatus(updatedTask.status);
      setDueDate(toDateInputValue(updatedTask.dueDate));
      setSummary(updatedTask.submission?.summary || '');
      setProofUrl(updatedTask.submission?.proofUrl || '');
      toast.success('Task updated successfully');
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'high': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium">Loading task details...</p>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Task Details</h2>
            <p className="text-zinc-500">View and manage task information.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>General Information</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {task.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  disabled={!isAdmin && !isAssignee}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Notes)</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  disabled={!isAdmin && !isAssignee}
                  className="min-h-[100px]"
                />
              </div>

              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assigned To</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers.filter(u => u.role === 'employee').map(emp => (
                          <SelectItem key={emp.uid} value={emp.uid}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                      <SelectTrigger>
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
              )}

              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date</Label>
                  <Input 
                    id="due-date" 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)} 
                    disabled={!isAdmin}
                  />
                </div>
              )}

              {isAdmin && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v: TaskStatus) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!isAdmin && (
                <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                  <UserIcon className="w-4 h-4 text-zinc-400" />
                  <div className="text-sm">
                    <span className="text-zinc-500">Assigned to:</span>
                    <span className="ml-2 font-medium text-zinc-900">{user?.name} (You)</span>
                  </div>
                </div>
              )}

              {!isAdmin && task.dueDate && (
                <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <div className="text-sm">
                    <span className="text-zinc-500">Due Date:</span>
                    <span className={`ml-2 font-medium ${(toDate(task.dueDate) ?? new Date(0)) < new Date() && task.status !== 'submitted' ? 'text-rose-600' : 'text-zinc-900'}`}>
                      {toDate(task.dueDate)?.toLocaleDateString() || 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle>Work Submission</CardTitle>
              <CardDescription>
                {isAdmin ? 'Review the work submitted for this task.' : 'Provide details about your completed work.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="summary">Submission Message</Label>
                <Textarea 
                  id="summary" 
                  placeholder="Describe what you completed..." 
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={!canEditSubmission}
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof">Proof Link</Label>
                <Input 
                  id="proof" 
                  type="url" 
                  placeholder="https://..." 
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  disabled={!canEditSubmission}
                />
                {proofUrl && (
                  <a 
                    href={proofUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    Open Link <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            {(isAdmin || canEditSubmission) && (
              <Button type="submit" disabled={saving} className="bg-zinc-900 min-w-[120px]">
                {saving ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </form>

        <TaskChat taskId={task.id} assignedTo={task.assignedTo} />

        {task.editHistory && task.editHistory.length > 0 && (
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4" />
                Task Edit History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {task.editHistory.map((edit, i) => {
                  const editor = allUsers.find(u => u.uid === edit.editedBy);
                  return (
                    <div key={i} className="text-xs flex flex-col gap-1 border-b border-zinc-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-zinc-900">Changed from "{edit.previousTitle}"</span>
                        <span className="text-zinc-400 shrink-0 ml-4">{new Date(edit.editedAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <UserIcon className="w-3 h-3" />
                        <span>Edited by {editor?.name || (edit.editedBy === user?.uid ? 'You' : 'Administrator')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
