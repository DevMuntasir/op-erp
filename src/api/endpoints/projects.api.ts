import { deleteApiData, getApiData, patchApiData, postApiData } from '@/src/api/client';
import { Project, ProjectDeliverable, ProjectUpsertPayload } from '@/src/shared/types/domain';

export type CreateProjectRequest = Required<Pick<ProjectUpsertPayload, 'title'>> &
  Omit<ProjectUpsertPayload, 'title' | 'status'>;

export type UpdateProjectRequest = ProjectUpsertPayload;

const normalizeProject = (project: Partial<Project>): Project => ({
  id: typeof project.id === 'string' ? project.id : '',
  adminId: project.adminId ?? '',
  title: project.title ?? project.name ?? '',
  description: project.description ?? null,
  status: project.status ?? 'active',
  createdAt: project.createdAt,
  createdBy: project.createdBy ?? '',
  name: project.name ?? project.title ?? '',
});

export async function listProjects() {
  const data = await getApiData<Project[] | Project>('/v1/projects/');
  const items = Array.isArray(data) ? data : data ? [data] : [];
  return items.map(normalizeProject);
}

export async function getProject(id: string) {
  const project = await getApiData<Project>(`/v1/projects/${id}`);
  return normalizeProject(project);
}

export async function createProject(body: CreateProjectRequest) {
  const project = await postApiData<Project, typeof body>('/v1/projects/', body);
  return normalizeProject(project);
}

export async function updateProject(id: string, body: UpdateProjectRequest) {
  const project = await patchApiData<Project, typeof body>(`/v1/projects/${id}`, body);
  return normalizeProject(project);
}

export async function deleteProject(id: string) {
  const project = await deleteApiData<Project>(`/v1/projects/${id}`);
  return normalizeProject(project);
}

export async function listProjectDeliverables(id: string) {
  return getApiData<ProjectDeliverable[]>(`/v1/projects/${id}/deliverables`);
}
