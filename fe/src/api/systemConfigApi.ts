import { apiRequest } from "./httpClient";
import type { UserMinimalDTO } from "./activityLogApi";

export interface SystemConfigurationDTO {
  id: string;
  key: string;
  value: string;
  createdDate?: string;
  createdBy?: UserMinimalDTO | null;
  updatedAt?: string | null;
  updatedBy?: UserMinimalDTO | null;
}

export interface SystemConfigUpdateRequest {
  value: string;
}

export const systemConfigApi = {
  getAll() {
    return apiRequest<SystemConfigurationDTO[]>("/SystemConfigs");
  },

  update(key: string, request: SystemConfigUpdateRequest) {
    return apiRequest<unknown>(`/SystemConfigs/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: request,
    });
  },

  refreshCache() {
    return apiRequest<unknown>("/SystemConfigs/refresh-cache", {
      method: "POST",
    });
  },
};
