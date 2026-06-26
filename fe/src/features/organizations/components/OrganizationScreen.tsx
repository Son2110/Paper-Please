import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Check,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  departmentApi,
  type DepartmentDTO,
  type DepartmentMemberDTO,
} from "@/api/departmentApi";
import {
  ORGANIZATION_ROLES,
  organizationApi,
  type OrganizationJobTitleDTO,
  type OrganizationMemberDTO,
  type OrganizationRole,
  type UpdateOrganizationRequest,
} from "@/api/organizationApi";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { AppModal } from "@/shared/components/AppModal";
import { PageJumpInput } from "@/shared/components/PageJumpInput";

type MemberDraft = {
  role: OrganizationRole;
  jobTitleId: string;
};

type JobTitleEditForm = {
  name: string;
  description: string;
};

type DepartmentForm = {
  name: string;
  description: string;
};

type OrganizationEditForm = {
  name: string;
  taxCode: string;
  address: string;
  phoneNumber: string;
  email: string;
  description: string;
};

const DEPARTMENT_MEMBER_PAGE_SIZE = 5;
const DEPARTMENT_HEAD_PICKER_SIZE = 100;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function normalizeRole(value: OrganizationMemberDTO["role"]): OrganizationRole {
  if (typeof value === "string") return value as OrganizationRole;
  return ORGANIZATION_ROLES[value - 1] ?? "Member";
}

function roleLabel(role: OrganizationRole) {
  if (role === "Owner") return "Chủ sở hữu";
  if (role === "Administrator") return "Quản trị viên";
  if (role === "Manager") return "Quản lý";
  return "Thành viên";
}

function statusLabel(status: unknown) {
  if (status === "Active" || status === 1) return "Đang hoạt động";
  if (status === "Inactive" || status === 2) return "Tạm dừng";
  return "Chưa rõ";
}

function isOrgAdmin(role?: OrganizationMemberDTO["role"]) {
  const normalized = role ? normalizeRole(role) : "Member";
  return normalized === "Owner" || normalized === "Administrator";
}

function getMembershipId(member: OrganizationMemberDTO) {
  return member.memberId ?? member.id ?? "";
}

function memberName(member: OrganizationMemberDTO) {
  return member.user?.displayName || member.user?.email || "Người dùng";
}

export function OrganizationScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    activeOrganization,
    activeOrganizationId,
    isLoading,
    error,
    refreshOrganizations,
  } = useOrganization();

  const [memberPage, setMemberPage] = useState(1);
  const [memberSearchInput, setMemberSearchInput] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("Member");
  const [inviteJobTitleId, setInviteJobTitleId] = useState("");
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [jobTitleName, setJobTitleName] = useState("");
  const [jobTitleDescription, setJobTitleDescription] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentDescription, setDepartmentDescription] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | null
  >(null);
  const [departmentMemberPage, setDepartmentMemberPage] = useState(1);
  const [showCreateDepartmentModal, setShowCreateDepartmentModal] =
    useState(false);
  const [showDepartmentMemberModal, setShowDepartmentMemberModal] =
    useState(false);
  const [showDepartmentHeadModal, setShowDepartmentHeadModal] = useState(false);
  const [departmentMemberUserId, setDepartmentMemberUserId] = useState("");
  const [departmentMemberSearch, setDepartmentMemberSearch] = useState("");
  const [departmentHeadSearch, setDepartmentHeadSearch] = useState("");
  const [memberDrafts, setMemberDrafts] = useState<Record<string, MemberDraft>>(
    {},
  );
  const [editingJobTitleId, setEditingJobTitleId] = useState<string | null>(
    null,
  );
  const [jobTitleEditForm, setJobTitleEditForm] = useState<JobTitleEditForm>({
    name: "",
    description: "",
  });
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(
    null,
  );
  const [departmentEditForm, setDepartmentEditForm] = useState<DepartmentForm>({
    name: "",
    description: "",
  });
  const [showDeleteOrganization, setShowDeleteOrganization] = useState(false);
  const [showEditOrganization, setShowEditOrganization] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] =
    useState<OrganizationMemberDTO | null>(null);
  const [deleteJobTitleTarget, setDeleteJobTitleTarget] =
    useState<OrganizationJobTitleDTO | null>(null);
  const [deleteDepartmentTarget, setDeleteDepartmentTarget] =
    useState<DepartmentDTO | null>(null);
  const [removeDepartmentMemberTarget, setRemoveDepartmentMemberTarget] =
    useState<DepartmentMemberDTO | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [organizationEditForm, setOrganizationEditForm] =
    useState<OrganizationEditForm>({
      name: "",
      taxCode: "",
      address: "",
      phoneNumber: "",
      email: "",
      description: "",
    });

  const membersQuery = useQuery({
    queryKey: queryKeys.organizations.members(activeOrganizationId, {
      page: memberPage,
      pageSize: 8,
      searchQuery: memberSearch,
    }),
    queryFn: () =>
      organizationApi.getMembers(activeOrganizationId ?? "", {
        searchQuery: memberSearch || undefined,
        page: memberPage,
        pageSize: 8,
      }),
    enabled: Boolean(activeOrganizationId),
    staleTime: 30_000,
  });

  const jobTitlesQuery = useQuery({
    queryKey: queryKeys.organizations.jobTitles(activeOrganizationId),
    queryFn: () => organizationApi.getJobTitles(activeOrganizationId ?? ""),
    enabled: Boolean(activeOrganizationId),
    staleTime: 30_000,
  });

  const departmentsQuery = useQuery({
    queryKey: queryKeys.departments.byOrganization(activeOrganizationId),
    queryFn: () => departmentApi.getByOrganization(activeOrganizationId ?? ""),
    enabled: Boolean(activeOrganizationId),
    staleTime: 30_000,
    retry: false,
  });

  const currentMembershipQuery = useQuery({
    queryKey: queryKeys.organizations.currentMembership(
      activeOrganizationId,
      user?.id,
    ),
    queryFn: () =>
      organizationApi.getMembers(activeOrganizationId ?? "", {
        page: 1,
        pageSize: 100,
      }),
    enabled: Boolean(activeOrganizationId && user?.id),
    staleTime: 30_000,
  });

  const departmentMembersQuery = useQuery({
    queryKey: queryKeys.departments.members(selectedDepartmentId, {
      organizationId: activeOrganizationId,
      page: departmentMemberPage,
      pageSize: DEPARTMENT_MEMBER_PAGE_SIZE,
    }),
    queryFn: () =>
      departmentApi.getMembers(
        selectedDepartmentId ?? "",
        activeOrganizationId ?? "",
        {
          page: departmentMemberPage,
          pageSize: DEPARTMENT_MEMBER_PAGE_SIZE,
        },
      ),
    enabled: Boolean(activeOrganizationId && selectedDepartmentId),
    staleTime: 30_000,
    retry: false,
  });

  const departmentHeadCandidatesQuery = useQuery({
    queryKey: queryKeys.departments.members(selectedDepartmentId, {
      organizationId: activeOrganizationId,
      page: 1,
      pageSize: DEPARTMENT_HEAD_PICKER_SIZE,
      picker: "head",
    }),
    queryFn: () =>
      departmentApi.getMembers(
        selectedDepartmentId ?? "",
        activeOrganizationId ?? "",
        {
          page: 1,
          pageSize: DEPARTMENT_HEAD_PICKER_SIZE,
        },
      ),
    enabled: Boolean(activeOrganizationId && selectedDepartmentId),
    staleTime: 30_000,
    retry: false,
  });

  const members = membersQuery.data?.items ?? [];
  const jobTitles = jobTitlesQuery.data ?? [];
  const departments = useMemo(
    () => departmentsQuery.data ?? [],
    [departmentsQuery.data],
  );
  const selectedDepartment =
    departments.find((department) => department.id === selectedDepartmentId) ??
    departments[0] ??
    null;
  const departmentMembers = departmentMembersQuery.data?.items ?? [];
  const departmentHeadCandidates =
    departmentHeadCandidatesQuery.data?.items ?? departmentMembers;
  const filteredDepartmentHeadCandidates = useMemo(() => {
    const keyword = departmentHeadSearch.trim().toLowerCase();
    if (!keyword) return departmentHeadCandidates;
    return departmentHeadCandidates.filter((member) =>
      [member.displayName, member.email, member.jobTitle]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword)),
    );
  }, [departmentHeadCandidates, departmentHeadSearch]);
  const departmentMemberTotalPages = Math.max(
    1,
    departmentMembersQuery.data?.totalPages ?? 1,
  );
  const organizationMemberOptions =
    currentMembershipQuery.data?.items ?? members;
  const filteredOrganizationMemberOptions = useMemo(() => {
    const keyword = departmentMemberSearch.trim().toLowerCase();
    if (!keyword) return organizationMemberOptions;
    return organizationMemberOptions.filter((member) =>
      [memberName(member), member.user?.email, member.jobTitle?.name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword)),
    );
  }, [departmentMemberSearch, organizationMemberOptions]);
  const totalMemberPages = Math.max(1, membersQuery.data?.totalPages ?? 1);
  const currentMembership = useMemo(
    () =>
      (currentMembershipQuery.data?.items ?? []).find(
        (member) => member.user?.id === user?.id,
      ),
    [currentMembershipQuery.data?.items, user?.id],
  );
  const canManage = isOrgAdmin(currentMembership?.role);
  const isOwner = currentMembership
    ? normalizeRole(currentMembership.role) === "Owner"
    : activeOrganization?.owner?.id === user?.id;
  const memberIdMissing = members.some((member) => !getMembershipId(member));

  useEffect(() => {
    if (!departments.length) {
      setSelectedDepartmentId(null);
      return;
    }

    if (!selectedDepartmentId) {
      setSelectedDepartmentId(departments[0].id);
      return;
    }

    if (
      !departments.some((department) => department.id === selectedDepartmentId)
    ) {
      setSelectedDepartmentId(departments[0].id);
    }
  }, [departments, selectedDepartmentId]);

  useEffect(() => {
    setDepartmentMemberPage(1);
  }, [selectedDepartmentId]);

  useEffect(() => {
    if (departmentMemberPage > departmentMemberTotalPages) {
      setDepartmentMemberPage(departmentMemberTotalPages);
    }
  }, [departmentMemberPage, departmentMemberTotalPages]);

  const getMemberDraft = (member: OrganizationMemberDTO): MemberDraft => {
    const membershipId = getMembershipId(member);
    return (
      memberDrafts[membershipId] ?? {
        role: normalizeRole(member.role),
        jobTitleId: member.jobTitleId ?? "",
      }
    );
  };

  const hasMemberDraftChanged = (member: OrganizationMemberDTO) => {
    const draft = getMemberDraft(member);
    return (
      draft.role !== normalizeRole(member.role) ||
      draft.jobTitleId !== (member.jobTitleId ?? "")
    );
  };

  const updateMemberDraft = (
    member: OrganizationMemberDTO,
    patch: Partial<MemberDraft>,
  ) => {
    const membershipId = getMembershipId(member);
    if (!membershipId) return;

    setMemberDrafts((prev) => ({
      ...prev,
      [membershipId]: {
        ...getMemberDraft(member),
        ...patch,
      },
    }));
  };

  const resetMemberDraft = (member: OrganizationMemberDTO) => {
    const membershipId = getMembershipId(member);
    if (!membershipId) return;

    setMemberDrafts((prev) => {
      const next = { ...prev };
      delete next[membershipId];
      return next;
    });
  };

  const invalidateOrganization = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    refreshOrganizations();
  };

  const invalidateDepartments = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
  };

  const invalidateDepartmentMembers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
  };

  const deleteOrganizationMutation = useMutation({
    mutationFn: () =>
      organizationApi.deleteOrganization(activeOrganizationId ?? "", {
        password: deletePassword,
      }),
    onSuccess: async () => {
      toast.success("Đã xóa tổ chức");
      setShowDeleteOrganization(false);
      setDeletePassword("");
      await refreshOrganizations();
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể xóa tổ chức");
    },
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: () =>
      organizationApi.update(activeOrganizationId ?? "", {
        name: organizationEditForm.name.trim(),
        taxCode: organizationEditForm.taxCode.trim() || null,
        address: organizationEditForm.address.trim() || null,
        phoneNumber: organizationEditForm.phoneNumber.trim() || null,
        email: organizationEditForm.email.trim() || null,
        logoUrl: null,
        description: organizationEditForm.description.trim() || null,
      } satisfies UpdateOrganizationRequest),
    onSuccess: async () => {
      toast.success("Đã cập nhật tổ chức");
      setShowEditOrganization(false);
      await refreshOrganizations();
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật tổ chức",
      );
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      organizationApi.inviteMember(activeOrganizationId ?? "", {
        email: inviteEmail.trim(),
        role: inviteRole,
        jobTitleId: inviteJobTitleId || null,
      }),
    onSuccess: () => {
      toast.success("Đã thêm thành viên");
      setShowInviteMember(false);
      setInviteEmail("");
      setInviteRole("Member");
      setInviteJobTitleId("");
      invalidateOrganization();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể thêm thành viên",
      );
    },
  });

  const createJobTitleMutation = useMutation({
    mutationFn: () =>
      organizationApi.createJobTitle({
        organizationId: activeOrganizationId ?? "",
        name: jobTitleName.trim(),
        description: jobTitleDescription.trim() || null,
        rank: null,
      }),
    onSuccess: () => {
      toast.success("Đã tạo chức danh");
      setJobTitleName("");
      setJobTitleDescription("");
      invalidateOrganization();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể tạo chức danh",
      );
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: () =>
      departmentApi.create({
        organizationId: activeOrganizationId ?? "",
        name: departmentName.trim(),
        description: departmentDescription.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Đã tạo phòng ban");
      setDepartmentName("");
      setDepartmentDescription("");
      setShowCreateDepartmentModal(false);
      setShowDepartmentMemberModal(false);
      setShowDepartmentHeadModal(false);
      setDepartmentMemberUserId("");
      setDepartmentMemberSearch("");
      invalidateDepartments();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể tạo phòng ban",
      );
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: DepartmentForm }) =>
      departmentApi.update(id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Đã cập nhật phòng ban");
      setEditingDepartmentId(null);
      invalidateDepartments();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật phòng ban",
      );
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: departmentApi.remove,
    onSuccess: () => {
      toast.success("Đã xóa phòng ban");
      setDeleteDepartmentTarget(null);
      invalidateDepartments();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa phòng ban",
      );
    },
  });

  const addDepartmentMemberMutation = useMutation({
    mutationFn: ({
      departmentId,
      userId,
    }: {
      departmentId: string;
      userId: string;
    }) => departmentApi.addMember(departmentId, { userId }),
    onSuccess: () => {
      toast.success("Đã thêm thành viên vào phòng ban");
      setShowDepartmentMemberModal(false);
      setDepartmentMemberUserId("");
      invalidateDepartments();
      invalidateDepartmentMembers();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể thêm thành viên",
      );
    },
  });

  const assignDepartmentHeadMutation = useMutation({
    mutationFn: ({
      departmentId,
      userId,
    }: {
      departmentId: string;
      userId: string;
    }) => departmentApi.assignHead(departmentId, { userId }),
    onSuccess: () => {
      toast.success("Đã gán trưởng phòng");
      setShowDepartmentHeadModal(false);
      setDepartmentMemberUserId("");
      invalidateDepartments();
      invalidateDepartmentMembers();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể gán trưởng phòng",
      );
    },
  });

  const removeDepartmentMemberMutation = useMutation({
    mutationFn: ({
      departmentId,
      userId,
    }: {
      departmentId: string;
      userId: string;
    }) => departmentApi.removeMember(departmentId, userId),
    onSuccess: () => {
      toast.success("Đã gỡ thành viên khỏi phòng ban");
      setRemoveDepartmentMemberTarget(null);
      invalidateDepartments();
      invalidateDepartmentMembers();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể gỡ thành viên",
      );
    },
  });

  const removeDepartmentHeadMutation = useMutation({
    mutationFn: departmentApi.removeHead,
    onSuccess: () => {
      toast.success("Đã bỏ trưởng phòng");
      invalidateDepartments();
      invalidateDepartmentMembers();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể bỏ trưởng phòng",
      );
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({
      memberId,
      role,
      jobTitleId,
    }: {
      memberId: string;
      role: OrganizationRole;
      jobTitleId?: string | null;
    }) =>
      organizationApi.updateMember(memberId, {
        role,
        jobTitleId: jobTitleId || null,
      }),
    onSuccess: () => {
      toast.success("Đã cập nhật thành viên");
      setMemberDrafts({});
      invalidateOrganization();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật thành viên",
      );
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: organizationApi.removeMember,
    onSuccess: () => {
      toast.success("Đã xóa thành viên");
      setRemoveMemberTarget(null);
      invalidateOrganization();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa thành viên",
      );
    },
  });

  const deleteJobTitleMutation = useMutation({
    mutationFn: organizationApi.deleteJobTitle,
    onSuccess: () => {
      toast.success("Đã xóa chức danh");
      setDeleteJobTitleTarget(null);
      invalidateOrganization();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa chức danh",
      );
    },
  });

  const updateJobTitleMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: JobTitleEditForm }) =>
      organizationApi.updateJobTitle(id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        rank: null,
      }),
    onSuccess: () => {
      toast.success("Đã cập nhật chức danh");
      setEditingJobTitleId(null);
      invalidateOrganization();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật chức danh",
      );
    },
  });

  const handleInvite = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeOrganizationId || !inviteEmail.trim()) {
      toast.error("Vui lòng nhập email thành viên");
      return;
    }
    inviteMutation.mutate();
  };

  const handleCreateJobTitle = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeOrganizationId || !jobTitleName.trim()) {
      toast.error("Vui lòng nhập tên chức danh");
      return;
    }
    createJobTitleMutation.mutate();
  };

  const handleCreateDepartment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeOrganizationId || !departmentName.trim()) {
      toast.error("Vui lòng nhập tên phòng ban");
      return;
    }
    createDepartmentMutation.mutate();
  };

  const handleSaveMember = (member: OrganizationMemberDTO) => {
    const membershipId = getMembershipId(member);
    if (!membershipId) return;

    const draft = getMemberDraft(member);
    updateMemberMutation.mutate({
      memberId: membershipId,
      role: draft.role,
      jobTitleId: draft.jobTitleId || null,
    });
  };

  const handleRemoveMember = (member: OrganizationMemberDTO) => {
    const membershipId = getMembershipId(member);
    if (!membershipId) return;
    setRemoveMemberTarget(member);
  };

  const confirmRemoveMember = () => {
    if (!removeMemberTarget) return;
    const membershipId = getMembershipId(removeMemberTarget);
    if (!membershipId) return;
    removeMemberMutation.mutate(membershipId);
  };

  const handleStartEditJobTitle = (title: OrganizationJobTitleDTO) => {
    setEditingJobTitleId(title.id);
    setJobTitleEditForm({
      name: title.name,
      description: title.description ?? "",
    });
  };

  const handleSaveJobTitle = (title: OrganizationJobTitleDTO) => {
    if (!jobTitleEditForm.name.trim()) {
      toast.error("Vui lòng nhập tên chức danh");
      return;
    }

    updateJobTitleMutation.mutate({
      id: title.id,
      form: jobTitleEditForm,
    });
  };

  const handleDeleteJobTitle = (title: OrganizationJobTitleDTO) => {
    setDeleteJobTitleTarget(title);
  };

  const confirmDeleteJobTitle = () => {
    if (!deleteJobTitleTarget) return;
    deleteJobTitleMutation.mutate(deleteJobTitleTarget.id);
  };

  const handleStartEditDepartment = (department: DepartmentDTO) => {
    setEditingDepartmentId(department.id);
    setDepartmentEditForm({
      name: department.name,
      description: department.description ?? "",
    });
  };

  const handleSaveDepartment = (department: DepartmentDTO) => {
    if (!departmentEditForm.name.trim()) {
      toast.error("Vui lòng nhập tên phòng ban");
      return;
    }

    updateDepartmentMutation.mutate({
      id: department.id,
      form: departmentEditForm,
    });
  };

  const openDepartmentMemberModal = (department: DepartmentDTO) => {
    setSelectedDepartmentId(department.id);
    setDepartmentMemberUserId("");
    setDepartmentMemberSearch("");
    setShowDepartmentMemberModal(true);
  };

  const openDepartmentHeadModal = (department: DepartmentDTO) => {
    setSelectedDepartmentId(department.id);
    setDepartmentMemberUserId("");
    setDepartmentHeadSearch("");
    setShowDepartmentHeadModal(true);
  };

  const handleAddDepartmentMember = () => {
    if (!selectedDepartment || !departmentMemberUserId) {
      toast.error("Vui lòng chọn thành viên");
      return;
    }

    addDepartmentMemberMutation.mutate({
      departmentId: selectedDepartment.id,
      userId: departmentMemberUserId,
    });
  };

  const handleAssignDepartmentHead = () => {
    if (!selectedDepartment || !departmentMemberUserId) {
      toast.error("Vui lòng chọn thành viên");
      return;
    }

    assignDepartmentHeadMutation.mutate({
      departmentId: selectedDepartment.id,
      userId: departmentMemberUserId,
    });
  };

  const confirmRemoveDepartmentMember = () => {
    if (!selectedDepartment || !removeDepartmentMemberTarget) return;

    removeDepartmentMemberMutation.mutate({
      departmentId: selectedDepartment.id,
      userId: removeDepartmentMemberTarget.userId,
    });
  };

  const handleRemoveDepartmentHead = () => {
    if (!selectedDepartment) return;
    removeDepartmentHeadMutation.mutate(selectedDepartment.id);
  };

  const confirmDeleteDepartment = () => {
    if (!deleteDepartmentTarget) return;
    deleteDepartmentMutation.mutate(deleteDepartmentTarget.id);
  };

  const handleDeleteOrganization = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeOrganizationId || !deletePassword.trim()) {
      toast.error("Vui lòng nhập mật khẩu để xóa tổ chức");
      return;
    }
    deleteOrganizationMutation.mutate();
  };

  const openEditOrganization = () => {
    if (!activeOrganization) return;
    setOrganizationEditForm({
      name: activeOrganization.name ?? "",
      taxCode: activeOrganization.taxCode ?? "",
      address: activeOrganization.address ?? "",
      phoneNumber: activeOrganization.phoneNumber ?? "",
      email: activeOrganization.email ?? "",
      description: activeOrganization.description ?? "",
    });
    setShowEditOrganization(true);
  };

  const handleUpdateOrganization = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeOrganizationId || !organizationEditForm.name.trim()) {
      toast.error("Vui lòng nhập tên tổ chức");
      return;
    }
    updateOrganizationMutation.mutate();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quản trị tổ chức
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {activeOrganization?.name || "Tổ chức"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Màn này chỉ quản lý tổ chức đang được chọn. Đổi tổ chức ở thanh trên
            cùng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refreshOrganizations()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
          {activeOrganization && isOwner && (
            <>
              <button
                type="button"
                onClick={openEditOrganization}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
              >
                <Pencil className="h-4 w-4" />
                Sửa tổ chức
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteOrganization(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-card px-4 text-sm font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Xóa tổ chức
              </button>
            </>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải tổ chức...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {activeOrganization && (
        <section className="rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">
              Thông tin tổ chức hiện tại
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Các thay đổi bên dưới chỉ áp dụng cho tổ chức đang chọn.
            </p>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-foreground">
                    {activeOrganization.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeOrganization.description || "Chưa có mô tả tổ chức."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                <span className="text-muted-foreground">Trạng thái</span>
                <span className="font-semibold text-foreground">
                  {statusLabel(activeOrganization.status)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                <span className="text-muted-foreground">Thành viên</span>
                <span className="font-semibold text-foreground">
                  {activeOrganization.memberCount}
                </span>
              </div>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:col-span-2 xl:grid-cols-4">
              <div className="rounded-lg border bg-background p-3">
                <dt className="text-muted-foreground">Mã số thuế</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {activeOrganization.taxCode || "-"}
                </dd>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="mt-1 truncate font-medium text-foreground">
                  {activeOrganization.email || "-"}
                </dd>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <dt className="text-muted-foreground">Điện thoại</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {activeOrganization.phoneNumber || "-"}
                </dd>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <dt className="text-muted-foreground">Địa chỉ</dt>
                <dd className="mt-1 line-clamp-2 font-medium text-foreground">
                  {activeOrganization.address || "-"}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}

      {activeOrganization && (
        <>
          <section className="rounded-lg border bg-card">
            <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Thành viên - {activeOrganization.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mời người dùng đã đăng ký và phân quyền trong tổ chức.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={memberSearchInput}
                    onChange={(event) =>
                      setMemberSearchInput(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setMemberPage(1);
                        setMemberSearch(memberSearchInput.trim());
                      }
                    }}
                    placeholder="Tìm thành viên"
                    className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-64"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMemberPage(1);
                    setMemberSearch(memberSearchInput.trim());
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
                >
                  <Search className="h-4 w-4" />
                  Tìm
                </button>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setShowInviteMember(true)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <UserPlus className="h-4 w-4" />
                    Thêm thành viên
                  </button>
                )}
              </div>
            </div>

            {memberIdMissing && (
              <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Một vài thành viên chưa có mã thành viên trong phản hồi API, nên
                thao tác sửa hoặc xóa tạm thời bị khóa.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                      Thành viên
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                      Quyền
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                      Chức danh
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                      Ngày vào
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {membersQuery.isLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải thành viên...
                        </span>
                      </td>
                    </tr>
                  )}
                  {members.length === 0 && !membersQuery.isLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        Chưa có thành viên nào.
                      </td>
                    </tr>
                  )}
                  {members.map((member, index) => {
                    const membershipId = getMembershipId(member);
                    const role = normalizeRole(member.role);
                    const draft = getMemberDraft(member);
                    const hasChanges = hasMemberDraftChanged(member);
                    const isOwner = role === "Owner";
                    const canEditMember = canManage && Boolean(membershipId);

                    return (
                      <tr
                        key={membershipId || `${member.user?.id}-${index}`}
                        className="border-t"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {memberName(member)}
                          </div>
                          <details className="mt-1 text-xs text-muted-foreground">
                            <summary className="cursor-pointer hover:text-foreground">
                              Chi tiết
                            </summary>
                            <div className="mt-2 space-y-1 rounded-lg bg-muted/50 p-2">
                              <div>Email: {member.user?.email || "-"}</div>
                              <div>Quyền: {roleLabel(role)}</div>
                              <div>
                                Chức danh: {member.jobTitle?.name || "-"}
                              </div>
                            </div>
                          </details>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={draft.role}
                            disabled={!canEditMember || isOwner}
                            onChange={(event) =>
                              updateMemberDraft(member, {
                                role: event.target.value as OrganizationRole,
                              })
                            }
                            className="h-9 min-w-36 rounded-lg border bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {ORGANIZATION_ROLES.map((roleOption) => (
                              <option key={roleOption} value={roleOption}>
                                {roleLabel(roleOption)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={draft.jobTitleId}
                            disabled={!canEditMember}
                            onChange={(event) =>
                              updateMemberDraft(member, {
                                jobTitleId: event.target.value,
                              })
                            }
                            className="h-9 min-w-44 rounded-lg border bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">Không gán chức danh</option>
                            {jobTitles.map((title) => (
                              <option key={title.id} value={title.id}>
                                {title.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(member.joinedDate)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {hasChanges && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => resetMemberDraft(member)}
                                  disabled={updateMemberMutation.isPending}
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <X className="h-4 w-4" />
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveMember(member)}
                                  disabled={
                                    !canEditMember ||
                                    updateMemberMutation.isPending
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {updateMemberMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                  Lưu
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member)}
                              disabled={
                                !canEditMember ||
                                isOwner ||
                                removeMemberMutation.isPending
                              }
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Tổng: {membersQuery.data?.totalItems ?? 0} thành viên
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMemberPage((value) => Math.max(1, value - 1))
                  }
                  disabled={memberPage <= 1}
                  className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trước
                </button>
                <span className="text-sm text-muted-foreground">
                  Trang {memberPage}/{totalMemberPages}
                </span>
                <PageJumpInput
                  page={memberPage}
                  totalPages={totalMemberPages}
                  onPageChange={setMemberPage}
                />
                <button
                  type="button"
                  onClick={() =>
                    setMemberPage((value) =>
                      Math.min(totalMemberPages, value + 1),
                    )
                  }
                  disabled={memberPage >= totalMemberPages}
                  className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card">
            <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Phòng ban
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Phân nhóm thành viên và tài liệu theo bộ phận trong tổ chức.
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setDepartmentName("");
                    setDepartmentDescription("");
                    setShowCreateDepartmentModal(true);
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Building2 className="h-4 w-4" />
                  Tạo phòng ban
                </button>
              )}
            </div>

            <div className="grid min-h-[360px] gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="border-b p-4 lg:border-b-0 lg:border-r">
                {departmentsQuery.isLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tải phòng ban...
                  </div>
                )}
                {departmentsQuery.isError && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    API phòng ban chưa sẵn sàng trên môi trường hiện tại.
                  </div>
                )}
                {departments.length === 0 &&
                  !departmentsQuery.isLoading &&
                  !departmentsQuery.isError && (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Chưa có phòng ban nào.
                    </div>
                  )}
                <div className="space-y-2">
                  {departments.map((department) => (
                    <button
                      key={department.id}
                      type="button"
                      onClick={() => setSelectedDepartmentId(department.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition hover:bg-muted ${
                        selectedDepartment?.id === department.id
                          ? "border-primary bg-primary/5"
                          : "bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {department.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {department.headName || "Chưa gán trưởng phòng"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                          {department.memberCount}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5">
                {!selectedDepartment ? (
                  <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    Chọn một phòng ban để xem chi tiết.
                  </div>
                ) : editingDepartmentId === selectedDepartment.id ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Sửa phòng ban
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Cập nhật tên và mô tả phòng ban.
                      </p>
                    </div>
                    <input
                      value={departmentEditForm.name}
                      onChange={(event) =>
                        setDepartmentEditForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Tên phòng ban"
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <textarea
                      value={departmentEditForm.description}
                      onChange={(event) =>
                        setDepartmentEditForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Mô tả"
                      rows={3}
                      className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingDepartmentId(null)}
                        disabled={updateDepartmentMutation.isPending}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X className="h-4 w-4" />
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveDepartment(selectedDepartment)}
                        disabled={
                          !canManage || updateDepartmentMutation.isPending
                        }
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {updateDepartmentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-bold text-foreground">
                          {selectedDepartment.name}
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                          {selectedDepartment.description || "Chưa có mô tả."}
                        </p>
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleStartEditDepartment(selectedDepartment)
                            }
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
                          >
                            <Pencil className="h-4 w-4" />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteDepartmentTarget(selectedDepartment)
                            }
                            disabled={deleteDepartmentMutation.isPending}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-destructive/30 px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border bg-background p-4">
                        <p className="text-sm text-muted-foreground">
                          Trưởng phòng
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-base font-semibold text-foreground">
                            {selectedDepartment.headName || "Chưa gán"}
                          </p>
                          {canManage && selectedDepartment.headId && (
                            <button
                              type="button"
                              onClick={handleRemoveDepartmentHead}
                              disabled={removeDepartmentHeadMutation.isPending}
                              className="shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {removeDepartmentHeadMutation.isPending
                                ? "Đang gỡ"
                                : "Bỏ"}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border bg-background p-4">
                        <p className="text-sm text-muted-foreground">
                          Thành viên
                        </p>
                        <p className="mt-1 text-base font-semibold text-foreground">
                          {selectedDepartment.memberCount}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-background">
                      <div className="border-b px-4 py-3">
                        <h4 className="text-sm font-semibold text-foreground">
                          Thành viên trong phòng ban
                        </h4>
                      </div>
                      <div className="divide-y">
                        {departmentMembersQuery.isLoading && (
                          <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải thành viên...
                          </div>
                        )}
                        {departmentMembersQuery.isError && (
                          <div className="px-4 py-5 text-sm text-muted-foreground">
                            Chưa tải được danh sách thành viên phòng ban.
                          </div>
                        )}
                        {!departmentMembersQuery.isLoading &&
                          !departmentMembersQuery.isError &&
                          departmentMembers.length === 0 && (
                            <div className="px-4 py-5 text-sm text-muted-foreground">
                              Phòng ban này chưa có thành viên.
                            </div>
                          )}
                        {departmentMembers.map((member) => (
                          <div
                            key={member.userId}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {member.displayName || member.email}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {member.email}
                                {member.jobTitle ? ` · ${member.jobTitle}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {member.isDepartmentHead && (
                                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                  Trưởng phòng
                                </span>
                              )}
                              {!member.isDepartmentHead && (
                                <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                  Thành viên
                                </span>
                              )}
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRemoveDepartmentMemberTarget(member)
                                  }
                                  disabled={
                                    member.isDepartmentHead ||
                                    removeDepartmentMemberMutation.isPending
                                  }
                                  className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                                  title={
                                    member.isDepartmentHead
                                      ? "Bỏ hoặc đổi trưởng phòng trước"
                                      : "Gỡ khỏi phòng ban"
                                  }
                                >
                                  Gỡ
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {departmentMemberTotalPages > 1 && (
                        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
                          <p className="text-xs text-muted-foreground">
                            Trang {departmentMemberPage}/
                            {departmentMemberTotalPages}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDepartmentMemberPage((value) =>
                                  Math.max(1, value - 1),
                                )
                              }
                              disabled={departmentMemberPage <= 1}
                              className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Trước
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDepartmentMemberPage((value) =>
                                  Math.min(
                                    departmentMemberTotalPages,
                                    value + 1,
                                  ),
                                )
                              }
                              disabled={
                                departmentMemberPage >=
                                departmentMemberTotalPages
                              }
                              className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Sau
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openDepartmentMemberModal(selectedDepartment)
                          }
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold hover:bg-muted"
                        >
                          <UserPlus className="h-4 w-4" />
                          Thêm thành viên
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openDepartmentHeadModal(selectedDepartment)
                          }
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          <Check className="h-4 w-4" />
                          Gán trưởng phòng
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                Chức danh trong tổ chức
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Chức danh là vị trí công việc, tách biệt với quyền trong tổ
                chức.
              </p>
            </div>
            <form
              onSubmit={handleCreateJobTitle}
              className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.5fr)_140px]"
            >
              <input
                value={jobTitleName}
                onChange={(event) => setJobTitleName(event.target.value)}
                placeholder="Tên chức danh"
                className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                value={jobTitleDescription}
                onChange={(event) => setJobTitleDescription(event.target.value)}
                placeholder="Mô tả"
                className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={!canManage || createJobTitleMutation.isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createJobTitleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BriefcaseBusiness className="h-4 w-4" />
                )}
                Tạo
              </button>
            </form>

            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {jobTitlesQuery.isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải chức danh...
                </div>
              )}
              {jobTitles.length === 0 && !jobTitlesQuery.isLoading && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Chưa có chức danh nào.
                </div>
              )}
              {jobTitles.map((title: OrganizationJobTitleDTO) => {
                const isEditing = editingJobTitleId === title.id;

                return (
                  <div
                    key={title.id}
                    className="rounded-lg border bg-background p-4"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          value={jobTitleEditForm.name}
                          onChange={(event) =>
                            setJobTitleEditForm((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Tên chức danh"
                          className="h-10 w-full rounded-lg border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          value={jobTitleEditForm.description}
                          onChange={(event) =>
                            setJobTitleEditForm((prev) => ({
                              ...prev,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Mô tả"
                          className="h-10 w-full rounded-lg border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingJobTitleId(null)}
                            disabled={updateJobTitleMutation.isPending}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <X className="h-4 w-4" />
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveJobTitle(title)}
                            disabled={
                              !canManage || updateJobTitleMutation.isPending
                            }
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {updateJobTitleMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">
                            {title.name}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {title.description || "Không có mô tả"}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditJobTitle(title)}
                            disabled={!canManage}
                            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            title="Sửa chức danh"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJobTitle(title)}
                            disabled={
                              !canManage || deleteJobTitleMutation.isPending
                            }
                            className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                            title="Xóa chức danh"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {activeOrganization && (
        <AppModal
          open={showInviteMember}
          onOpenChange={(open) => {
            if (!open && !inviteMutation.isPending) {
              setShowInviteMember(false);
            }
          }}
          title="Thêm thành viên"
          description={`Mời người dùng đã đăng ký vào ${activeOrganization.name}.`}
          className="max-w-lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowInviteMember(false)}
                disabled={inviteMutation.isPending}
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="invite-member-form"
                disabled={inviteMutation.isPending || !inviteEmail.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Thêm thành viên
              </button>
            </>
          }
        >
          <form
            id="invite-member-form"
            onSubmit={handleInvite}
            className="space-y-4"
          >
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              <span>Email người dùng</span>
              <input
                type="email"
                required
                autoFocus
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@example.com"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium text-foreground">
                <span>Quyền trong tổ chức</span>
                <select
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as OrganizationRole)
                  }
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {ORGANIZATION_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-foreground">
                <span>Chức danh</span>
                <select
                  value={inviteJobTitleId}
                  onChange={(event) => setInviteJobTitleId(event.target.value)}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Không chọn chức danh</option>
                  {jobTitles.map((title) => (
                    <option key={title.id} value={title.id}>
                      {title.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </form>
        </AppModal>
      )}

      {activeOrganization && (
        <AppModal
          open={showEditOrganization}
          onOpenChange={(open) => {
            if (!open && !updateOrganizationMutation.isPending) {
              setShowEditOrganization(false);
            }
          }}
          title="Sửa thông tin tổ chức"
          description="Cập nhật thông tin hiển thị cho tổ chức đang chọn."
          className="max-w-2xl"
        >
          <form onSubmit={handleUpdateOrganization} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-foreground md:col-span-2">
                <span>Tên tổ chức</span>
                <input
                  required
                  value={organizationEditForm.name}
                  onChange={(event) =>
                    setOrganizationEditForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-foreground">
                <span>Mã số thuế</span>
                <input
                  value={organizationEditForm.taxCode}
                  onChange={(event) =>
                    setOrganizationEditForm((prev) => ({
                      ...prev,
                      taxCode: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-foreground">
                <span>Email liên hệ</span>
                <input
                  type="email"
                  value={organizationEditForm.email}
                  onChange={(event) =>
                    setOrganizationEditForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-foreground">
                <span>Số điện thoại</span>
                <input
                  value={organizationEditForm.phoneNumber}
                  onChange={(event) =>
                    setOrganizationEditForm((prev) => ({
                      ...prev,
                      phoneNumber: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-foreground">
                <span>Địa chỉ</span>
                <input
                  value={organizationEditForm.address}
                  onChange={(event) =>
                    setOrganizationEditForm((prev) => ({
                      ...prev,
                      address: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-foreground md:col-span-2">
                <span>Mô tả</span>
                <textarea
                  value={organizationEditForm.description}
                  onChange={(event) =>
                    setOrganizationEditForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowEditOrganization(false)}
                disabled={updateOrganizationMutation.isPending}
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateOrganizationMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateOrganizationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Lưu thay đổi
              </button>
            </div>
          </form>
        </AppModal>
      )}

      <AppModal
        open={showCreateDepartmentModal}
        onOpenChange={(open) => {
          if (!open && !createDepartmentMutation.isPending) {
            setShowCreateDepartmentModal(false);
            setDepartmentName("");
            setDepartmentDescription("");
          }
        }}
        title="Tạo phòng ban"
        description="Tạo nhóm làm việc để phân loại thành viên và tài liệu trong tổ chức."
        className="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowCreateDepartmentModal(false);
                setDepartmentName("");
                setDepartmentDescription("");
              }}
              disabled={createDepartmentMutation.isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="create-department-form"
              disabled={
                createDepartmentMutation.isPending || !departmentName.trim()
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createDepartmentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              Tạo phòng ban
            </button>
          </>
        }
      >
        <form
          id="create-department-form"
          onSubmit={handleCreateDepartment}
          className="space-y-4"
        >
          <label className="space-y-1.5 text-sm font-medium text-foreground">
            <span>Tên phòng ban</span>
            <input
              value={departmentName}
              onChange={(event) => setDepartmentName(event.target.value)}
              placeholder="Ví dụ: Kế toán"
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-foreground">
            <span>Mô tả</span>
            <textarea
              value={departmentDescription}
              onChange={(event) => setDepartmentDescription(event.target.value)}
              rows={3}
              placeholder="Mô tả ngắn về trách nhiệm của phòng ban."
              className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </form>
      </AppModal>

      <AppModal
        open={Boolean(removeMemberTarget)}
        onOpenChange={(open) => {
          if (!open && !removeMemberMutation.isPending) {
            setRemoveMemberTarget(null);
          }
        }}
        title="Xóa thành viên"
        description="Thành viên sẽ không còn trong tổ chức đang chọn."
        footer={
          <>
            <button
              type="button"
              onClick={() => setRemoveMemberTarget(null)}
              disabled={removeMemberMutation.isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmRemoveMember}
              disabled={removeMemberMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {removeMemberMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xóa thành viên
            </button>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            {removeMemberTarget ? memberName(removeMemberTarget) : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {removeMemberTarget?.user?.email || "Không có email"}
          </p>
        </div>
      </AppModal>

      <AppModal
        open={Boolean(removeDepartmentMemberTarget)}
        onOpenChange={(open) => {
          if (!open && !removeDepartmentMemberMutation.isPending) {
            setRemoveDepartmentMemberTarget(null);
          }
        }}
        title="Gỡ khỏi phòng ban"
        description="Thành viên vẫn ở trong tổ chức, chỉ bị gỡ khỏi phòng ban đang chọn."
        footer={
          <>
            <button
              type="button"
              onClick={() => setRemoveDepartmentMemberTarget(null)}
              disabled={removeDepartmentMemberMutation.isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmRemoveDepartmentMember}
              disabled={removeDepartmentMemberMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {removeDepartmentMemberMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Gỡ thành viên
            </button>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            {removeDepartmentMemberTarget?.displayName ||
              removeDepartmentMemberTarget?.email}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {removeDepartmentMemberTarget?.email || "Không có email"}
          </p>
          {removeDepartmentMemberTarget?.isDepartmentHead && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Đây là trưởng phòng. Bạn cần bỏ hoặc đổi trưởng phòng trước khi
              gỡ.
            </p>
          )}
        </div>
      </AppModal>

      <AppModal
        open={showDepartmentMemberModal}
        onOpenChange={(open) => {
          if (!open && !addDepartmentMemberMutation.isPending) {
            setShowDepartmentMemberModal(false);
            setDepartmentMemberUserId("");
            setDepartmentMemberSearch("");
          }
        }}
        title="Thêm thành viên vào phòng ban"
        description={selectedDepartment?.name || "Phòng ban đang chọn"}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowDepartmentMemberModal(false);
                setDepartmentMemberUserId("");
                setDepartmentMemberSearch("");
              }}
              disabled={addDepartmentMemberMutation.isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAddDepartmentMember}
              disabled={
                !departmentMemberUserId || addDepartmentMemberMutation.isPending
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addDepartmentMemberMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Thêm thành viên
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="space-y-1.5 text-sm font-medium text-foreground">
            <span>Tìm thành viên</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={departmentMemberSearch}
                onChange={(event) => {
                  setDepartmentMemberSearch(event.target.value);
                  setDepartmentMemberUserId("");
                }}
                placeholder="Tìm theo tên, email hoặc chức danh"
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Thành viên tổ chức
            </p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {filteredOrganizationMemberOptions.map((member) => {
                const userId = member.user?.id ?? "";
                const selected = departmentMemberUserId === userId;

                return (
                  <button
                    key={userId || member.user?.email}
                    type="button"
                    onClick={() => setDepartmentMemberUserId(userId)}
                    disabled={!userId}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected ? "border-primary bg-primary/5" : "bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {memberName(member)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {member.user?.email || "Không có email"}
                          {member.jobTitle?.name
                            ? ` · ${member.jobTitle.name}`
                            : ""}
                        </p>
                      </div>
                      {selected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {filteredOrganizationMemberOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Không tìm thấy thành viên phù hợp.
            </p>
          )}
        </div>
      </AppModal>

      <AppModal
        open={showDepartmentHeadModal}
        onOpenChange={(open) => {
          if (!open && !assignDepartmentHeadMutation.isPending) {
            setShowDepartmentHeadModal(false);
            setDepartmentMemberUserId("");
            setDepartmentHeadSearch("");
          }
        }}
        title="Gán trưởng phòng"
        description={selectedDepartment?.name || "Phòng ban đang chọn"}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowDepartmentHeadModal(false);
                setDepartmentMemberUserId("");
                setDepartmentHeadSearch("");
              }}
              disabled={assignDepartmentHeadMutation.isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAssignDepartmentHead}
              disabled={
                !departmentMemberUserId ||
                assignDepartmentHeadMutation.isPending
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assignDepartmentHeadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Gán trưởng phòng
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="space-y-1.5 text-sm font-medium text-foreground">
            <span>Tìm thành viên</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={departmentHeadSearch}
                onChange={(event) => {
                  setDepartmentHeadSearch(event.target.value);
                  setDepartmentMemberUserId("");
                }}
                placeholder="Tìm theo tên, email hoặc chức danh"
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Thành viên trong phòng ban
            </p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {filteredDepartmentHeadCandidates.map((member) => {
                const selected = departmentMemberUserId === member.userId;

                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => setDepartmentMemberUserId(member.userId)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition hover:bg-muted ${
                      selected ? "border-primary bg-primary/5" : "bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {member.displayName || member.email}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {member.email}
                          {member.jobTitle ? ` · ${member.jobTitle}` : ""}
                        </p>
                      </div>
                      {selected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {departmentHeadCandidates.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Phòng ban này chưa có thành viên để gán trưởng phòng.
          </p>
        )}
        {departmentHeadCandidates.length > 0 &&
          filteredDepartmentHeadCandidates.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Không tìm thấy thành viên phù hợp.
            </p>
          )}
      </AppModal>

      <AppModal
        open={Boolean(deleteDepartmentTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteDepartmentMutation.isPending) {
            setDeleteDepartmentTarget(null);
          }
        }}
        title="Xóa phòng ban"
        description="Chỉ có thể xóa phòng ban khi chưa có tài liệu gắn với phòng ban đó."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteDepartmentTarget(null)}
              disabled={deleteDepartmentMutation.isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmDeleteDepartment}
              disabled={deleteDepartmentMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteDepartmentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xóa phòng ban
            </button>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            {deleteDepartmentTarget?.name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {deleteDepartmentTarget?.description || "Không có mô tả"}
          </p>
        </div>
      </AppModal>

      <AppModal
        open={Boolean(deleteJobTitleTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteJobTitleMutation.isPending) {
            setDeleteJobTitleTarget(null);
          }
        }}
        title="Xóa chức danh"
        description="Chức danh bị xóa sẽ không còn dùng để gán cho thành viên."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteJobTitleTarget(null)}
              disabled={deleteJobTitleMutation.isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmDeleteJobTitle}
              disabled={deleteJobTitleMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteJobTitleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xóa chức danh
            </button>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            {deleteJobTitleTarget?.name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {deleteJobTitleTarget?.description || "Không có mô tả"}
          </p>
        </div>
      </AppModal>

      {activeOrganization && (
        <AppModal
          open={showDeleteOrganization}
          onOpenChange={(open) => {
            if (!open) {
              setShowDeleteOrganization(false);
              setDeletePassword("");
            }
          }}
          title="Xóa tổ chức"
          description="Chỉ chủ sở hữu mới có thể thực hiện thao tác này."
          className="max-w-md"
        >
          <form onSubmit={handleDeleteOrganization} className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Tổ chức "{activeOrganization.name}" sẽ bị đóng và các thành viên
              sẽ bị gỡ khỏi tổ chức.
            </div>
            <label className="space-y-1.5 text-sm font-medium text-foreground">
              <span>Mật khẩu tài khoản</span>
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteOrganization(false);
                  setDeletePassword("");
                }}
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={deleteOrganizationMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteOrganizationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Xóa tổ chức
              </button>
            </div>
          </form>
        </AppModal>
      )}
    </div>
  );
}
