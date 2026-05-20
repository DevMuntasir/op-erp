export const queryKeys = {
  me: ['me'] as const,
  employees: ['employees'] as const,
  invites: ['invites'] as const,
  clients: (filters?: unknown) => ['clients', filters ?? {}] as const,
  leads: (filters?: unknown) => ['leads', filters ?? {}] as const,
  tasks: (filters?: unknown) => ['tasks', filters ?? {}] as const,
  task: (id: string) => ['task', id] as const,
  taskMessages: (id: string) => ['task-messages', id] as const,
  sessions: (filters?: unknown) => ['sessions', filters ?? {}] as const,
  screenshots: (filters?: unknown) => ['screenshots', filters ?? {}] as const,
  invoices: (filters?: unknown) => ['invoices', filters ?? {}] as const,
  notifications: ['notifications'] as const,
} as const;
