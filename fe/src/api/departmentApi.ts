import type { PaginatedResult } from "./adminUserApi";
import { apiRequest } from "./httpClient";

export interface DepartmentDTO {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  headId?: string | null;
  headName?: string | null;
  memberCount: number;
  isActive: boolean;
  createdDate: string;
  lastUpdatedDate?: string | null;
}

export interface DepartmentMemberDTO {
  userId: string;
  displayName: string;
  email: string;
  jobTitle?: string | null;
  isDepartmentHead: boolean;
}

export interface CreateDepartmentRequest {
  organizationId: string;
  name: string;
  description?: string | null;
}

export interface UpdateDepartmentRequest {
  name: string;
  description?: string | null;
}

export interface AddDepartmentMemberRequest {
  userId: string;
}

export interface AssignDepartmentHeadRequest {
  userId: string;
}

export const departmentApi = {
  create(request: CreateDepartmentRequest) {
    return apiRequest<DepartmentDTO>("/organizations/department", {
      method: "POST",
      body: request,
    });
  },

  update(departmentId: string, request: UpdateDepartmentRequest) {
    return apiRequest<DepartmentDTO>(
      `/organizations/department/${departmentId}`,
      {
        method: "PUT",
        body: request,
      },
    );
  },

  remove(departmentId: string) {
    return apiRequest<unknown>(`/organizations/department/${departmentId}`, {
      method: "DELETE",
    });
  },

  getByOrganization(organizationId: string) {
    return apiRequest<DepartmentDTO[]>(
      `/organizations/department/${organizationId}`,
    );
  },

  getMine(organizationId: string) {
    return apiRequest<DepartmentDTO[]>(
      `/organizations/department/me/${organizationId}`,
    );
  },

  getMembers(
    departmentId: string,
    organizationId: string,
    query: { page?: number; pageSize?: number } = {},
  ) {
    return apiRequest<PaginatedResult<DepartmentMemberDTO>>(
      `/organizations/department/${departmentId}/members`,
      {
        query: {
          organizationId,
          page: 1,
          pageSize: 10,
          ...query,
        },
      },
    );
  },

  addMember(departmentId: string, request: AddDepartmentMemberRequest) {
    return apiRequest<unknown>(
      `/organizations/department/${departmentId}/members`,
      {
        method: "POST",
        body: request,
      },
    );
  },

  removeMember(departmentId: string, userId: string) {
    return apiRequest<unknown>(
      `/organizations/department/${departmentId}/members/${encodeURIComponent(
        userId,
      )}`,
      {
        method: "DELETE",
      },
    );
  },

  assignHead(departmentId: string, request: AssignDepartmentHeadRequest) {
    return apiRequest<unknown>(
      `/organizations/department/${departmentId}/head`,
      {
        method: "PUT",
        body: request,
      },
    );
  },

  removeHead(departmentId: string) {
    return apiRequest<unknown>(
      `/organizations/department/${departmentId}/head`,
      {
        method: "DELETE",
      },
    );
  },

  getDocuments(
    departmentId: string,
    query: { page?: number; pageSize?: number } = {},
  ) {
    return apiRequest<PaginatedResult<unknown>>(
      `/organizations/department/${departmentId}/documents`,
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
