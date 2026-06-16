import { apiRequest } from "./httpClient";

export interface UserMinimalDTO {
  id?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface ActivityLogDTO {
  id: string;
  user?: UserMinimalDTO | null;
  targetType: string;
  action: string;
  timestamp: string;
  details?: string | null;
  category?: string | null;
  targetId?: string | null;
  targetObj?: unknown;
  reason?: string | null;
  actorRole?: string | null;
  deviceInfo?: string | null;
}

export interface UserActivityLogQuery {
  getByDateFrom?: string;
  getByDateTo?: string;
  page?: number;
  pageSize?: number;
}

export const activityLogApi = {
  getAll() {
    return apiRequest<ActivityLogDTO[]>("/ActivityLog");
  },

  getById(id: string) {
    return apiRequest<ActivityLogDTO>(`/ActivityLog/${id}`);
  },

  getByUserId(userId: string, query: UserActivityLogQuery = {}) {
    return apiRequest<ActivityLogDTO[]>(`/ActivityLog/user-id/${userId}`, {
      query: {
        page: 1,
        pageSize: 10,
        ...query,
      },
    });
  },

  logLogout() {
    return apiRequest<unknown>("/ActivityLog/log-logout", {
      method: "POST",
    });
  },

  clearAll() {
    return apiRequest<unknown>("/ActivityLog", {
      method: "DELETE",
    });
  },
};
