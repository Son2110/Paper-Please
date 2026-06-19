import { apiRequest } from "./httpClient";
import type { PaginatedResult } from "./adminUserApi";

export type DocumentStatus =
  | "Draft"
  | "InProgress"
  | "WaitingSignature"
  | "Completed"
  | "Rejected"
  | "Archived";

export type DocumentAccessLevel = "Owner" | "Editor" | "Viewer";
export type WorkflowStepType = "Review" | "Approve" | "Sign" | "Acknowledge";
export type WorkflowStepStatus =
  | "Pending"
  | "InProgress"
  | "Approved"
  | "Rejected"
  | "Signed"
  | "Skipped";

export interface DocumentDTO {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  status: DocumentStatus;
  dueDate?: string | null;
  ownerId: string;
  ownerName?: string | null;
  createdDate: string;
}

export interface DocumentVersionDTO {
  id: string;
  versionNumber: number;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  isCurrent: boolean;
  changeSummary?: string | null;
  createdDate: string;
}

export interface DocumentParticipantDTO {
  id: string;
  userId: string;
  displayName?: string | null;
  email?: string | null;
  accessLevel: DocumentAccessLevel;
}

export interface WorkflowStepDTO {
  id: string;
  stepOrder: number;
  assignedToId: string;
  assignedToName?: string | null;
  assignedToEmail?: string | null;
  stepType: WorkflowStepType;
  status: WorkflowStepStatus;
  completedAt?: string | null;
  comment?: string | null;
}

export interface PendingWorkflowTaskDTO {
  id: string;
  workflowId: string;
  documentId: string;
  documentTitle: string;
  organizationName: string;
  stepType: WorkflowStepType;
  status: WorkflowStepStatus;
  stepOrder: number;
  createdDate: string;
}

export interface DocumentWorkflowDTO {
  id: string;
  documentId: string;
  status: "InProgress" | "Completed" | "Rejected" | "Cancelled";
  steps: WorkflowStepDTO[];
}

export interface DocumentCommentDTO {
  id: string;
  content: string;
  parentCommentId?: string | null;
  authorName?: string | null;
  createdDate: string;
  replies: DocumentCommentDTO[];
}

export interface DocumentAuditDTO {
  id: string;
  auditType: string;
  description?: string | null;
  createdByName?: string | null;
  createdDate: string;
}

export interface DocumentDetailDTO {
  document: DocumentDTO;
  versions: DocumentVersionDTO[];
  participants: DocumentParticipantDTO[];
  workflows: DocumentWorkflowDTO[];
  comments: DocumentCommentDTO[];
  audits: DocumentAuditDTO[];
}

export interface CreateDocumentRequest {
  organizationId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
}

export interface UpdateDocumentRequest {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: DocumentStatus;
}

export interface UploadDocumentVersionRequest {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  changeSummary?: string | null;
}

export interface BulkDocumentItemRequest {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  version: UploadDocumentVersionRequest;
}

export interface BulkCreateDocumentRequest {
  organizationId: string;
  applyDocumentStatus: string;
  documents: BulkDocumentItemRequest[];
}

export interface AddDocumentParticipantRequest {
  userId: string;
  accessLevel: DocumentAccessLevel;
}

export interface UpdateDocumentParticipantRequest {
  accessLevel: DocumentAccessLevel;
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string | null;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CreateWorkflowStepRequest {
  assignedToId: string;
  stepType: WorkflowStepType;
}

export interface CreateWorkflowRequest {
  steps: CreateWorkflowStepRequest[];
}

export interface ProcessWorkflowStepRequest {
  status: "Approved" | "Rejected";
  comment?: string | null;
}

export interface DocumentFilterRequest {
  searchQuery?: string;
  status?: DocumentStatus | "";
  page?: number;
  pageSize?: number;
}

export const documentApi = {
  createDocument(request: CreateDocumentRequest) {
    return apiRequest<DocumentDTO>("/documents", {
      method: "POST",
      body: request,
    });
  },

  bulkImport(request: BulkCreateDocumentRequest) {
    return apiRequest<DocumentDTO[]>("/documents/import", {
      method: "POST",
      body: request,
    });
  },

  uploadVersion(documentId: string, request: UploadDocumentVersionRequest) {
    return apiRequest<DocumentVersionDTO>(`/documents/${documentId}/versions`, {
      method: "POST",
      body: request,
    });
  },

  getOrganizationDocuments(
    organizationId: string,
    query: DocumentFilterRequest = {},
  ) {
    return apiRequest<PaginatedResult<DocumentDTO>>(
      `/documents/organization/${organizationId}`,
      {
        query: {
          page: 1,
          pageSize: 20,
          ...query,
        },
      },
    );
  },

  getMyDocuments(query: DocumentFilterRequest = {}) {
    return apiRequest<PaginatedResult<DocumentDTO>>("/documents/me", {
      query: {
        page: 1,
        pageSize: 20,
        ...query,
      },
    });
  },

  getById(documentId: string) {
    return apiRequest<DocumentDTO>(`/documents/${documentId}`);
  },

  getDetailed(documentId: string) {
    return apiRequest<DocumentDetailDTO>(`/documents/${documentId}/detailed`);
  },

  getVersions(documentId: string) {
    return apiRequest<DocumentVersionDTO[]>(
      `/documents/${documentId}/versions`,
    );
  },

  updateDocument(documentId: string, request: UpdateDocumentRequest) {
    return apiRequest<DocumentDTO>(`/documents/${documentId}`, {
      method: "PUT",
      body: request,
    });
  },

  deleteDocument(documentId: string) {
    return apiRequest<unknown>(`/documents/${documentId}`, {
      method: "DELETE",
    });
  },

  getParticipants(
    documentId: string,
    query: { searchQuery?: string; page?: number; pageSize?: number } = {},
  ) {
    return apiRequest<PaginatedResult<DocumentParticipantDTO>>(
      `/documents/${documentId}/participants`,
      {
        query: {
          page: 1,
          pageSize: 20,
          ...query,
        },
      },
    );
  },

  addParticipant(documentId: string, request: AddDocumentParticipantRequest) {
    return apiRequest<DocumentParticipantDTO>(
      `/documents/${documentId}/participants`,
      {
        method: "POST",
        body: request,
      },
    );
  },

  updateParticipant(
    documentId: string,
    userId: string,
    request: UpdateDocumentParticipantRequest,
  ) {
    return apiRequest<DocumentParticipantDTO>(
      `/documents/${documentId}/participants/${encodeURIComponent(userId)}`,
      {
        method: "PUT",
        body: request,
      },
    );
  },

  removeParticipant(documentId: string, userId: string) {
    return apiRequest<unknown>(
      `/documents/${documentId}/participants/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
      },
    );
  },

  getComments(
    documentId: string,
    query: { page?: number; pageSize?: number } = {},
  ) {
    return apiRequest<PaginatedResult<DocumentCommentDTO>>(
      `/documents/${documentId}/comments`,
      {
        query: {
          page: 1,
          pageSize: 20,
          ...query,
        },
      },
    );
  },

  addComment(documentId: string, request: CreateCommentRequest) {
    return apiRequest<DocumentCommentDTO>(`/documents/${documentId}/comments`, {
      method: "POST",
      body: request,
    });
  },

  updateComment(commentId: string, request: UpdateCommentRequest) {
    return apiRequest<DocumentCommentDTO>(`/documents/comments/${commentId}`, {
      method: "PUT",
      body: request,
    });
  },

  deleteComment(commentId: string) {
    return apiRequest<unknown>(`/documents/comments/${commentId}`, {
      method: "DELETE",
    });
  },

  getAuditTrail(
    documentId: string,
    query: { page?: number; pageSize?: number } = {},
  ) {
    return apiRequest<PaginatedResult<DocumentAuditDTO>>(
      `/documents/${documentId}/audit-trail`,
      {
        query: {
          page: 1,
          pageSize: 20,
          ...query,
        },
      },
    );
  },

  createWorkflow(documentId: string, request: CreateWorkflowRequest) {
    return apiRequest<DocumentWorkflowDTO>(
      `/documents/${documentId}/workflow`,
      {
        method: "POST",
        body: request,
      },
    );
  },

  getWorkflow(documentId: string) {
    return apiRequest<DocumentWorkflowDTO>(`/documents/${documentId}/workflow`);
  },

  cancelWorkflow(documentId: string) {
    return apiRequest<unknown>(`/documents/${documentId}/workflow/cancel`, {
      method: "POST",
    });
  },

  processWorkflowStep(stepId: string, request: ProcessWorkflowStepRequest) {
    return apiRequest<unknown>(`/documents/workflow/${stepId}/process`, {
      method: "POST",
      body: request,
    });
  },

  getMyPendingTasks(query: { page?: number; pageSize?: number } = {}) {
    return apiRequest<PaginatedResult<PendingWorkflowTaskDTO>>(
      "/documents/my-pending-tasks",
      {
        query: {
          page: 1,
          pageSize: 20,
          ...query,
        },
      },
    );
  },
};
