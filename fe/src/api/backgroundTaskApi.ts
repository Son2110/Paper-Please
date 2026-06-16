import { apiRequest } from "./httpClient";

export type BackgroundTaskType =
  | "BillingRecords"
  | "SubscriptionEmailReminder"
  | "SubscriptionExpiration";

export type BackgroundTaskStatus = Record<BackgroundTaskType, boolean>;

export const backgroundTaskApi = {
  getAll() {
    return apiRequest<BackgroundTaskStatus>("/BackgroundTask");
  },

  toggle(taskType: BackgroundTaskType) {
    return apiRequest<unknown>(`/BackgroundTask/toggle/${taskType}`, {
      method: "POST",
    });
  },

  enable(taskType: BackgroundTaskType) {
    return apiRequest<unknown>(`/BackgroundTask/enable/${taskType}`, {
      method: "POST",
    });
  },

  disable(taskType: BackgroundTaskType) {
    return apiRequest<unknown>(`/BackgroundTask/disable/${taskType}`, {
      method: "POST",
    });
  },
};
