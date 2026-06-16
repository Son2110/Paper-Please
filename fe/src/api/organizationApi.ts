import { apiRequest } from "./httpClient";
import type { PaginatedResult } from "./adminUserApi";
import type { UserMinimalDTO } from "./activityLogApi";

export type OrganizationRole = "Member" | "Manager" | "Administrator" | "Owner";

export interface OrganizationDTO {
  id: string;
  name: string;
  owner?: UserMinimalDTO | null;
  status: string | number;
  memberCount: number;
  taxCode?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  description?: string | null;
}

export interface OrganizationJobTitleDTO {
  id: string;
  name: string;
  description?: string | null;
  rank?: number | null;
}

export interface OrganizationMemberDTO {
  memberId?: string;
  id?: string;
  user: UserMinimalDTO;
  jobTitleId?: string | null;
  jobTitle?: OrganizationJobTitleDTO | null;
  role: OrganizationRole | number;
  isActive: boolean;
  joinedDate: string;
}

export interface CreateOrganizationRequest {
  name: string;
  taxCode?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  description?: string | null;
}

export type UpdateOrganizationRequest = CreateOrganizationRequest;

export interface InviteMemberRequest {
  email: string;
  role: OrganizationRole;
  jobTitleId?: string | null;
}

export interface CreateOrganizationJobTitleRequest {
  organizationId: string;
  name: string;
  description?: string | null;
  rank?: number | null;
}

export interface UpdateOrganizationJobTitleRequest {
  name: string;
  description?: string | null;
  rank?: number | null;
}

export interface UpdateOrganizationMemberRequest {
  role: OrganizationRole;
  jobTitleId?: string | null;
}

export interface DeleteOrganizationRequest {
  password: string;
}

export const ORGANIZATION_ROLES: OrganizationRole[] = [
  "Member",
  "Manager",
  "Administrator",
  "Owner",
];

export const organizationApi = {
  create(request: CreateOrganizationRequest) {
    return apiRequest<OrganizationDTO>("/organizations", {
      method: "POST",
      body: request,
    });
  },

  getMine() {
    return apiRequest<OrganizationDTO[]>("/organizations/me");
  },

  update(organizationId: string, request: UpdateOrganizationRequest) {
    return apiRequest<OrganizationDTO>(`/organizations/${organizationId}`, {
      method: "PUT",
      body: request,
    });
  },

  getMembers(
    organizationId: string,
    query: { searchQuery?: string; page?: number; pageSize?: number } = {},
  ) {
    return apiRequest<PaginatedResult<OrganizationMemberDTO>>(
      `/organizations/${organizationId}/members`,
      {
        query: {
          page: 1,
          pageSize: 10,
          ...query,
        },
      },
    );
  },

  inviteMember(organizationId: string, request: InviteMemberRequest) {
    return apiRequest<unknown>(`/organizations/${organizationId}/invite`, {
      method: "POST",
      body: request,
    });
  },

  createJobTitle(request: CreateOrganizationJobTitleRequest) {
    return apiRequest<OrganizationJobTitleDTO>("/organizations/job-titles", {
      method: "POST",
      body: request,
    });
  },

  updateJobTitle(id: string, request: UpdateOrganizationJobTitleRequest) {
    return apiRequest<OrganizationJobTitleDTO>(`/organizations/job-titles/${id}`, {
      method: "PUT",
      body: request,
    });
  },

  deleteJobTitle(id: string) {
    return apiRequest<unknown>(`/organizations/job-titles/${id}`, {
      method: "DELETE",
    });
  },

  getJobTitles(organizationId: string) {
    return apiRequest<OrganizationJobTitleDTO[]>(
      `/organizations/${organizationId}/job-titles`,
    );
  },

  updateMember(memberId: string, request: UpdateOrganizationMemberRequest) {
    return apiRequest<unknown>(`/organizations/members/role/${memberId}`, {
      method: "PUT",
      body: request,
    });
  },

  removeMember(memberId: string) {
    return apiRequest<unknown>(`/organizations/members/${memberId}`, {
      method: "DELETE",
    });
  },

  deleteOrganization(organizationId: string, request: DeleteOrganizationRequest) {
    return apiRequest<unknown>(`/organizations/${organizationId}`, {
      method: "DELETE",
      body: request,
    });
  },
};
