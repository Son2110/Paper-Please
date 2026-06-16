import { apiRequest } from "./httpClient";

export interface PaginatedResult<T> {
  currentPage: number;
  pageCount: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: T[];
}

export interface NotificationDTO {
  id: string;
  userId?: string;
  isRead: boolean;
  title: string;
  message: string;
  type: string;
  sender?: string;
  targetType?: string;
  sentAt: string;
  updatedAt?: string;
}

export interface NotificationQuery {
  searchQuery?: string;
  onlyUnread?: boolean;
  page?: number;
  pageSize?: number;
}

export interface NotificationSendRequest {
  userId?: string | null;
  title: string;
  message: string;
  type: string;
  sender?: string | null;
  targetType?: string | null;
}

export const notificationApi = {
  getMine(query: NotificationQuery = {}) {
    return apiRequest<PaginatedResult<NotificationDTO>>("/Notification/me", {
      query: {
        page: 1,
        pageSize: 10,
        ...query,
      },
    });
  },

  read(id: string) {
    return apiRequest<NotificationDTO>(`/Notification/me/${id}`);
  },

  markAsRead(id: string) {
    return apiRequest<unknown>(`/Notification/me/mark-as-read/${id}`, {
      method: "POST",
    });
  },

  markAllAsRead() {
    return apiRequest<unknown>("/Notification/me/mark-as-read-all", {
      method: "POST",
    });
  },

  send(request: NotificationSendRequest) {
    return apiRequest<unknown>("/Notification/send", {
      method: "POST",
      body: request,
    });
  },

  getSent(query: Omit<NotificationQuery, "onlyUnread"> = {}) {
    return apiRequest<PaginatedResult<NotificationDTO>>("/Notification/sent", {
      query: {
        page: 1,
        pageSize: 10,
        ...query,
      },
    });
  },
};
