import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/src/components/shared/dialogs/ConfirmDialog';
import { deleteProject, getProjectDetails, listProjects, updateProject, assignClientToProject } from '@/src/api/endpoints/projects.api';
import type { UpdateProjectRequest, ProjectDetails } from '@/src/api/endpoints/projects.api';
import { listClients, createClient } from '@/src/api/endpoints/clients.api';
import { listEmployees, createInvite } from '@/src/api/endpoints/employees.api';
import { createTask } from '@/src/api/endpoints/tasks.api';
import { useAuth } from '@/src/App';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { Project } from '@/src/types';
import { Edit2, Eye, FolderKanban, Plus, Search, Trash2, Check, Mail, Building2, Phone, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectCreationWizard } from './ProjectCreationWizard';

type EditStep = 'details' | 'client' | 'employees';

type ProjectFormState = {
  title: string;
  description: string;
  status: string;
};

type TaskFormState = {
  title: string;
  description: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
};

type CreateClientFormState = {
  name: string;
  email: string;
  password: string;
  phone: string;
  company: string;
  status: string;
};

type CreateEmployeeFormState = {
  email: string;
  name: string;
  inviteType: 'invitation' | 'password';
  password: string;
};

const initialFormState = (): ProjectFormState => ({
  title: '',
  description: '',
  status: 'active',
});

const initialTaskFormState = (): TaskFormState => ({
  title: '',
  description: '',
  assignedTo: '',
  priority: 'medium',
  dueDate: '',
});

const initialCreateClientFormState = (): CreateClientFormState => ({
  name: '',
  email: '',
  password: '',
  phone: '',
  company: '',
  status: 'active',
});

const initialCreateEmployeeFormState = (): CreateEmployeeFormState => ({
  email: '',
  name: '',
  inviteType: 'invitation',
  password: '',
});

const editSteps: { id: EditStep; label: string; description: string }[] = [
  { id: 'details', label: 'Project Details', description: 'Basic info' },
  { id: 'client', label: 'Assign Client', description: 'Optional' },
  { id: 'employees', label: 'Create Task', description: 'Task assignment' },
];

const toProjectUpdatePayload = (form: ProjectFormState): UpdateProjectRequest => {
  const payload: UpdateProjectRequest = {
    title: form.title.trim(),
  };

  if (form.description.trim()) {
    payload.description = form.description.trim();
  }

  if (form.status.trim()) {
    payload.status = form.status.trim();
  }

  return payload;
};

const formatProjectDate = (value: Project['createdAt']) => {
  if (!value) return 'N/A';

  const date =
    typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function'
      ? value.toDate()
      : new Date(value);

  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
};

const getProjectStatusClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700';
    case 'archived':
      return 'bg-zinc-100 text-zinc-600';
    case 'paused':
      return 'bg-amber-100 text-amber-700';
    case 'completed':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-zinc-100 text-zinc-700';
  }
};

export const ProjectManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editStep, setEditStep] = useState<EditStep>('details');
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<ProjectFormState>(initialFormState);
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskFormState);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [createClientForm, setCreateClientForm] = useState<CreateClientFormState>(initialCreateClientFormState);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [createEmployeeForm, setCreateEmployeeForm] = useState<CreateEmployeeFormState>(initialCreateEmployeeFormState);
  const [nextEditStep, setNextEditStep] = useState<EditStep | null>(null);

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects({ scope: user?.role ?? 'anonymous' }),
    queryFn: listProjects,
    enabled: !!user,
  });

  const projectDetailsQuery = useQuery({
    queryKey: ['project-details', viewingProject?.id],
    queryFn: () => viewingProject ? getProjectDetails(viewingProject.id) : null,
    enabled: !!viewingProject,
  });

  const editProjectDetailsQuery = useQuery({
    queryKey: ['edit-project-details', editingProject?.id],
    queryFn: () => editingProject ? getProjectDetails(editingProject.id) : null,
    enabled: !!editingProject && isEditing,
  });

  const clientsQuery = useQuery({
    queryKey: queryKeys.clients(),
    queryFn: listClients,
    enabled: !!user && isEditing && editStep === 'client',
  });

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees,
    queryFn: listEmployees,
    enabled: !!user && isEditing && editStep === 'employees',
  });

  const resetForm = () => {
    setForm(initialFormState());
    setTaskForm(initialTaskFormState());
    setSelectedClientId(null);
    setEditStep('details');
    setEditingProject(null);
    setIsEditing(false);
    setNextEditStep(null);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProjectRequest }) => updateProject(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Project updated successfully');
      if (nextEditStep) {
        setEditStep(nextEditStep);
        setNextEditStep(null);
      } else {
        resetForm();
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to update project', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Project deleted successfully');
      setDeletingProject(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete project', { description: error.message });
    },
  });

  const assignClientMutation = useMutation({
    mutationFn: (clientId: string) => assignClientToProject(editingProject!.id, clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-project-details', editingProject?.id] });
      setEditStep('employees');
      toast.success('Client assigned successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to assign client', { description: error.message });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: Parameters<typeof createTask>[0]) => createTask(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks({}) });
      queryClient.invalidateQueries({ queryKey: ['edit-project-details', editingProject?.id] });
      toast.success('Task created successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Failed to create task', { description: error.message });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: (clientData: Parameters<typeof createClient>[0]) => createClient(clientData),
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients() });
      toast.success('Client created successfully');
      setShowCreateClient(false);
      setCreateClientForm(initialCreateClientFormState());
      setSelectedClientId(newClient.id);
      if (editingProject) {
        handleSelectClient(newClient.id);
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to create client', { description: error.message });
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (inviteData: Parameters<typeof createInvite>[0]) => createInvite(inviteData as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
      toast.success('Employee invited successfully');
      setShowCreateEmployee(false);
      setCreateEmployeeForm(initialCreateEmployeeFormState());
    },
    onError: (error: Error) => {
      toast.error('Failed to invite employee', { description: error.message });
    },
  });

  const handleUpdateProject = async (e: React.FormEvent, nextStep?: EditStep) => {
    e.preventDefault();

    if (form.title.trim().length < 3) {
      toast.error('Project title must be at least 3 characters');
      return;
    }

    if (!editingProject) return;

    if (nextStep) {
      setNextEditStep(nextStep);
    }

    await updateMutation.mutateAsync({
      id: editingProject.id,
      body: toProjectUpdatePayload(form),
    });
  };

  const handleSelectClient = async (clientId: string) => {
    await assignClientMutation.mutateAsync(clientId);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    if (!taskForm.assignedTo) {
      toast.error('Please assign the task to an employee');
      return;
    }

    if (!editingProject) return;

    const assignedUser = employeesQuery.data?.find((u) => u.uid === taskForm.assignedTo);
    const clientEmail = selectedClientId
      ? clientsQuery.data?.find((c) => c.id === selectedClientId)?.email
      : undefined;

    const dueDate = taskForm.dueDate
      ? new Date(`${taskForm.dueDate}T00:00:00`).toISOString()
      : undefined;

    await createTaskMutation.mutateAsync({
      projectId: editingProject.id,
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || undefined,
      assignedTo: taskForm.assignedTo,
      assignedToName: assignedUser?.name || undefined,
      clientEmail: clientEmail,
      priority: taskForm.priority,
      dueDate: dueDate,
    });
  };

  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createClientForm.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    if (!createClientForm.email.trim()) {
      toast.error('Client email is required');
      return;
    }

    await createClientMutation.mutateAsync({
      name: createClientForm.name.trim(),
      email: createClientForm.email.trim(),
      password: createClientForm.password.trim() || undefined,
      phone: createClientForm.phone.trim() || undefined,
      company: createClientForm.company.trim() || undefined,
      status: createClientForm.status.trim(),
    });
  };

  const handleCreateEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createEmployeeForm.name.trim()) {
      toast.error('Employee name is required');
      return;
    }

    if (!createEmployeeForm.email.trim()) {
      toast.error('Employee email is required');
      return;
    }

    if (createEmployeeForm.inviteType === 'password' && !createEmployeeForm.password.trim()) {
      toast.error('Password is required when using password mode');
      return;
    }

    await createEmployeeMutation.mutateAsync({
      email: createEmployeeForm.email.trim(),
      role: 'employee',
      name: createEmployeeForm.name.trim(),
      type: createEmployeeForm.inviteType,
      password: createEmployeeForm.password.trim() || undefined,
    } as any);
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    await deleteMutation.mutateAsync(deletingProject.id);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      title: project.title,
      description: project.description ?? '',
      status: project.status || 'active',
    });
    setIsEditing(true);
  };

  const projects = projectsQuery.data ?? [];
  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const normalizedSearch = searchTerm.toLowerCase();
        return (
          project.title.toLowerCase().includes(normalizedSearch) ||
          (project.description ?? '').toLowerCase().includes(normalizedSearch) ||
          project.status.toLowerCase().includes(normalizedSearch) ||
          project.createdBy.toLowerCase().includes(normalizedSearch)
        );
      }),
    [projects, searchTerm],
  );

  const isSaving = updateMutation.isPending;
  const loadingError = projectsQuery.error as Error | null;

  return (
    <div className="p-4 lg:p-8 bg-zinc-50/50 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Projects</h1>
          <p className="text-zinc-500 text-sm">Manage agency projects and track their current lifecycle state.</p>
        </div>

        <Button
          onClick={() => setIsWizardOpen(true)}
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </Button>

        <ProjectCreationWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} />
      </div>

      <Card className="rounded-2xl border-zinc-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/30 p-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search by title, description, status, or creator..."
              className="pl-10 h-10 rounded-xl bg-white border-zinc-200 focus-visible:ring-zinc-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-b border-zinc-100">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-6 h-12">Project</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12">Description</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12">Created</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12">Created By</TableHead>
                <TableHead className="text-right h-12 px-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                      <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
                      <span className="text-xs font-medium">Loading projects...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadingError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                      <p className="text-sm font-bold text-zinc-900">Failed to load projects</p>
                      <p className="text-xs max-w-[260px]">{loadingError.message}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-zinc-50/50 transition-colors border-b border-zinc-50">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0 border border-zinc-200">
                          <FolderKanban className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-900 truncate">{project.title}</div>
                          {/* <div className="text-xs text-zinc-500 font-medium truncate">{project.id}</div> */}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-zinc-600 line-clamp-2 max-w-md">{project.description?.trim() || 'No description provided.'}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`rounded-xl px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border-none shadow-sm ${getProjectStatusClass(project.status)}`}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-bold text-zinc-900">{formatProjectDate(project.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-medium text-zinc-600 break-all">{ 'Unknown'}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-zinc-400 hover:text-brand hover:bg-brand/5"
                          onClick={() => setViewingProject(project)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100" onClick={() => handleEdit(project)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeletingProject(project)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-3 text-zinc-400">
                      <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        <FolderKanban className="w-8 h-8 text-zinc-200" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-zinc-900">No projects found</p>
                        <p className="text-xs max-w-[240px] mx-auto">Create a project or adjust your search to find existing work.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewingProject} onOpenChange={(open) => !open && setViewingProject(null)}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-xl rounded-2xl border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold truncate">{viewingProject?.title}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Detailed project information and related data.</DialogDescription>
          </DialogHeader>

          {projectDetailsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
            </div>
          ) : projectDetailsQuery.data ? (
            <div className="space-y-5 text-sm sm:text-base">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</p>
                  <Badge className={`mt-2 rounded-xl px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border-none shadow-sm ${getProjectStatusClass(projectDetailsQuery.data.status)}`}>
                    {projectDetailsQuery.data.status}
                  </Badge>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Created</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">{formatProjectDate(projectDetailsQuery.data.createdAt)}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Created By</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900 break-all">{projectDetailsQuery.data.createdBy || 'Unknown'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Description</p>
                <p className="mt-2 text-sm leading-6 text-zinc-700 whitespace-pre-wrap">
                  {projectDetailsQuery.data.description?.trim() || 'No description provided.'}
                </p>
              </div>

              {projectDetailsQuery.data.clients.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Clients ({projectDetailsQuery.data.clients.length})</p>
                  <div className="mt-2 space-y-2">
                    {projectDetailsQuery.data.clients.map((client) => (
                      <div key={client.id} className="flex items-center gap-3 p-2 rounded-lg bg-white border border-zinc-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">{client.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{client.email}</p>
                        </div>
                        <Badge className="rounded-lg bg-emerald-100 text-emerald-700 border-none text-[10px] font-bold">
                          {client.status || 'active'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {projectDetailsQuery.data.tasks.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tasks ({projectDetailsQuery.data.tasks.length})</p>
                  <div className="mt-2 space-y-2">
                    {projectDetailsQuery.data.tasks.map((task) => (
                      <div key={task.id} className="text-sm text-zinc-700 flex items-start gap-2">
                        <span className="text-zinc-400 mt-0.5">•</span>
                        <span>{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditing} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="w-[95vw] sm:w-full md:max-w-[70%] max-h-[90vh] min-h-0 overflow-hidden flex flex-col p-0 rounded-2xl border-zinc-200">
          <DialogHeader className="p-4 sm:p-6 border-b border-zinc-100 bg-zinc-50/50">
            <DialogTitle className="text-lg sm:text-xl font-bold">Edit Project</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Update project details, assign clients, and create tasks.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
            {/* Horizontal Stepper - Mobile Only */}
            <div className="md:hidden border-b border-zinc-100 bg-zinc-50/50 p-4 overflow-x-auto">
              <div className="flex gap-2">
                {editSteps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => {
                      const currentStepIndex = editSteps.findIndex((s) => s.id === editStep);
                      if (currentStepIndex >= index) {
                        setEditStep(step.id);
                      }
                    }}
                    disabled={editSteps.findIndex((s) => s.id === editStep) < index}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                      editStep === step.id
                        ? 'bg-zinc-900 text-white'
                        : editSteps.findIndex((s) => s.id === editStep) > index
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-zinc-200 text-zinc-600 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        editStep === step.id
                          ? 'bg-white text-zinc-900'
                          : editSteps.findIndex((s) => s.id === editStep) > index
                            ? 'bg-emerald-700 text-white'
                            : 'bg-zinc-400'
                      }`}
                    >
                      {editSteps.findIndex((s) => s.id === editStep) > index ? <Check className="w-3 h-3" /> : index + 1}
                    </div>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Stepper - Desktop Only */}
            <div className="hidden md:block w-48 border-r border-zinc-100 bg-zinc-50/50 p-6 overflow-y-auto">
              <div className="space-y-4">
                {editSteps.map((step, index) => (
                  <div key={step.id}>
                    <button
                      onClick={() => {
                        const currentStepIndex = editSteps.findIndex((s) => s.id === editStep);
                        if (currentStepIndex >= index) {
                          setEditStep(step.id);
                        }
                      }}
                      disabled={editSteps.findIndex((s) => s.id === editStep) < index}
                      className={`w-full text-left transition-all ${
                        editStep === step.id
                          ? 'opacity-100'
                          : editSteps.findIndex((s) => s.id === editStep) > index
                            ? 'opacity-75 hover:opacity-100 cursor-pointer'
                            : 'opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                            editStep === step.id
                              ? 'bg-zinc-900 text-white'
                              : editSteps.findIndex((s) => s.id === editStep) > index
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {editSteps.findIndex((s) => s.id === editStep) > index ? <Check className="w-4 h-4" /> : index + 1}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-xs font-bold text-zinc-900 leading-snug">{step.label}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{step.description}</p>
                        </div>
                      </div>
                    </button>

                    {index < editSteps.length - 1 && (
                      <div className="ml-4 h-8 border-l-2 border-zinc-200 my-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900">{editSteps.find((s) => s.id === editStep)?.label}</h3>
              </div>

              {editStep === 'details' && (
                <form id="edit-details-form" onSubmit={(e) => handleUpdateProject(e, 'client')} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Project Title</Label>
                    <Input
                      placeholder="e.g. Q3 Paid Media Launch"
                      value={form.title}
                      onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                      className="rounded-xl border-zinc-200 h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</Label>
                    <Textarea
                      placeholder="Optional project notes..."
                      value={form.description}
                      onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                      className="rounded-xl border-zinc-200 min-h-32"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</Label>
                    <Select value={form.status} onValueChange={(value) => value && setForm((current) => ({ ...current, status: value }))}>
                      <SelectTrigger className="rounded-xl border-zinc-200 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditStep('client')}
                      size="sm"
                    >
                      Skip
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      size="sm"
                    >
                      {isSaving ? 'Saving...' : 'Save & Next →'}
                    </Button>
                  </div>
                </form>
              )}

              {editStep === 'client' && (
                <div className="space-y-4">
                  {editProjectDetailsQuery.data?.clients && editProjectDetailsQuery.data.clients.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 mb-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Current Clients</p>
                      <div className="space-y-2">
                        {editProjectDetailsQuery.data.clients.map((client) => (
                          <div key={client.id} className="flex items-center gap-3 p-2 rounded-lg bg-white border border-zinc-100">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-zinc-900 truncate">{client.name}</p>
                              <p className="text-xs text-zinc-500 truncate">{client.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showCreateClient ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Create New Client</p>
                      <form onSubmit={handleCreateClientSubmit} className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Name *</Label>
                          <Input
                            placeholder="Client name"
                            value={createClientForm.name}
                            onChange={(e) => setCreateClientForm((current) => ({ ...current, name: e.target.value }))}
                            className="rounded-lg border-zinc-200 h-9 text-sm"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Email *</Label>
                          <Input
                            type="email"
                            placeholder="client@example.com"
                            value={createClientForm.email}
                            onChange={(e) => setCreateClientForm((current) => ({ ...current, email: e.target.value }))}
                            className="rounded-lg border-zinc-200 h-9 text-sm"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Password</Label>
                          <Input
                            type="password"
                            placeholder="Password"
                            value={createClientForm.password}
                            onChange={(e) => setCreateClientForm((current) => ({ ...current, password: e.target.value }))}
                            className="rounded-lg border-zinc-200 h-9 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Phone</Label>
                            <Input
                              placeholder="Phone"
                              value={createClientForm.phone}
                              onChange={(e) => setCreateClientForm((current) => ({ ...current, phone: e.target.value }))}
                              className="rounded-lg border-zinc-200 h-9 text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Company</Label>
                            <Input
                              placeholder="Company"
                              value={createClientForm.company}
                              onChange={(e) => setCreateClientForm((current) => ({ ...current, company: e.target.value }))}
                              className="rounded-lg border-zinc-200 h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowCreateClient(false)}
                            className="flex-1 rounded-lg h-9 text-sm"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createClientMutation.isPending}
                            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg h-9 text-sm"
                          >
                            {createClientMutation.isPending ? 'Creating...' : 'Create & Assign'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateClient(true)}
                      className="w-full rounded-xl h-11 border-zinc-200 text-zinc-900"
                    >
                      ＋ Create New Client
                    </Button>
                  )}

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Assign New Client</p>
                    {clientsQuery.isLoading ? (
                      <div className="flex flex-col items-center gap-2 text-zinc-400 py-8">
                        <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
                        <span className="text-xs font-medium">Loading clients...</span>
                      </div>
                    ) : clientsQuery.error ? (
                      <div className="text-center py-8 text-zinc-400">
                        <p className="text-sm font-bold text-zinc-900">Failed to load clients</p>
                      </div>
                    ) : (clientsQuery.data ?? []).length > 0 ? (
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-2">
                          {clientsQuery.data?.map((client) => (
                            <button
                              key={client.id}
                              onClick={() => handleSelectClient(client.id)}
                              disabled={assignClientMutation.isPending}
                              className="w-full text-left p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-zinc-900 truncate">{client.name}</p>
                                  <div className="mt-2 space-y-1 text-xs text-zinc-600">
                                    {client.email && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{client.email}</span>
                                      </div>
                                    )}
                                    {client.company && (
                                      <div className="flex items-center gap-2">
                                        <Building2 className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{client.company}</span>
                                      </div>
                                    )}
                                    {client.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{client.phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0 ml-4" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 text-zinc-400">
                        <p className="text-sm font-medium">No clients available</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditStep('details')}
                      className="flex-1 rounded-xl h-11"
                    >
                      ← Back
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditStep('employees')}
                      className="flex-1 rounded-xl h-11"
                    >
                      Skip
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setEditStep('employees')}
                      className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-11"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}

              {editStep === 'employees' && (
                <div className="space-y-4">
                  {editProjectDetailsQuery.data?.tasks && editProjectDetailsQuery.data.tasks.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 mb-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Current Tasks</p>
                      <div className="space-y-2">
                        {editProjectDetailsQuery.data.tasks.map((task) => (
                          <div key={task.id} className="text-sm text-zinc-700 flex items-start gap-2">
                            <span className="text-zinc-400 mt-0.5">•</span>
                            <span>{task.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Create New Task</p>
                    <form id="create-task-form" onSubmit={handleCreateTask} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Task Title *</Label>
                        <Input
                          placeholder="e.g., Initial Campaign Research"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                          className="rounded-xl border-zinc-200 h-11"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</Label>
                        <Textarea
                          placeholder="Task details, expected output, or execution notes..."
                          value={taskForm.description}
                          onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="rounded-xl border-zinc-200 min-h-20"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Assign To *</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setShowCreateEmployee(!showCreateEmployee)}
                              className="h-6 px-2 text-xs rounded-lg text-zinc-500 hover:text-zinc-700"
                            >
                              ＋ Invite
                            </Button>
                          </div>
                          <Select
                            value={taskForm.assignedTo}
                            onValueChange={(value) => setTaskForm((prev) => ({ ...prev, assignedTo: value }))}
                          >
                            <SelectTrigger className="rounded-xl border-zinc-200 h-11">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {employeesQuery.isLoading ? (
                                <div className="p-2 text-xs text-zinc-500">Loading employees...</div>
                              ) : (
                                <>
                                  {(employeesQuery.data ?? [])
                                    .filter((e) => e.role === 'employee' && !e.isDisabled)
                                    .map((emp) => (
                                      <SelectItem key={emp.uid} value={emp.uid}>
                                        {emp.name}
                                      </SelectItem>
                                    ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Priority</Label>
                          <Select
                            value={taskForm.priority}
                            onValueChange={(value: 'low' | 'medium' | 'high') => setTaskForm((prev) => ({ ...prev, priority: value }))}
                          >
                            <SelectTrigger className="rounded-xl border-zinc-200 h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Due Date</Label>
                        <Input
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                          className="rounded-xl border-zinc-200 h-11"
                        />
                      </div>

                      {showCreateEmployee && (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Invite New Employee</p>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 rounded-lg bg-white border border-zinc-100 p-2">
                              <button
                                type="button"
                                onClick={() => setCreateEmployeeForm((prev) => ({ ...prev, inviteType: 'invitation' }))}
                                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
                                  createEmployeeForm.inviteType === 'invitation'
                                    ? 'bg-zinc-900 text-white'
                                    : 'text-zinc-600 hover:bg-zinc-50'
                                }`}
                              >
                                Invitation
                              </button>
                              <button
                                type="button"
                                onClick={() => setCreateEmployeeForm((prev) => ({ ...prev, inviteType: 'password' }))}
                                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
                                  createEmployeeForm.inviteType === 'password'
                                    ? 'bg-zinc-900 text-white'
                                    : 'text-zinc-600 hover:bg-zinc-50'
                                }`}
                              >
                                Password
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Name *</Label>
                            <Input
                              placeholder="Employee name"
                              value={createEmployeeForm.name}
                              onChange={(e) => setCreateEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                              className="rounded-lg border-zinc-200 h-9 text-sm"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Email *</Label>
                            <Input
                              type="email"
                              placeholder="employee@example.com"
                              value={createEmployeeForm.email}
                              onChange={(e) => setCreateEmployeeForm((prev) => ({ ...prev, email: e.target.value }))}
                              className="rounded-lg border-zinc-200 h-9 text-sm"
                              required
                            />
                          </div>

                          {createEmployeeForm.inviteType === 'password' && (
                            <div className="space-y-1">
                              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Password *</Label>
                              <Input
                                type="password"
                                placeholder="Set password"
                                value={createEmployeeForm.password}
                                onChange={(e) => setCreateEmployeeForm((prev) => ({ ...prev, password: e.target.value }))}
                                className="rounded-lg border-zinc-200 h-9 text-sm"
                                required
                              />
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setShowCreateEmployee(false)}
                              className="flex-1 rounded-lg h-9 text-sm"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={handleCreateEmployeeSubmit}
                              disabled={createEmployeeMutation.isPending}
                              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg h-9 text-sm"
                            >
                              {createEmployeeMutation.isPending ? 'Creating...' : createEmployeeForm.inviteType === 'invitation' ? 'Send Invite' : 'Create Account'}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setEditStep('client')}
                          className="flex-1 rounded-xl h-11"
                        >
                          ← Back
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={resetForm}
                          className="flex-1 rounded-xl h-11"
                        >
                          Skip
                        </Button>
                        <Button
                          type="submit"
                          disabled={createTaskMutation.isPending || !taskForm.title.trim() || !taskForm.assignedTo}
                          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-11"
                        >
                          {createTaskMutation.isPending ? 'Creating...' : 'Done'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteProject}
        isLoading={deleteMutation.isPending}
        title="Delete Project?"
        description={`Are you sure you want to delete "${deletingProject?.title}"? This action cannot be undone.`}
      />
    </div>
  );
};
