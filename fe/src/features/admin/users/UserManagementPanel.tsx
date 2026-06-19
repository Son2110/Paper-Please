import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  BadgeDollarSign,
  CalendarClock,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminUserApi,
  type UserCreateRequest,
  type UserUpdateRequest,
} from "@/api/adminUserApi";
import { billingApi } from "@/api/billingApi";
import { queryKeys } from "@/api/queryKeys";
import type { SubscriptionDetailResponse } from "@/api/subscriptionApi";
import type { UserDTO } from "@/api/userApi";
import { useAuth } from "@/context/AuthContext";
import { AppModal } from "@/shared/components/AppModal";
import { PageJumpInput } from "@/shared/components/PageJumpInput";

const roles = ["User", "Moderator", "Admin"] as const;
const statuses = ["Active", "Inactive", "Disabled", "Suspended", "Banned"] as const;

interface UserFormState {
  id?: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  userType: string;
  status: string;
  password: string;
  dob: string;
}

const emptyForm: UserFormState = {
  email: "",
  displayName: "",
  phoneNumber: "",
  userType: "User",
  status: "Active",
  password: "",
  dob: "",
};

function toDateInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatRemainingDays(value?: number | null) {
  const days = value ?? 0;
  if (days <= 0) return "Đã hết hạn";
  return `${days} ngày`;
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function getStatusClass(status?: string) {
  if (status === "Active") return "bg-success/10 text-success border-success/20";
  if (status === "Disabled" || status === "Banned") {
    return "bg-destructive/10 text-destructive border-destructive/20";
  }
  return "bg-muted text-muted-foreground border-border";
}

function getRoleClass(role?: string) {
  if (role === "Admin") return "bg-primary text-primary-foreground border-primary";
  if (role === "Moderator") return "bg-accent text-accent-foreground border-border";
  return "bg-muted text-muted-foreground border-border";
}

function mapUserToForm(user: UserDTO): UserFormState {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    phoneNumber: user.phoneNumber ?? "",
    userType: user.userType ?? "User",
    status: user.status ?? "Active",
    password: "",
    dob: toDateInputValue(user.dob),
  };
}

function buildCreatePayload(form: UserFormState): UserCreateRequest {
  return {
    email: form.email.trim(),
    displayName: form.displayName.trim() || undefined,
    phoneNumber: form.phoneNumber.trim() || undefined,
    userType: form.userType,
    status: form.status,
    password: form.password,
    dob: form.dob ? new Date(form.dob).toISOString() : null,
  };
}

function buildUpdatePayload(form: UserFormState): UserUpdateRequest {
  return {
    email: form.email.trim() || undefined,
    displayName: form.displayName.trim() || undefined,
    phoneNumber: form.phoneNumber.trim() || undefined,
    userType: form.userType || undefined,
    status: form.status || undefined,
    dob: form.dob ? new Date(form.dob).toISOString() : null,
  };
}

export function UserManagementPanel() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [filterByRole, setFilterByRole] = useState("");
  const [filterByStatus, setFilterByStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserDTO | null>(null);
  const [billingPage, setBillingPage] = useState(1);

  const isAdmin = currentUser?.userType === "Admin";
  const queryKey = useMemo(
    () =>
      queryKeys.admin.users({
        pageNumber: page,
        pageSize: 10,
        searchValue,
        filterByRole,
        filterByStatus,
      }),
    [filterByRole, filterByStatus, page, searchValue],
  );

  const { data, isError, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      adminUserApi.queryUsers({
        searchValue: searchValue || undefined,
        filterByRole: filterByRole || undefined,
        filterByStatus: filterByStatus || undefined,
        pageNumber: page,
        pageSize: 10,
      }),
  });

  const detailUserQuery = useQuery({
    queryKey: queryKeys.admin.users({ scope: "detail", userId: detailUserId }),
    queryFn: () => adminUserApi.getById(detailUserId as string),
    enabled: Boolean(detailUserId),
  });

  const subscriptionDetailQuery = useQuery<SubscriptionDetailResponse>({
    queryKey: queryKeys.admin.subscriptions.subscribers({
      scope: "user-subscription-detail",
      userId: detailUserId,
    }),
    queryFn: () => adminUserApi.getSubscriptionDetail(detailUserId as string),
    enabled: Boolean(detailUserId),
    retry: false,
  });

  const billingHistoryQuery = useQuery({
    queryKey: queryKeys.admin.billing({
      scope: "user-history",
      userId: detailUserId,
      page: billingPage,
      pageSize: 5,
    }),
    queryFn: () =>
      billingApi.getUserHistory(detailUserId as string, {
        page: billingPage,
        pageSize: 5,
        ascOrder: false,
      }),
    enabled: Boolean(detailUserId),
    retry: false,
  });

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const createMutation = useMutation({
    mutationFn: (request: UserCreateRequest) => adminUserApi.createUser(request),
    onSuccess: () => {
      toast.success("Đã tạo người dùng");
      setFormOpen(false);
      invalidateUsers();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể tạo người dùng");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: UserUpdateRequest }) =>
      adminUserApi.updateUser(id, request),
    onSuccess: () => {
      toast.success("Đã cập nhật người dùng");
      setFormOpen(false);
      invalidateUsers();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật người dùng");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminUserApi.deleteUser,
    onSuccess: (_data, deletedUserId) => {
      toast.success("Đã xóa người dùng");
      setDeleteTargetUser(null);
      if (detailUserId === deletedUserId) {
        closeDetail();
      }
      invalidateUsers();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể xóa người dùng");
    },
  });

  const openCreateForm = () => {
    setFormMode("create");
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (targetUser: UserDTO) => {
    setFormMode("edit");
    setForm(mapUserToForm(targetUser));
    setFormOpen(true);
  };

  const openDetail = (targetUser: UserDTO) => {
    if (!targetUser.id) return;
    setDetailUserId(targetUser.id);
    setBillingPage(1);
  };

  const closeDetail = () => {
    setDetailUserId(null);
    setBillingPage(1);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (formMode === "create") {
      if (!form.password) {
        toast.error("Vui lòng nhập mật khẩu");
        return;
      }
      createMutation.mutate(buildCreatePayload(form));
      return;
    }

    if (!form.id) return;
    updateMutation.mutate({
      id: form.id,
      request: buildUpdatePayload(form),
    });
  };

  const handleDelete = (targetUser: UserDTO) => {
    if (!targetUser.id) return;
    if (targetUser.id === currentUser?.id) {
      toast.error("Không thể xóa chính tài khoản đang đăng nhập");
      return;
    }
    setDeleteTargetUser(targetUser);
  };

  const confirmDeleteUser = () => {
    if (!deleteTargetUser?.id) return;
    deleteMutation.mutate(deleteTargetUser.id);
  };

  const users = data?.items ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Người dùng</h2>
          <p className="text-sm text-muted-foreground mt-1">
                              Trạng thái
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Tạo người dùng
          </button>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(1);
                setSearchValue(searchInput.trim());
              }
            }}
            placeholder="Tìm theo tên hoặc email"
            className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={filterByRole}
          onChange={(event) => {
            setPage(1);
            setFilterByRole(event.target.value);
          }}
          className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Tất cả vai trò</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <select
          value={filterByStatus}
          onChange={(event) => {
            setPage(1);
            setFilterByStatus(event.target.value);
          }}
          className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
                              Trạng thái
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setSearchValue(searchInput.trim());
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-muted"
          >
            <Search className="h-4 w-4" />
            Tìm
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted"
            title="Tải lại"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                Người dùng
              </th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                Vai trò
              </th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                              Trạng thái
              </th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                Đăng nhập cuối
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tải người dùng...
                  </span>
                </td>
              </tr>
            )}

            {isError && !isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-destructive">
                  Không thể tải danh sách người dùng.
                </td>
              </tr>
            )}

            {!isLoading && !isError && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Không có người dùng phù hợp.
                </td>
              </tr>
            )}

            {users.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">
                    {item.displayName || "-"}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleClass(
                      item.userType,
                    )}`}
                  >
                    {item.userType || "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                      item.status,
                    )}`}
                  >
                    {item.status || "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(item.lastLogin)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openDetail(item)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"
                      title="Xem chi tiết"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      disabled={!isAdmin}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      title="Sửa"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={!isAdmin || item.id === currentUser?.id || deleteMutation.isPending}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Tổng: {data?.totalItems ?? 0} người dùng
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm text-muted-foreground">
            Trang {page}/{totalPages}
          </span>
          <PageJumpInput page={page} totalPages={totalPages} onPageChange={setPage} />
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Tài khoản hiện tại có thể xem danh sách người dùng nhưng chỉ Admin mới được tạo,
          sửa hoặc xóa.
        </div>
      )}

      <AppModal
        open={Boolean(detailUserId)}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
        title="Chi tiết người dùng"
        description="Hồ sơ, gói dịch vụ và thanh toán gần nhất."
        className="max-w-5xl"
        contentClassName="max-h-[78vh]"
      >

            {detailUserQuery.isLoading && (
              <div className="flex items-center justify-center px-6 py-16 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải chi tiết người dùng...
              </div>
            )}

            {detailUserQuery.isError && !detailUserQuery.isLoading && (
              <div className="px-6 py-16 text-center text-destructive">
                Không thể tải chi tiết người dùng.
              </div>
            )}

            {detailUserQuery.data && (
              <div className="space-y-6">
                <section className="rounded-xl border bg-background p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {detailUserQuery.data.avatarUrl ? (
                          <img
                            src={detailUserQuery.data.avatarUrl}
                            alt={detailUserQuery.data.displayName || "User"}
                            className="h-14 w-14 rounded-full object-cover"
                          />
                        ) : (
                          <UserRound className="h-6 w-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-xl font-bold text-foreground">
                          {detailUserQuery.data.displayName || "-"}
                        </h4>
                        <p className="truncate text-sm text-muted-foreground">
                          {detailUserQuery.data.email || "-"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleClass(
                              detailUserQuery.data.userType,
                            )}`}
                          >
                            {detailUserQuery.data.userType || "-"}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              detailUserQuery.data.status,
                            )}`}
                          >
                            {detailUserQuery.data.status || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(detailUserQuery.data)}
                        disabled={!isAdmin}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Edit className="h-4 w-4" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(detailUserQuery.data)}
                        disabled={
                          !isAdmin ||
                          detailUserQuery.data.id === currentUser?.id ||
                          deleteMutation.isPending
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Số điện thoại</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {detailUserQuery.data.phoneNumber || "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Ngày sinh</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDate(detailUserQuery.data.dob)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Ngày tạo</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDate(detailUserQuery.data.createdDate)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Đăng nhập cuối</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDate(detailUserQuery.data.lastLogin)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border bg-background p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <BadgeDollarSign className="h-5 w-5 text-primary" />
                    <h4 className="text-base font-semibold text-foreground">
                      Gói dịch vụ
                    </h4>
                  </div>

                  {subscriptionDetailQuery.isLoading && (
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải gói dịch vụ...
                    </p>
                  )}
                  {subscriptionDetailQuery.isError && !subscriptionDetailQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">
                      Chưa có gói dịch vụ đang hoạt động hoặc chưa tải được dữ liệu.
                    </p>
                  )}
                  {subscriptionDetailQuery.data && !subscriptionDetailQuery.isLoading && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">Gói</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {subscriptionDetailQuery.data.plan || "-"}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">Giá</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatMoney(subscriptionDetailQuery.data.price)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">Hết hạn</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatDate(subscriptionDetailQuery.data.expiriesOn)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">Còn lại</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatRemainingDays(subscriptionDetailQuery.data.dayRemaining)}
                        </p>
                      </div>
                    </div>
                  )}
                </section>

                <section className="rounded-xl border bg-background">
                  <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-foreground">
                        Thanh toán gần nhất
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Lịch sử thanh toán riêng của người dùng này.
                      </p>
                    </div>
                    {billingHistoryQuery.isLoading && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {billingHistoryQuery.isError && !billingHistoryQuery.isLoading && (
                    <div className="px-5 py-8 text-sm text-muted-foreground">
                      Không thể tải lịch sử thanh toán.
                    </div>
                  )}

                  {!billingHistoryQuery.isError && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-sm">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                              Gói
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                              Tổng
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                              Cổng
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                              Ngày thanh toán
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                              Trạng thái
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {billingHistoryQuery.isLoading && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                Đang tải giao dịch...
                              </td>
                            </tr>
                          )}
                          {!billingHistoryQuery.isLoading &&
                            (billingHistoryQuery.data?.billingHistory.items.length ?? 0) === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                  Chưa có giao dịch.
                                </td>
                              </tr>
                            )}
                          {billingHistoryQuery.data?.billingHistory.items.map((record) => (
                            <tr key={record.billingId} className="border-t">
                              <td className="px-4 py-3 font-medium text-foreground">
                                {record.subscription?.name || "Gói dịch vụ"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-foreground">
                                {formatMoney(record.total ?? record.subtotal)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {record.paymentGateway || record.paymentMethod || "-"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatDate(record.paidAt)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                  {record.status || "-"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {billingHistoryQuery.data?.billingHistory && (
                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarClock className="h-4 w-4" />
                        Tổng: {billingHistoryQuery.data.billingHistory.totalItems} giao dịch
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBillingPage((value) => Math.max(1, value - 1))}
                          disabled={billingPage <= 1}
                          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Trước
                        </button>
                        <span className="text-sm text-muted-foreground">
                          Trang {billingPage}/{Math.max(1, billingHistoryQuery.data.billingHistory.totalPages)}
                        </span>
                        <PageJumpInput
                          page={billingPage}
                          totalPages={Math.max(1, billingHistoryQuery.data.billingHistory.totalPages)}
                          onPageChange={setBillingPage}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setBillingPage((value) =>
                              Math.min(
                                Math.max(1, billingHistoryQuery.data.billingHistory.totalPages),
                                value + 1,
                              ),
                            )
                          }
                          disabled={
                            billingPage >= Math.max(1, billingHistoryQuery.data.billingHistory.totalPages)
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
      </AppModal>

      <AppModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={formMode === "create" ? "Tạo người dùng" : "Cập nhật người dùng"}
        description={
          formMode === "create"
            ? "Tạo tài khoản mới với vai trò phù hợp."
            : "Cập nhật thông tin hiển thị và quyền truy cập."
        }
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Họ và tên</span>
                  <input
                    value={form.displayName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        displayName: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Số điện thoại</span>
                  <input
                    value={form.phoneNumber}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        phoneNumber: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Ngày sinh</span>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, dob: event.target.value }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Vai trò</span>
                  <select
                    value={form.userType}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, userType: event.target.value }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                              Trạng thái
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, status: event.target.value }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                {formMode === "create" && (
                  <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                    <span>Mật khẩu</span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {formMode === "create" ? "Tạo" : "Lưu"}
                </button>
              </div>
        </form>
      </AppModal>

      <AppModal
        open={Boolean(deleteTargetUser)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeleteTargetUser(null);
          }
        }}
        title="Xóa người dùng"
        description="Thao tác này sẽ xóa tài khoản khỏi hệ thống."
        className="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteTargetUser(null)}
              disabled={deleteMutation.isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmDeleteUser}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xóa người dùng
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Bạn có chắc muốn xóa{" "}
            <span className="font-semibold">
              {deleteTargetUser?.displayName ||
                deleteTargetUser?.email ||
                "người dùng này"}
            </span>
            ?
          </div>
          <p className="text-sm text-muted-foreground">
            Người dùng sau khi bị xóa sẽ không còn xuất hiện trong danh sách quản trị.
          </p>
        </div>
      </AppModal>
    </div>
  );
}

