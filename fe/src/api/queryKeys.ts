import type { DocumentStatus } from "@/api/documentApi";

export const queryKeys = {
  admin: {
    activityLogs: ["admin", "activity-logs"] as const,
    billing: (params: unknown) => ["admin", "billing", params] as const,
    dashboard: ["admin", "dashboard"] as const,
    notifications: (params: unknown) => ["admin", "notifications", params] as const,
    subscriptions: {
      all: ["admin", "subscriptions"] as const,
      dashboard: ["admin", "subscriptions", "dashboard"] as const,
      subscribers: (params: unknown) =>
        ["admin", "subscriptions", "subscribers", params] as const,
    },
    users: (params: unknown) => ["admin", "users", params] as const,
  },
  billing: {
    mine: (params: unknown) => ["billing", "mine", params] as const,
  },
  documents: {
    all: ["documents"] as const,
    detail: (documentId: string) => ["documents", "detail", documentId] as const,
    workflow: (documentId: string) =>
      ["documents", "workflow", documentId] as const,
    list: (
      organizationId?: string | null,
      filters?: { searchQuery?: string; status?: DocumentStatus | ""; page?: number; pageSize?: number },
    ) => ["documents", "list", organizationId ?? "none", filters ?? {}] as const,
    pendingTasks: (params?: unknown) => ["documents", "pending-tasks", params ?? {}] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    mine: (params?: unknown) => ["notifications", "mine", params ?? {}] as const,
  },
  organizations: {
    all: ["organizations"] as const,
    currentMembership: (organizationId?: string | null, userId?: string | null) =>
      ["organizations", organizationId ?? "none", "current-membership", userId ?? "none"] as const,
    jobTitles: (organizationId?: string | null) =>
      ["organizations", organizationId ?? "none", "job-titles"] as const,
    members: (organizationId?: string | null, params?: unknown) =>
      ["organizations", organizationId ?? "none", "members", params ?? {}] as const,
  },
  subscriptions: {
    active: ["subscriptions", "active"] as const,
    mine: ["subscriptions", "mine"] as const,
  },
};
