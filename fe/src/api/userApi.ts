import { apiRequest } from "./httpClient";

export interface UserDTO {
  id?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  userType?: string;
  status?: string;
  phoneNumber?: string;
  createdDate?: string;
  updatedDate?: string;
  lastLogin?: string;
  dob?: string;
  isDeleted?: boolean;
  activeSubscription?: unknown;
}

export interface ProfileUpdateRequest {
  displayName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  dob?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface DeleteAccountRequest {
  currentPassword: string;
}

export const userApi = {
  getMe() {
    return apiRequest<UserDTO>("/User/me");
  },

  updateMe(request: ProfileUpdateRequest) {
    return apiRequest<unknown>("/User/me", {
      method: "PATCH",
      body: request,
    });
  },

  changePassword(request: ChangePasswordRequest) {
    return apiRequest<unknown>("/User/change-password", {
      method: "PATCH",
      body: request,
    });
  },

  deleteMe(request: DeleteAccountRequest) {
    return apiRequest<unknown>("/User/me", {
      method: "DELETE",
      body: request,
    });
  },
};
