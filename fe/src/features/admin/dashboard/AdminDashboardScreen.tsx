import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  ClipboardList,
  CreditCard,
  Database,
  FileArchive,
  Loader2,
  RefreshCw,
  Users,
  type LucideIcon,
} from "lucide-react";
import { activityLogApi, type ActivityLogDTO } from "@/api/activityLogApi";
import { adminUserApi } from "@/api/adminUserApi";
import { cdnApi } from "@/api/cdnApi";
import { queryKeys } from "@/api/queryKeys";
import { subscriptionApi } from "@/api/subscriptionApi";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface AdminDashboardScreenProps {
  onOpenUsers: () => void;
  onOpenSettings: () => void;
  onOpenSubscriptions?: () => void;
  onOpenBilling?: () => void;
  onOpenNotifications?: () => void;
  onOpenCdnFiles?: () => void;
  onOpenActivityLogs?: () => void;
}

interface KpiCard {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone: string;
  isLoading?: boolean;
}

interface QuickAction {
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatPercent(value?: number | null) {
  if (value == null) return "0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

function actorLabel(log: ActivityLogDTO) {
  return log.user?.displayName || log.user?.email || "Hệ thống";
}

function actionLabel(value?: string | null) {
  if (!value) return "Hoạt động";
  const normalized = value.toLowerCase();
  if (normalized.includes("login")) return "Đăng nhập";
  if (normalized.includes("logout")) return "Đăng xuất";
  if (normalized.includes("create")) return "Tạo mới";
  if (normalized.includes("update")) return "Cập nhật";
  if (normalized.includes("delete")) return "Xóa";
  if (normalized.includes("upload")) return "Tải tệp";
  if (normalized.includes("payment")) return "Thanh toán";
  if (normalized.includes("subscription")) return "Gói dịch vụ";
  return value;
}

function targetLabel(value?: string | null) {
  if (!value) return "Đối tượng";
  const normalized = value.toLowerCase();
  if (normalized.includes("user")) return "người dùng";
  if (normalized.includes("subscription")) return "gói dịch vụ";
  if (normalized.includes("document")) return "tài liệu";
  if (normalized.includes("organization")) return "tổ chức";
  if (normalized.includes("file")) return "tệp";
  return value;
}

function KpiTile({ label, value, description, icon: Icon, tone, isLoading }: KpiCard) {
  return (
    <div className={cn("rounded-lg border border-l-4 bg-card p-4", tone)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              value
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function AdminDashboardScreen({
  onOpenUsers,
  onOpenSettings,
  onOpenSubscriptions,
  onOpenBilling,
  onOpenNotifications,
  onOpenCdnFiles,
  onOpenActivityLogs,
}: AdminDashboardScreenProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const totalUsers = useQuery({
    queryKey: queryKeys.admin.users({
      scope: "dashboard-total",
      pageNumber: 1,
      pageSize: 1,
    }),
    queryFn: () => adminUserApi.queryUsers({ pageNumber: 1, pageSize: 1 }),
    staleTime: 30_000,
  });

  const activeUsers = useQuery({
    queryKey: queryKeys.admin.users({
      scope: "dashboard-active",
      filterByStatus: "Active",
      pageNumber: 1,
      pageSize: 1,
    }),
    queryFn: () =>
      adminUserApi.queryUsers({
        filterByStatus: "Active",
        pageNumber: 1,
        pageSize: 1,
      }),
    staleTime: 30_000,
  });

  const subscriptionDashboard = useQuery({
    queryKey: queryKeys.admin.subscriptions.dashboard,
    queryFn: subscriptionApi.getDashboard,
    staleTime: 60_000,
  });

  const activePlans = useQuery({
    queryKey: queryKeys.subscriptions.active,
    queryFn: subscriptionApi.getActive,
    staleTime: 60_000,
  });

  const activityLogs = useQuery({
    queryKey: queryKeys.admin.activityLogs,
    queryFn: activityLogApi.getAll,
    staleTime: 30_000,
  });

  const cdnFiles = useQuery({
    queryKey: ["admin", "cdn-files", "dashboard-total"],
    queryFn: () => cdnApi.listFiles({ page: 1, pageSize: 1 }),
    staleTime: 60_000,
  });

  const totalUserCount = totalUsers.data?.totalItems ?? 0;
  const activeUserCount = activeUsers.data?.totalItems ?? 0;
  const subscriberCount = subscriptionDashboard.data?.subscriber ?? 0;
  const activeUserRate =
    totalUserCount > 0 ? Math.round((activeUserCount / totalUserCount) * 100) : 0;

  const recentLogs = useMemo(
    () =>
      [...(activityLogs.data ?? [])]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 6),
    [activityLogs.data],
  );

  const alerts = [
    totalUsers.isError ? "Không thể tải số liệu người dùng." : null,
    subscriptionDashboard.isError ? "Không thể tải số liệu gói dịch vụ." : null,
    activityLogs.isError ? "Không thể tải nhật ký hoạt động." : null,
    cdnFiles.isError ? "Không thể tải thống kê tệp hệ thống." : null,
    !activePlans.isLoading && !activePlans.isError && (activePlans.data?.length ?? 0) === 0
      ? "Chưa có gói dịch vụ đang hoạt động."
      : null,
  ].filter(Boolean) as string[];

  const kpis: KpiCard[] = [
    {
      label: "Tổng người dùng",
      value: totalUserCount,
      description: "Tổng tài khoản hiện có trên hệ thống.",
      icon: Users,
      tone: "border-l-sky-500",
      isLoading: totalUsers.isLoading,
    },
    {
      label: "Người dùng hoạt động",
      value: activeUserCount,
      description: `${activeUserRate}% trên tổng số người dùng.`,
      icon: Activity,
      tone: "border-l-emerald-500",
      isLoading: activeUsers.isLoading,
    },
    {
      label: "Doanh thu gói",
      value: formatMoney(subscriptionDashboard.data?.subscriptionRevenue),
      description: `${formatPercent(
        subscriptionDashboard.data?.subscriptionRevenueFluct,
      )} so với kỳ trước.`,
      icon: BadgeDollarSign,
      tone: "border-l-amber-500",
      isLoading: subscriptionDashboard.isLoading,
    },
    {
      label: "Tệp hệ thống",
      value: cdnFiles.data?.totalItems ?? 0,
      description: "Tổng tệp đang ghi nhận trên CDN.",
      icon: FileArchive,
      tone: "border-l-violet-500",
      isLoading: cdnFiles.isLoading,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      label: "Tài khoản",
      description: "Tạo, khóa hoặc cập nhật người dùng.",
      icon: Users,
      onClick: onOpenUsers,
    },
    {
      label: "Gói dịch vụ",
      description: "Quản lý quota, giá và trạng thái gói.",
      icon: CreditCard,
      onClick: onOpenSubscriptions ?? onOpenSettings,
    },
    {
      label: "Thanh toán",
      description: "Theo dõi thuê bao và giao dịch gói.",
      icon: BadgeDollarSign,
      onClick: onOpenBilling ?? onOpenSettings,
    },
    {
      label: "Nhật ký",
      description: "Tra cứu hoạt động quản trị và hệ thống.",
      icon: ClipboardList,
      onClick: onOpenActivityLogs ?? onOpenSettings,
    },
    {
      label: "Thông báo",
      description: "Gửi thông báo tới người dùng.",
      icon: Bell,
      onClick: onOpenNotifications ?? onOpenSettings,
    },
    {
      label: "Tệp hệ thống",
      description: "Kiểm tra file đã tải lên CDN.",
      icon: Database,
      onClick: onOpenCdnFiles ?? onOpenSettings,
    },
  ];

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.active });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quản trị hệ thống
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Tổng quan quản trị
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Theo dõi người dùng, gói dịch vụ, tệp hệ thống và hoạt động gần đây.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshDashboard}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiTile key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <section className="rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">
              Hoạt động gần đây
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Các sự kiện mới nhất được ghi nhận từ nhật ký hệ thống.
            </p>
          </div>

          <div className="divide-y">
            {activityLogs.isLoading && (
              <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải nhật ký...
              </div>
            )}

            {!activityLogs.isLoading && recentLogs.length === 0 && (
              <div className="px-5 py-8 text-sm text-muted-foreground">
                Chưa có hoạt động gần đây.
              </div>
            )}

            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_170px]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {actionLabel(log.action)} {targetLabel(log.targetType)}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {actorLabel(log)}
                    {log.details ? ` · ${log.details}` : ""}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground md:text-right">
                  {formatDateTime(log.timestamp)}
                </p>
              </div>
            ))}
          </div>

          {recentLogs.length > 0 && (
            <div className="border-t px-5 py-4">
              <button
                type="button"
                onClick={onOpenActivityLogs ?? onOpenSettings}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                <ClipboardList className="h-4 w-4" />
                Xem nhật ký
              </button>
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">
              Gói dịch vụ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Số liệu tổng hợp từ hệ thống gói dịch vụ.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniMetric
                label="Gói đang bán"
                value={activePlans.data?.length ?? 0}
                sub="Gói active"
              />
              <MiniMetric
                label="Thuê bao"
                value={subscriberCount}
                sub={formatPercent(subscriptionDashboard.data?.subscriberFluct)}
              />
              <MiniMetric
                label="Thuê bao mới"
                value={subscriptionDashboard.data?.newSubscriber ?? 0}
                sub={formatPercent(subscriptionDashboard.data?.newSubscriberFluct)}
              />
              <MiniMetric
                label="Ngừng dùng"
                value={subscriptionDashboard.data?.quitSubscriber ?? 0}
                sub={formatPercent(subscriptionDashboard.data?.quitSubscriberFluct)}
              />
            </div>

            <div className="mt-4 rounded-lg border bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Gói phổ biến
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">
                {subscriptionDashboard.data?.mostPopularTier?.subscriptionName ||
                  "Chưa có dữ liệu"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {subscriptionDashboard.data?.mostPopularTier?.percentage ?? 0}% thuê bao
              </p>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">
                  Cần chú ý
                </h2>
                {alerts.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Chưa có cảnh báo vận hành từ dữ liệu hiện tại.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {alerts.map((alert) => (
                      <li key={alert} className="rounded-lg bg-muted/70 px-3 py-2">
                        {alert}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">
              Lối tắt quản trị
            </h2>
            <div className="mt-4 grid gap-2">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="flex items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.label}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Phiên admin</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Tài khoản</span>
                <span className="truncate text-right font-medium text-foreground">
                  {user?.displayName || user?.email || "Quản trị viên"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate text-right font-medium text-foreground">
                  {user?.email || "Chưa có"}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
