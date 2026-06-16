import { apiRequest } from "./httpClient";
import type { SubscriptionDetailResponse } from "./subscriptionApi";
import type { UserDTO } from "./userApi";

export interface PaginatedResult<T> {
  currentPage: number;
  pageCount: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: T[];
}

export interface UserQueryRequest {
  searchValue?: string;
  filterByRole?: string;
  filterByStatus?: string;
  orderBy?: string;
  sortOrder?: "asc" | "desc";
  pageNumber?: number;
  pageSize?: number;
}

export interface UserCreateRequest {
  email: string;
  displayName?: string;
  avatarUrl?: string;
  userType: string;
  status?: string;
  phoneNumber?: string;
  password: string;
  dob?: string | null;
}

export interface UserUpdateRequest {
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  userType?: string;
  status?: string;
  phoneNumber?: string;
  dob?: string | null;
}

export const adminUserApi = {
  queryUsers(query: UserQueryRequest = {}) {
    return apiRequest<PaginatedResult<UserDTO>>("/User/query-user", {
      query: {
        pageNumber: 1,
        pageSize: 10,
        sortOrder: "asc",
        ...query,
      },
    });
  },

  getById(id: string) {
    return apiRequest<UserDTO>(`/User/by-id/${id}`);
  },

  getByEmail(email: string) {
    return apiRequest<UserDTO>(`/User/by-email/${encodeURIComponent(email)}`);
  },

  getSubscriptionDetail(userId: string) {
    return apiRequest<SubscriptionDetailResponse>(
      `/User/get-subscription-detail/${userId}`,
    );
  },

  createUser(request: UserCreateRequest) {
    return apiRequest<UserDTO>("/User/create", {
      method: "POST",
      body: request,
    });
  },

  updateUser(id: string, request: UserUpdateRequest) {
    return apiRequest<boolean>(`/User/update/${id}`, {
      method: "PUT",
      body: request,
    });
  },

  deleteUser(id: string) {
    return apiRequest<boolean>(`/User/delete/${id}`, {
      method: "DELETE",
    });
  },

  changeRole(id: string, role: string) {
    return apiRequest<boolean>(`/User/change-role/${id}`, {
      method: "PUT",
      query: { role },
    });
  },
};
