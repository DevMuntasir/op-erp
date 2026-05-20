import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/src/components/shared/dialogs/ConfirmDialog';
import { createProject, deleteProject, listProjects, updateProject } from '@/src/api/endpoints/projects.api';
import type { CreateProjectRequest, UpdateProjectRequest } from '@/src/api/endpoints/projects.api';
import { useAuth } from '@/src/App';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { Project } from '@/src/types';
import { Edit2, Eye, FolderKanban, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type ProjectFormState = {
  title: string;
  description: string;
  status: string;
};

const initialFormState = (): ProjectFormState => ({
  title: '',
  description: '',
  status: 'active',
});

const toProjectPayload = (form: ProjectFormState): CreateProjectRequest => {
  const payload: CreateProjectRequest = {
    title: form.title.trim(),
  };

  if (form.description.trim()) {
    payload.description = form.description.trim();
  }

  return payload;
};

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
  const [isAdding, setIsAdding] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<ProjectFormState>(initialFormState);

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects({ scope: user?.role ?? 'anonymous' }),
    queryFn: listProjects,
    enabled: !!user,
  });

  const resetForm = () => {
    setForm(initialFormState());
    setEditingProject(null);
    setIsAdding(false);
  };

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Project created successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Failed to create project', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProjectRequest }) => updateProject(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects({ scope: user?.role ?? 'anonymous' }) });
      toast.success('Project updated successfully');
      resetForm();
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

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.title.trim().length < 3) {
      toast.error('Project title must be at least 3 characters');
      return;
    }

    if (editingProject) {
      await updateMutation.mutateAsync({
        id: editingProject.id,
        body: toProjectUpdatePayload(form),
      });
      return;
    }

    await createMutation.mutateAsync(toProjectPayload(form));
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
    setIsAdding(true);
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

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const loadingError = projectsQuery.error as Error | null;

  return (
    <div className="p-4 lg:p-8 bg-zinc-50/50 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Projects</h1>
          <p className="text-zinc-500 text-sm">Manage agency projects and track their current lifecycle state.</p>
        </div>

        <Dialog
          open={isAdding}
          onOpenChange={(open) => {
            if (!open) resetForm();
            setIsAdding(open);
          }}
        >
          <DialogTrigger
            render={
              <Button className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 h-10 px-4 rounded-xl shadow-sm">
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            }
          />
          <DialogContent className="max-w-2xl max-h-[90vh] min-h-0 overflow-hidden flex flex-col p-0 rounded-2xl border-zinc-200">
            <DialogHeader className="p-6 border-b border-zinc-100 bg-zinc-50/50">
              <DialogTitle className="text-xl font-bold">{editingProject ? 'Edit Project' : 'Create Project'}</DialogTitle>
              <DialogDescription>Capture the project title and optional description for your internal workflow.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="project-form" onSubmit={handleSaveProject} className="space-y-6">
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
                    placeholder="Optional project notes, scope summary, or campaign context..."
                    value={form.description}
                    onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                    className="rounded-xl border-zinc-200 min-h-32"
                  />
                </div>

                {editingProject && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</Label>
                    <Select value={form.status} onValueChange={(value: string) => setForm((current) => ({ ...current, status: value }))}>
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
                )}
              </form>
            </div>

            <DialogFooter className="p-6 border-t border-zinc-100 bg-white">
              <Button type="button" variant="ghost" onClick={resetForm} className="rounded-xl h-11 px-6">
                Cancel
              </Button>
              <Button type="submit" form="project-form" disabled={isSaving} className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-11 px-8">
                {isSaving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <DialogContent className="max-w-xl rounded-2xl border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{viewingProject?.title}</DialogTitle>
            <DialogDescription>Project snapshot from the current list response.</DialogDescription>
          </DialogHeader>

          {viewingProject && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</p>
                  <Badge className={`mt-2 rounded-xl px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border-none shadow-sm ${getProjectStatusClass(viewingProject.status)}`}>
                    {viewingProject.status}
                  </Badge>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Created</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">{formatProjectDate(viewingProject.createdAt)}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Created By</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900 break-all">{viewingProject.createdBy || 'Unknown'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Description</p>
                <p className="mt-2 text-sm leading-6 text-zinc-700 whitespace-pre-wrap">
                  {viewingProject.description?.trim() || 'No description provided.'}
                </p>
              </div>
            </div>
          )}
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
