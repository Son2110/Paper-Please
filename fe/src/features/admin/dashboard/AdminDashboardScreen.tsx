import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { adminUserApi } from "@/api/adminUserApi";
import { queryKeys } from "@/api/queryKeys";
import type { UserDTO } from "@/api/userApi";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface AdminDashboardScreenProps {
  onOpenUsers: () => void;
  onOpenSettings: () => void;
}

interface StatCard {
  label: string;
  value?: number;
  icon: LucideIcon;
  className: string;
  isLoading: boolean;
}

function formatDate(value?: string) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function userLabel(user: UserDTO) {
  return user.displayName || user.email || "Người dùng";
}

function roleLabel(role?: string | null) {
  if (!role) return "Người dùng";
  if (role === "Admin") return "Quản trị viên";
  if (role === "Moderator") return "Điều phối viên";
  if (role === "User") return "Người dùng";
  return role;
}

function statusLabel(status?: string | null) {
  if (!status) return "Chưa rõ";
  if (status === "Active") return "Đang hoạt động";
  if (status === "Inactive") return "Tạm dừng";
  if (status === "Suspended") return "Bị khóa";
  return status;
}

function StatTile({ label, value, icon: Icon, className, isLoading }: StatCard) {
  return (
    <div className={cn("rounded-lg border border-l-4 bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              value ?? 0
            )}
          </div>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardScreen({
  onOpenUsers,
}: AdminDashboardScreenProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const totalUsers = useQuery({
    queryKey: queryKeys.admin.users({ scope: "dashboard-total", pageNumber: 1, pageSize: 1 }),
    queryFn: () => adminUserApi.queryUsers({ pageNumber: 1, pageSize: 1 }),
    staleTime: 30_000,
  });

  const activeUsers = useQuery({
    queryKey: queryKeys.admin.users({ scope: "dashboard-active", filterByStatus: "Active", pageNumber: 1, pageSize: 1 }),
    queryFn: () =>
      adminUserApi.queryUsers({
        filterByStatus: "Active",
        pageNumber: 1,
        pageSize: 1,
      }),
    staleTime: 30_000,
  });

  const adminUsers = useQuery({
    queryKey: queryKeys.admin.users({ scope: "dashboard-admin", filterByRole: "Admin", pageNumber: 1, pageSize: 1 }),
    queryFn: () =>
      adminUserApi.queryUsers({
        filterByRole: "Admin",
        pageNumber: 1,
        pageSize: 1,
      }),
    staleTime: 30_000,
  });

  const moderatorUsers = useQuery({
    queryKey: queryKeys.admin.users({ scope: "dashboard-moderator", filterByRole: "Moderator", pageNumber: 1, pageSize: 1 }),
    queryFn: () =>
      adminUserApi.queryUsers({
        filterByRole: "Moderator",
        pageNumber: 1,
        pageSize: 1,
      }),
    staleTime: 30_000,
  });

  const recentUsers = useQuery({
    queryKey: queryKeys.admin.users({ scope: "dashboard-recent", pageNumber: 1, pageSize: 5, sortOrder: "desc" }),
    queryFn: () =>
      adminUserApi.queryUsers({
        pageNumber: 1,
        pageSize: 5,
        sortOrder: "desc",
      }),
    staleTime: 30_000,
  });

  const stats: StatCard[] = [
    {
      label: "Tổng người dùng",
      value: totalUsers.data?.totalItems,
      icon: Users,
      className: "border-l-sky-500",
      isLoading: totalUsers.isLoading,
    },
    {
      label: "Đang hoạt động",
      value: activeUsers.data?.totalItems,
      icon: UserCheck,
      className: "border-l-emerald-500",
      isLoading: activeUsers.isLoading,
    },
    {
      label: "Admin",
      value: adminUsers.data?.totalItems,
      icon: ShieldCheck,
      className: "border-l-amber-500",
      isLoading: adminUsers.isLoading,
    },
    {
      label: "Moderator",
      value: moderatorUsers.data?.totalItems,
      icon: UserCog,
      className: "border-l-rose-500",
      isLoading: moderatorUsers.isLoading,
    },
  ];

  const totalUserCount = totalUsers.data?.totalItems ?? 0;
  const activeUserCount = activeUsers.data?.totalItems ?? 0;
  const adminUserCount = adminUsers.data?.totalItems ?? 0;
  const moderatorUserCount = moderatorUsers.data?.totalItems ?? 0;
  const activeRate =
    totalUserCount > 0 ? Math.round((activeUserCount / totalUserCount) * 100) : 0;
  const managedRoleCount = adminUserCount + moderatorUserCount;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quản trị hệ thống
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Tổng quan quản trị
          </h1>
        </div>
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "users"] })}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Người dùng gần đây
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tài khoản được trả về gần nhất.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenUsers}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              <Users className="h-4 w-4" />
              Xem tất cả
            </button>
          </div>

          <div className="divide-y">
            {recentUsers.isLoading && (
              <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải người dùng...
              </div>
            )}

            {recentUsers.isError && !recentUsers.isLoading && (
              <div className="px-5 py-8 text-sm text-destructive">
                Không thể tải danh sách người dùng.
              </div>
            )}

            {!recentUsers.isLoading &&
              !recentUsers.isError &&
              (recentUsers.data?.items ?? []).length === 0 && (
                <div className="px-5 py-8 text-sm text-muted-foreground">
                  Chưa có người dùng phù hợp.
                </div>
              )}

            {(recentUsers.data?.items ?? []).map((item) => (
              <div
                key={item.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_130px_120px]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {userLabel(item)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                </div>
                <div>
                  <span className="inline-flex rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {roleLabel(item.userType)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(item.createdDate)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-lg border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Tổng quan người dùng
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Phân bổ tài khoản và quyền quản trị hiện tại.
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <BarChart3 className="h-5 w-5 text-foreground" />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tỷ lệ hoạt động</span>
                  <span className="font-semibold text-foreground">{activeRate}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${activeRate}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Có quyền quản trị
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {managedRoleCount}
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Người dùng thường
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {Math.max(0, totalUserCount - managedRoleCount)}
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={onOpenUsers}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Users className="h-4 w-4" />
                  Quản lý người dùng
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Phiên admin</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Tài khoản</span>
                <span className="truncate text-right font-medium text-foreground">
                  {user?.displayName || user?.email || "Admin"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Vai trò</span>
                <span className="rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-background">
                  {roleLabel(user?.userType)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Trạng thái</span>
                <span className="font-medium text-foreground">
                  {statusLabel(user?.status)}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
