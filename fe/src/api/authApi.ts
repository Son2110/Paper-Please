import { apiRequest } from "./httpClient";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  dob: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface EmailOnlyRequest {
  email: string;
}

export interface ConfirmEmailRequest {
  email: string;
  token: string;
}

export type TokenPurpose = "EmailConfirmation" | "ResetPassword" | "TwoFactorAuth";

export interface VerifyTokenRequest {
  email: string;
  token: string;
  purpose: TokenPurpose;
}

export const authApi = {
  login(credentials: LoginCredentials) {
    return apiRequest<string>("/Auth/login", {
      method: "POST",
      body: credentials,
    });
  },
  register(request: RegisterRequest) {
    return apiRequest<unknown>("/Auth/register", {
      method: "POST",
      body: request,
    });
  },
  forgotPassword(request: ForgotPasswordRequest) {
    return apiRequest<unknown>("/Auth/forgot-password", {
      method: "POST",
      body: request,
    });
  },
  resetPassword(request: ResetPasswordRequest) {
    return apiRequest<unknown>("/Auth/reset-password", {
      method: "POST",
      body: request,
    });
  },
  sendEmailConfirmation(request: EmailOnlyRequest) {
    return apiRequest<unknown>("/Auth/send-email-confirmation", {
      method: "POST",
      body: request,
    });
  },
  confirmEmail(request: ConfirmEmailRequest) {
    return apiRequest<unknown>("/Auth/confirm-email", {
      method: "POST",
      body: request,
    });
  },
  verifyToken(request: VerifyTokenRequest) {
    return apiRequest<unknown>("/Auth/verify-token", {
      method: "POST",
      body: request,
    });
  },
};
