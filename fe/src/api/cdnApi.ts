import { apiRequest, CDN_BASE_URL } from "./httpClient";
import type { PaginatedResult } from "./adminUserApi";

export interface UploadedFileResponse {
  originalName: string;
  savedName: string;
  extension: string;
  mimeType: string;
  url: string;
  apiUrl?: string;
  APIUrl?: string;
  uploadedBy?: string;
  description?: string;
  sizeBytes: number;
  uploadedAt: string;
}

export const cdnApi = {
  listFiles(query: { query?: string; page?: number; pageSize?: number } = {}) {
    return apiRequest<PaginatedResult<UploadedFileResponse>>("/Files/list", {
      baseUrl: CDN_BASE_URL,
      query: {
        page: 1,
        pageSize: 20,
        ...query,
      },
    });
  },

  uploadFile(file: File, description?: string) {
    const formData = new FormData();
    formData.append("File", file);
    if (description) formData.append("Description", description);

    return apiRequest<UploadedFileResponse>("/Files/upload", {
      baseUrl: CDN_BASE_URL,
      method: "POST",
      body: formData,
    });
  },

  uploadMultiple(files: File[], description?: string) {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`forms[${index}].File`, file);
      if (description) formData.append(`forms[${index}].Description`, description);
    });

    return apiRequest<UploadedFileResponse[]>("/Files/upload-multiple", {
      baseUrl: CDN_BASE_URL,
      method: "POST",
      body: formData,
    });
  },

  deleteFile(savedName: string) {
    return apiRequest<unknown>(`/Files/${encodeURIComponent(savedName)}`, {
      baseUrl: CDN_BASE_URL,
      method: "DELETE",
    });
  },
};
