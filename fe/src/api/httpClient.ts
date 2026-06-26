export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5172/api";

export const CDN_BASE_URL =
  import.meta.env.VITE_CDN_BASE_URL ??
  "https://papermanagementsystemcdn.runasp.net/api";

export const AUTH_TOKEN_STORAGE_KEY = "paperPlease.authToken";

type QueryValue = string | number | boolean | null | undefined;

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export class ApiError extends Error {
  status: number;
  errors: string[];
  payload: unknown;

  constructor(
    message: string,
    status: number,
    errors: string[] = [],
    payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.payload = payload;
  }
}

let tokenProvider: () => string | null = readStoredAuthToken;

export function setAuthTokenProvider(provider: () => string | null) {
  tokenProvider = provider;
}

export function readStoredAuthToken(): string | null {
  return (
    window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ??
    window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  );
}

export function writeStoredAuthToken(token: string, remember: boolean) {
  clearStoredAuthToken();
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, QueryValue>,
) {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204) return null;
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return text || null;
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    ("data" in payload || "message" in payload || "errors" in payload),
  );
}

function localizeApiMessage(message: string) {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();
  const exactTranslations: Record<string, string> = {
    "department name already exists.": "Tên phòng ban đã tồn tại.",
    "department deleted successfully.": "Đã xóa phòng ban.",
    "department head assigned successfully.": "Đã gán trưởng phòng.",
    "department member added successfully.":
      "Đã thêm thành viên vào phòng ban.",
    "department member removed successfully.":
      "Đã xóa thành viên khỏi phòng ban.",
    "department head removed successfully.": "Đã gỡ trưởng phòng.",
    "department not found.": "Không tìm thấy phòng ban.",
    "department contains documents.":
      "Không thể xóa phòng ban đang có tài liệu.",
    "user must belong to the department.":
      "Người dùng phải thuộc phòng ban trước khi được gán làm trưởng phòng.",
    "user is not a member of this organization.":
      "Người dùng chưa thuộc tổ chức này.",
    "user already belongs to this department.":
      "Người dùng đã thuộc phòng ban này.",
    "remove or reassign department head first.":
      "Vui lòng gỡ hoặc đổi trưởng phòng trước.",
    "department member not found.":
      "Không tìm thấy thành viên trong phòng ban.",
    "you do not have permission to view department documents.":
      "Bạn không có quyền xem tài liệu của phòng ban này.",
    "permission denied.": "Bạn không có quyền thực hiện thao tác này.",
    "organization membership not found.":
      "Không tìm thấy quyền thành viên trong tổ chức.",
    "you are not a member of the provided organization.":
      "Bạn không thuộc tổ chức này.",
    "not a member of this organization.": "Bạn không thuộc tổ chức này.",
    "department does not exist.": "Phòng ban không tồn tại.",
    "department does not belong to organization.":
      "Phòng ban không thuộc tổ chức này.",
  };
  const maxOrganizationsMatch = normalized.match(
    /^Your plan only allows\s+(\d+)\s+organizations\.?$/i,
  );

  if (exactTranslations[lower]) {
    return exactTranslations[lower];
  }

  if (maxOrganizationsMatch) {
    return `Gói dịch vụ hiện tại chỉ cho phép tạo tối đa ${maxOrganizationsMatch[1]} tổ chức.`;
  }

  if (lower === "you need an active subscription to create organizations.") {
    return "Bạn cần có gói dịch vụ đang hoạt động để tạo tổ chức.";
  }

  if (
    lower.includes("invalid email") ||
    lower.includes("invalid password") ||
    lower.includes("invalid username") ||
    lower.includes("invalid credentials") ||
    lower.includes("incorrect email") ||
    lower.includes("incorrect password") ||
    lower.includes("login failed") ||
    lower.includes("sign in failed") ||
    lower.includes("unauthorized")
  ) {
    return "Email hoặc mật khẩu không đúng.";
  }

  return message;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | object | null;
  query?: Record<string, QueryValue>;
  baseUrl?: string;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    body,
    query,
    baseUrl = API_BASE_URL,
    headers,
    ...requestInit
  } = options;
  const requestHeaders = new Headers(headers);
  const token = tokenProvider();

  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);

  let requestBody = body as BodyInit | null | undefined;
  if (
    body &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    typeof body !== "string"
  ) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(baseUrl, path, query), {
    ...requestInit,
    headers: requestHeaders,
    body: requestBody,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const envelope = isApiEnvelope<unknown>(payload) ? payload : undefined;
    const message =
      envelope?.message ||
      envelope?.errors?.[0] ||
      (typeof payload === "string" ? payload : "") ||
      `Request failed with status ${response.status}`;
    throw new ApiError(
      localizeApiMessage(message),
      response.status,
      envelope?.errors ?? [],
      payload,
    );
  }

  if (isApiEnvelope<T>(payload)) {
    if (payload.success === false) {
      const message =
        payload.message || payload.errors?.[0] || "Request failed";
      throw new ApiError(
        localizeApiMessage(message),
        response.status,
        payload.errors ?? [],
        payload,
      );
    }
    return payload.data as T;
  }

  return payload as T;
}
