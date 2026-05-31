import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createProject, assignClientToProject } from '@/src/api/endpoints/projects.api';
import { listClients, createClient } from '@/src/api/endpoints/clients.api';
import { listEmployees, createInvite } from '@/src/api/endpoints/employees.api';
import { createTask } from '@/src/api/endpoints/tasks.api';
import { useAuth } from '@/src/App';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { CreateProjectRequest } from '@/src/api/endpoints/projects.api';
import { Client, User } from '@/src/types';
import { ChevronRight, Check, Mail, Building2, Phone } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'project' | 'client' | 'task';

type ProjectCreationState = {
  project: {
    title: string;
    description: string;
  };
  client: {
    selectedId: string | null;
  };
  task: {
    title: string;
    description: string;
    assignedTo: string;
    priority: 'low' | 'medium' | 'high';
    dueDate: string;
  };
};

const initialState = (): ProjectCreationState => ({
  project: {
    title: '',
    description: '',
  },
  client: {
    selectedId: null,
  },
  task: {
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
  },
});

const steps: { id: Step; label: string; description: string }[] = [
  { id: 'project', label: 'Create Project', description: 'Project details' },
  { id: 'client', label: 'Assign Client', description: 'Optional' },
  { id: 'task', label: 'Create Task', description: 'Task assignment' },
];

const getStepIndex = (step: Step) => steps.findIndex((s) => s.id === step);

interface ProjectCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export const ProjectCreationWizard: React.FC<ProjectCreationWizardProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<Step>('project');
  const [formState, setFormState] = useState<ProjectCreationState>(initialState);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [createClientForm, setCreateClientForm] = useState<CreateClientFormState>({ name: '', email: '', password: '', phone: '', company: '', status: 'active' });
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [createEmployeeForm, setCreateEmployeeForm] = useState<CreateEmployeeFormState>({ email: '', name: '', inviteType: 'invitation', password: '' });

  const clientsQuery = useQuery({
    queryKey: queryKeys.clients(),
    queryFn: listClients,
    enabled: !!user && open,
  });

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees,
    queryFn: listEmployees,
    enabled: !!user && open,
  });

  const createProjectMutation = useMutation({
    mutationFn: (body: CreateProjectRequest) => createProject(body),
    onSuccess: (project) => {
      setCreatedProjectId(project.id);
      setCurrentStep('client');
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create project', { description: error.message });
    },
  });

  const assignClientMutation = useMutation({
    mutationFn: (clientId: string) => assignClientToProject(createdProjectId!, clientId),
    onSuccess: () => {
      setCurrentStep('task');
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
      toast.success('Task created successfully');
      handleClose();
    },
    onError: (error: Error) => {
      toast.error('Failed to create task', { description: error.message });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: (clientData: Parameters<typeof createClient>[0]) => createClient(clientData),
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients() });
      toast.success('Client created and assigned successfully');
      setShowCreateClient(false);
      setCreateClientForm({ name: '', email: '', password: '', phone: '', company: '', status: 'active' });
      if (createdProjectId) {
        assignClientMutation.mutate(newClient.id);
        setFormState((prev) => ({ ...prev, client: { selectedId: newClient.id } }));
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
      setCreateEmployeeForm({ email: '', name: '', inviteType: 'invitation', password: '' });
    },
    onError: (error: Error) => {
      toast.error('Failed to invite employee', { description: error.message });
    },
  });

  const handleClose = () => {
    setCurrentStep('project');
    setFormState(initialState());
    setCreatedProjectId(null);
    onOpenChange(false);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formState.project.title.trim().length < 3) {
      toast.error('Project title must be at least 3 characters');
      return;
    }

    const payload: CreateProjectRequest = {
      title: formState.project.title.trim(),
    };

    if (formState.project.description.trim()) {
      payload.description = formState.project.description.trim();
    }

    await createProjectMutation.mutateAsync(payload);
  };

  const handleSkipClient = () => {
    setCurrentStep('task');
  };

  const handleSelectClient = async (clientId: string) => {
    await assignClientMutation.mutateAsync(clientId);
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
      name: createEmployeeForm.name.trim(),
      role: 'employee',
      type: createEmployeeForm.inviteType,
      password: createEmployeeForm.password.trim() || undefined,
    } as any);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.task.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    if (!formState.task.assignedTo) {
      toast.error('Please assign the task to an employee');
      return;
    }

    const assignedUser = employeesQuery.data?.find((u) => u.uid === formState.task.assignedTo);
    const clientEmail = formState.client.selectedId
      ? clientsQuery.data?.find((c) => c.id === formState.client.selectedId)?.email
      : undefined;

    const dueDate = formState.task.dueDate
      ? new Date(`${formState.task.dueDate}T00:00:00`).toISOString()
      : undefined;

    await createTaskMutation.mutateAsync({
      projectId: createdProjectId!,
      title: formState.task.title.trim(),
      description: formState.task.description.trim() || undefined,
      assignedTo: formState.task.assignedTo,
      assignedToName: assignedUser?.name || undefined,
      clientEmail: clientEmail,
      priority: formState.task.priority,
      dueDate: dueDate,
    });
  };

  const renderProjectStep = () => (
    <form onSubmit={handleProjectSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Project Title *</Label>
        <Input
          placeholder="e.g. Q3 Paid Media Launch"
          value={formState.project.title}
          onChange={(e) => setFormState((prev) => ({ ...prev, project: { ...prev.project, title: e.target.value } }))}
          className="rounded-xl border-zinc-200 h-11"
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</Label>
        <Textarea
          placeholder="Optional project notes, scope summary, or campaign context..."
          value={formState.project.description}
          onChange={(e) => setFormState((prev) => ({ ...prev, project: { ...prev.project, description: e.target.value } }))}
          className="rounded-xl border-zinc-200 min-h-32"
        />
      </div>

      <Button type="submit" disabled={createProjectMutation.isPending} >
        {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
      </Button>
    </form>
  );

  const renderClientStep = () => (
    <div className="space-y-4">
      {showCreateClient ? (
        <form onSubmit={handleCreateClientSubmit} className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Create New Client</p>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Name *</Label>
            <Input
              placeholder="Client name"
              value={createClientForm.name}
              onChange={(e) => setCreateClientForm((current) => ({ ...current, name: e.target.value }))}
              className="rounded-xl border-zinc-200 h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Email *</Label>
            <Input
              type="email"
              placeholder="client@example.com"
              value={createClientForm.email}
              onChange={(e) => setCreateClientForm((current) => ({ ...current, email: e.target.value }))}
              className="rounded-xl border-zinc-200 h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Password</Label>
            <Input
              type="password"
              placeholder="Password"
              value={createClientForm.password}
              onChange={(e) => setCreateClientForm((current) => ({ ...current, password: e.target.value }))}
              className="rounded-xl border-zinc-200 h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Phone</Label>
              <Input
                placeholder="Phone"
                value={createClientForm.phone}
                onChange={(e) => setCreateClientForm((current) => ({ ...current, phone: e.target.value }))}
                className="rounded-xl border-zinc-200 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Company</Label>
              <Input
                placeholder="Company"
                value={createClientForm.company}
                onChange={(e) => setCreateClientForm((current) => ({ ...current, company: e.target.value }))}
                className="rounded-xl border-zinc-200 h-11"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreateClient(false)}
              className="flex-1 rounded-xl h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createClientMutation.isPending}
              size='sm'

            >
              {createClientMutation.isPending ? 'Creating...' : 'Create & Assign'}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowCreateClient(true)}
          
        >
          ＋ Create New Client
        </Button>
      )}

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Select Existing Client</p>
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
              {clientsQuery.data?.map((client: Client) => (
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

      <Button onClick={handleSkipClient} variant="ghost" >
        Skip for now
      </Button>
    </div>
  );

  const renderTaskStep = () => {
    const employees = employeesQuery.data?.filter((e) => e.role === 'employee' && !e.isDisabled) ?? [];

    return (
      <form onSubmit={handleTaskSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Task Title *</Label>
          <Input
            placeholder="e.g., Initial Campaign Research"
            value={formState.task.title}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                task: { ...prev.task, title: e.target.value },
              }))
            }
            className="rounded-xl border-zinc-200 h-11"
            autoFocus
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</Label>
          <Textarea
            placeholder="Task details, expected output, or execution notes..."
            value={formState.task.description}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                task: { ...prev.task, description: e.target.value },
              }))
            }
            className="rounded-xl border-zinc-200 min-h-24"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Assign To *</Label>
              <button
                type="button"
                onClick={() => setShowCreateEmployee(!showCreateEmployee)}
                className="text-xs font-semibold px-2 py-1 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
              >
                ＋ Invite
              </button>
            </div>
            <Select
              value={formState.task.assignedTo}
              onValueChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  task: { ...prev.task, assignedTo: value || '' },
                }))
              }
            >
              <SelectTrigger className="rounded-xl border-zinc-200 h-11">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {employeesQuery.isLoading ? (
                  <div className="p-2 text-xs text-zinc-500">Loading employees...</div>
                ) : employees.length > 0 ? (
                  employees.map((emp) => (
                    <SelectItem key={emp.uid} value={emp.uid}>
                      {emp.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-xs text-zinc-500">No employees available</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Priority</Label>
            <Select
              value={formState.task.priority}
              onValueChange={(value: 'low' | 'medium' | 'high') =>
                setFormState((prev) => ({
                  ...prev,
                  task: { ...prev.task, priority: value },
                }))
              }
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
            value={formState.task.dueDate}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                task: { ...prev.task, dueDate: e.target.value },
              }))
            }
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

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Name *</Label>
              <Input
                placeholder="Employee name"
                value={createEmployeeForm.name}
                onChange={(e) => setCreateEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl border-zinc-200 h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Email *</Label>
              <Input
                type="email"
                placeholder="employee@example.com"
                value={createEmployeeForm.email}
                onChange={(e) => setCreateEmployeeForm((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-xl border-zinc-200 h-11"
                required
              />
            </div>

            {createEmployeeForm.inviteType === 'password' && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Password *</Label>
                <Input
                  type="password"
                  placeholder="Set password"
                  value={createEmployeeForm.password}
                  onChange={(e) => setCreateEmployeeForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="rounded-xl border-zinc-200 h-11"
                  required
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateEmployee(false)}
                className="flex-1 rounded-xl h-11"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateEmployeeSubmit}
                disabled={createEmployeeMutation.isPending}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-11"
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
            onClick={handleClose}
            className="flex-1 rounded-xl h-11"
          >
            Skip Task Creation
          </Button>
          <Button
            type="submit"
            disabled={createTaskMutation.isPending || !formState.task.title.trim() || !formState.task.assignedTo}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-11"
          >
            {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </form>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'project':
        return renderProjectStep();
      case 'client':
        return renderClientStep();
      case 'task':
        return renderTaskStep();
      default:
        return null;
    }
  };

  const currentStepIndex = getStepIndex(currentStep);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[70%] max-h-[90vh] min-h-0 overflow-hidden flex flex-col p-0 rounded-2xl border-zinc-200">
        <DialogHeader className="p-6 border-b border-zinc-100 bg-zinc-50/50">
          <DialogTitle className="text-xl font-bold">Project Setup</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Vertical Stepper */}
          <div className="w-48 border-r border-zinc-100 bg-zinc-50/50 p-6 overflow-y-auto">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id}>
                  <button
                    onClick={() => {
                      if (currentStepIndex > index) {
                        setCurrentStep(step.id);
                      }
                    }}
                    disabled={currentStepIndex < index}
                    className={`w-full text-left transition-all ${
                      currentStep === step.id
                        ? 'opacity-100'
                        : currentStepIndex > index
                          ? 'opacity-75 hover:opacity-100 cursor-pointer'
                          : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                          currentStep === step.id
                            ? 'bg-zinc-900 text-white'
                            : currentStepIndex > index
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        {currentStepIndex > index ? <Check className="w-4 h-4" /> : index + 1}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-xs font-bold text-zinc-900 leading-snug">{step.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  </button>

                  {index < steps.length - 1 && (
                    <div className="ml-4 h-8 border-l-2 border-zinc-200 my-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
         
              <div className="mb-6">
                <h3 className="text-lg font-bold text-zinc-900">{steps[currentStepIndex].label}</h3>
              </div>
              {renderStepContent()}
         
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
