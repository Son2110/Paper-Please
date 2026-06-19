import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  CalendarClock,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  subscriptionApi,
  type Subscriber,
  type SubscriptionCreateRequest,
  type SubscriptionDetailResponse,
  type SubscriptionDTO,
  type SubscriptionUpdateRequest,
} from "@/api/subscriptionApi";
import { adminUserApi } from "@/api/adminUserApi";
import { queryKeys } from "@/api/queryKeys";
import { cn } from "@/lib/utils";
import { AppModal } from "@/shared/components/AppModal";
import { PageJumpInput } from "@/shared/components/PageJumpInput";

interface SubscriptionFormState {
  id?: string;
  name: string;
  description: string;
  type: string;
  price: string;
  durationDays: string;
  pointsCost: string;
  rewardPoints: string;
  maxOrganizations: string;
  maxOrganizationUsers: string;
  maxStorageGb: string;
  sortOrder: string;
  isActive: boolean;
}

type SubscriptionAnalyticsTab = "new" | "quit" | "by-plan" | "recent";

const SUBSCRIPTION_ANALYTICS_TABS: {
  value: SubscriptionAnalyticsTab;
  label: string;
}[] = [
  { value: "new", label: "Mới" },
  { value: "quit", label: "Đã rời" },
  { value: "by-plan", label: "Theo gói" },
  { value: "recent", label: "Gần đây" },
];

function createEmptyForm(): SubscriptionFormState {
  return {
    name: "",
    description: "",
    type: "Basic",
    price: "0",
    durationDays: "30",
    pointsCost: "",
    rewardPoints: "0",
    maxOrganizations: "",
    maxOrganizationUsers: "",
    maxStorageGb: "",
    sortOrder: "",
    isActive: true,
  };
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

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

function formatRemainingDayCount(value?: number | null) {
  const days = value ?? 0;
  if (days <= 0) return "Đã hết hạn";
  return `${days} ngày`;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function storageGbToBytes(value: string) {
  const parsed = parseOptionalNumber(value);
  if (parsed == null) return null;
  return Math.round(parsed * 1024 * 1024 * 1024);
}

function bytesToStorageGb(value?: number | null) {
  if (!value) return "";
  const gb = value / (1024 * 1024 * 1024);
  return Number.isInteger(gb) ? String(gb) : gb.toFixed(2).replace(/\.?0+$/, "");
}

function formatStorage(value?: number | null) {
  if (value == null) return "-";
  if (value >= 1024 * 1024 * 1024) return `${bytesToStorageGb(value)} GB`;
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`;
  return `${value} bytes`;
}

function toForm(plan: SubscriptionDTO): SubscriptionFormState {
  return {
    id: plan.id,
    name: plan.name ?? "",
    description: plan.description ?? "",
    type: plan.type ?? "Basic",
    price: String(plan.price ?? 0),
    durationDays: plan.durationDays == null ? "" : String(plan.durationDays),
    pointsCost: plan.pointsCost == null ? "" : String(plan.pointsCost),
    rewardPoints: String(plan.rewardPoints ?? 0),
    maxOrganizations:
      plan.maxOrganizations == null ? "" : String(plan.maxOrganizations),
    maxOrganizationUsers:
      plan.maxOrganizationUsers == null ? "" : String(plan.maxOrganizationUsers),
    maxStorageGb: bytesToStorageGb(plan.maxStorageBytes),
    sortOrder: plan.sortOrder == null ? "" : String(plan.sortOrder),
    isActive: plan.isActive ?? true,
  };
}

function buildCreatePayload(form: SubscriptionFormState): SubscriptionCreateRequest {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    type: form.type.trim(),
    price: Number(form.price) || 0,
    durationDays: parseOptionalNumber(form.durationDays),
    pointsCost: parseOptionalNumber(form.pointsCost),
    rewardPoints: Number(form.rewardPoints) || 0,
    isActive: form.isActive,
    maxOrganizations: parseOptionalNumber(form.maxOrganizations),
    maxOrganizationUsers: parseOptionalNumber(form.maxOrganizationUsers),
    maxStorageBytes: storageGbToBytes(form.maxStorageGb),
    sortOrder: parseOptionalNumber(form.sortOrder),
  };
}

function buildUpdatePayload(form: SubscriptionFormState): SubscriptionUpdateRequest {
  return {
    id: form.id ?? "",
    ...buildCreatePayload(form),
  };
}

function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone: string;
}) {
  return (
    <div className={cn("rounded-lg border border-l-4 bg-card p-4", tone)}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SubscriptionDetailTable({
  items,
  isLoading,
  isError,
  emptyText,
}: {
  items: SubscriptionDetailResponse[];
  isLoading: boolean;
  isError: boolean;
  emptyText: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
              Người dùng
            </th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
              Gói
            </th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
              Giá
            </th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
              Đăng ký
            </th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
              Hết hạn
            </th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
              Còn lại
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải dữ liệu...
                </span>
              </td>
            </tr>
          )}

          {isError && !isLoading && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-destructive">
                Không thể tải dữ liệu.
              </td>
            </tr>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                {emptyText}
              </td>
            </tr>
          )}

          {items.map((item) => (
            <tr key={`${item.userId}-${item.plan}-${item.subscribedOn}`} className="border-t">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">
                  {item.user || "Người dùng chưa có tên"}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2 rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {item.plan || "-"}
                </span>
              </td>
              <td className="px-4 py-3 font-semibold text-foreground">
                {formatMoney(item.price)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(item.subscribedOn)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(item.expiriesOn)}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatRemainingDayCount(item.dayRemaining)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentSubscriberList({
  items,
  isLoading,
  isError,
}: {
  items: Subscriber[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải subscriber gần đây...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-8 text-center text-sm text-destructive">
        Không thể tải subscriber gần đây.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Chưa có subscriber trong khoảng thời gian này.
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <div key={`${item.user?.id}-${item.subscriptionName}-${index}`} className="rounded-lg border bg-background p-3">
          <div className="font-medium text-foreground">
            {item.user?.displayName || item.user?.id || "Người dùng"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {item.subscriptionName || "-"}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminSubscriptionScreen() {
  const queryClient = useQueryClient();
  const [subscriberPage, setSubscriberPage] = useState(1);
  const [subscriberSearchInput, setSubscriberSearchInput] = useState("");
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<SubscriptionFormState>(() => createEmptyForm());
  const [grantSearchInput, setGrantSearchInput] = useState("");
  const [grantSearch, setGrantSearch] = useState("");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPlanId, setGrantPlanId] = useState("");
  const [expiringDays, setExpiringDays] = useState("3");
  const [expiringResult, setExpiringResult] = useState<string>("");
  const [analyticsTab, setAnalyticsTab] =
    useState<SubscriptionAnalyticsTab>("new");
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const [recentPeriod, setRecentPeriod] = useState("30");
  const [deletePlanTarget, setDeletePlanTarget] = useState<SubscriptionDTO | null>(
    null,
  );

  const plansQuery = useQuery({
    queryKey: queryKeys.admin.subscriptions.all,
    queryFn: subscriptionApi.getAll,
    staleTime: 30_000,
  });

  const dashboardQuery = useQuery({
    queryKey: queryKeys.admin.subscriptions.dashboard,
    queryFn: subscriptionApi.getDashboard,
    staleTime: 30_000,
  });

  const subscribersQuery = useQuery({
    queryKey: queryKeys.admin.subscriptions.subscribers({
      page: subscriberPage,
      pageSize: 8,
      query: subscriberSearch,
    }),
    queryFn: () =>
      subscriptionApi.getSubscribers({
        query: subscriberSearch || undefined,
        page: subscriberPage,
        pageSize: 8,
      }),
    staleTime: 30_000,
  });

  const newSubscribersQuery = useQuery({
    queryKey: queryKeys.admin.subscriptions.subscribers({
      kind: "new",
      page: analyticsPage,
      pageSize: 6,
    }),
    queryFn: () =>
      subscriptionApi.getNewSubscribers({
        page: analyticsPage,
        pageSize: 6,
      }),
    enabled: analyticsTab === "new",
    staleTime: 30_000,
  });

  const quitSubscribersQuery = useQuery({
    queryKey: queryKeys.admin.subscriptions.subscribers({
      kind: "quit",
      page: analyticsPage,
      pageSize: 6,
    }),
    queryFn: () =>
      subscriptionApi.getQuitSubscribers({
        page: analyticsPage,
        pageSize: 6,
      }),
    enabled: analyticsTab === "quit",
    staleTime: 30_000,
  });

  const subscribersBySubscriptionQuery = useQuery({
    queryKey: queryKeys.admin.subscriptions.subscribers({
      kind: "by-plan",
      page: analyticsPage,
      pageSize: 4,
    }),
    queryFn: () =>
      subscriptionApi.getSubscribersBySubscription({
        page: analyticsPage,
        pageSize: 4,
      }),
    enabled: analyticsTab === "by-plan",
    staleTime: 30_000,
  });

  const recentSubscribersQuery = useQuery({
    queryKey: queryKeys.admin.subscriptions.subscribers({
      kind: "recent",
      page: analyticsPage,
      pageSize: 9,
      recentPeriod,
    }),
    queryFn: () =>
      subscriptionApi.getRecentSubscribersWithinPeriod(Number(recentPeriod) || 30, {
        page: analyticsPage,
        pageSize: 9,
      }),
    enabled: analyticsTab === "recent",
    staleTime: 30_000,
  });

  const grantUsersQuery = useQuery({
    queryKey: queryKeys.admin.users({
      searchValue: grantSearch,
      pageNumber: 1,
      pageSize: 8,
    }),
    queryFn: () =>
      adminUserApi.queryUsers({
        searchValue: grantSearch || undefined,
        pageNumber: 1,
        pageSize: 8,
      }),
    enabled: Boolean(grantSearch),
    staleTime: 30_000,
  });

  const invalidateSubscriptions = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.active });
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.mine });
  };

  const createMutation = useMutation({
    mutationFn: subscriptionApi.create,
    onSuccess: () => {
      toast.success("Đã tạo gói dịch vụ");
      setFormOpen(false);
      invalidateSubscriptions();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể tạo gói");
    },
  });

  const updateMutation = useMutation({
    mutationFn: subscriptionApi.update,
    onSuccess: () => {
      toast.success("Đã cập nhật gói dịch vụ");
      setFormOpen(false);
      invalidateSubscriptions();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật gói");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: subscriptionApi.delete,
    onSuccess: () => {
      toast.success("Đã xóa gói dịch vụ");
      setDeletePlanTarget(null);
      invalidateSubscriptions();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể xóa gói");
    },
  });

  const refreshStatusMutation = useMutation({
    mutationFn: subscriptionApi.refreshAllStatus,
    onSuccess: () => {
      toast.success("Đã refresh trạng thái subscription");
      invalidateSubscriptions();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể refresh trạng thái");
    },
  });

  const giveSubscriptionMutation = useMutation({
    mutationFn: ({
      userId,
      subscriptionId,
    }: {
      userId: string;
      subscriptionId: string;
    }) => subscriptionApi.giveSubscription(userId, subscriptionId),
    onSuccess: () => {
      toast.success("Đã gán gói cho user");
      setSubscriberPage(1);
      invalidateSubscriptions();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể gán gói");
    },
  });

  const expiringSoonMutation = useMutation({
    mutationFn: () => subscriptionApi.getExpiringSoon(Number(expiringDays) || 3),
    onSuccess: () => {
      setExpiringResult("Đã cập nhật danh sách subscription sắp hết hạn.");
      toast.success("Đã tải subscription sắp hết hạn");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể tải subscription sắp hết hạn");
    },
  });

  const emailExpiringSoonMutation = useMutation({
    mutationFn: () => subscriptionApi.emailExpiringSoon(Number(expiringDays) || 3),
    onSuccess: () => {
      setExpiringResult("Đã gửi yêu cầu reminder cho subscription sắp hết hạn.");
      toast.success("Đã kích hoạt gửi reminder cho subscription sắp hết hạn");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể gửi reminder");
    },
  });

  const plans = plansQuery.data ?? [];
  const activePlans = plans.filter((plan) => plan.isActive !== false);
  const dashboard = dashboardQuery.data;
  const subscribers = subscribersQuery.data?.items ?? [];
  const grantUsers = grantUsersQuery.data?.items ?? [];
  const totalSubscriberPages = Math.max(1, subscribersQuery.data?.totalPages ?? 1);
  const analyticsTotalPages = Math.max(
    1,
    analyticsTab === "new"
      ? (newSubscribersQuery.data?.totalPages ?? 1)
      : analyticsTab === "quit"
        ? (quitSubscribersQuery.data?.totalPages ?? 1)
        : analyticsTab === "recent"
          ? (recentSubscribersQuery.data?.totalPages ?? 1)
          : (subscribersBySubscriptionQuery.data?.[0]?.totalPages ?? 1),
  );
  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const openCreateForm = () => {
    setFormMode("create");
    setForm(createEmptyForm());
    setFormOpen(true);
  };

  const openEditForm = (plan: SubscriptionDTO) => {
    setFormMode("edit");
    setForm(toForm(plan));
    setFormOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.type.trim()) {
      toast.error("Vui lòng nhập tên và loại gói");
      return;
    }

    if (formMode === "create") {
      createMutation.mutate(buildCreatePayload(form));
      return;
    }

    if (!form.id) return;
    updateMutation.mutate(buildUpdatePayload(form));
  };

  const handleDelete = (plan: SubscriptionDTO) => {
    setDeletePlanTarget(plan);
  };

  const confirmDeletePlan = () => {
    if (!deletePlanTarget) return;
    deleteMutation.mutate(deletePlanTarget.id);
  };

  const handleSearchGrantUser = () => {
    setGrantUserId("");
    setGrantSearch(grantSearchInput.trim());
  };

  const handleGiveSubscription = () => {
    if (!grantUserId || !grantPlanId) {
      toast.error("Vui lòng chọn user và gói");
      return;
    }

    giveSubscriptionMutation.mutate({
      userId: grantUserId,
      subscriptionId: grantPlanId,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quản trị hệ thống
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Gói dịch vụ
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refreshStatusMutation.mutate()}
            disabled={refreshStatusMutation.isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshStatusMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Làm mới trạng thái
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Tạo gói
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Doanh thu"
          value={formatMoney(dashboard?.subscriptionRevenue)}
          sub="Trong kỳ thống kê"
          tone="border-l-sky-500"
        />
        <StatTile
          label="Người đăng ký"
          value={dashboard?.subscriber ?? 0}
          sub="Đang hoạt động"
          tone="border-l-emerald-500"
        />
        <StatTile
          label="Người đăng ký mới"
          value={dashboard?.newSubscriber ?? 0}
          sub="Theo thống kê hệ thống"
          tone="border-l-amber-500"
        />
        <StatTile
          label="Gói đang bật"
          value={activePlans.length}
          sub={`${plans.length} gói tổng`}
          tone="border-l-rose-500"
        />
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Gói sắp hết hạn
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kiểm tra và gửi nhắc nhở cho các gói sắp hết hạn.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="space-y-1 text-sm font-medium">
              <span>Số ngày</span>
              <input
                type="number"
                min={1}
                value={expiringDays}
                onChange={(event) => setExpiringDays(event.target.value)}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-28"
              />
            </label>
            <button
              type="button"
              onClick={() => expiringSoonMutation.mutate()}
              disabled={expiringSoonMutation.isPending}
              className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg border px-4 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {expiringSoonMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Kiểm tra
            </button>
            <button
              type="button"
              onClick={() => emailExpiringSoonMutation.mutate()}
              disabled={emailExpiringSoonMutation.isPending}
              className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {emailExpiringSoonMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Gửi nhắc nhở
            </button>
          </div>
        </div>
        {expiringResult && (
          <div className="mx-5 mb-5 rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
            {expiringResult}
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Chi tiết gói dịch vụ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Theo dõi biến động subscriber theo từng nhóm quan trọng.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {analyticsTab === "recent" && (
              <label className="space-y-1 text-sm font-medium">
                <span>Số ngày</span>
                <input
                  type="number"
                  min={1}
                  value={recentPeriod}
                  onChange={(event) => {
                    setAnalyticsPage(1);
                    setRecentPeriod(event.target.value);
                  }}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-28"
                />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {SUBSCRIPTION_ANALYTICS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setAnalyticsTab(tab.value);
                    setAnalyticsPage(1);
                  }}
                  className={cn(
                    "h-10 rounded-lg border px-3 text-sm font-semibold transition-colors",
                    analyticsTab === tab.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {analyticsTab === "new" && (
          <SubscriptionDetailTable
            items={newSubscribersQuery.data?.items ?? []}
            isLoading={newSubscribersQuery.isLoading}
            isError={newSubscribersQuery.isError}
            emptyText="Chưa có subscriber mới."
          />
        )}

        {analyticsTab === "quit" && (
          <SubscriptionDetailTable
            items={quitSubscribersQuery.data?.items ?? []}
            isLoading={quitSubscribersQuery.isLoading}
            isError={quitSubscribersQuery.isError}
            emptyText="Chưa có subscriber đã rời."
          />
        )}

        {analyticsTab === "by-plan" && (
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            {subscribersBySubscriptionQuery.isLoading && (
              <div className="col-span-full flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải subscriber theo gói...
              </div>
            )}
            {subscribersBySubscriptionQuery.isError &&
              !subscribersBySubscriptionQuery.isLoading && (
                <div className="col-span-full py-8 text-center text-sm text-destructive">
                  Không thể tải subscriber theo gói.
                </div>
              )}
            {!subscribersBySubscriptionQuery.isLoading &&
              !subscribersBySubscriptionQuery.isError &&
              (subscribersBySubscriptionQuery.data ?? []).length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu theo gói.
                </div>
              )}
            {(subscribersBySubscriptionQuery.data ?? []).map((group, index) => {
              const groupItems = group.items ?? [];
              const planName = groupItems[0]?.plan || `Nhóm ${index + 1}`;

              return (
                <div key={`${planName}-${index}`} className="overflow-hidden rounded-lg border bg-background">
                  <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                    <div>
                      <div className="font-semibold text-foreground">{planName}</div>
                      <div className="text-xs text-muted-foreground">
                        {group.totalItems} subscriber
                      </div>
                    </div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="divide-y">
                    {groupItems.length === 0 && (
                      <div className="px-4 py-5 text-sm text-muted-foreground">
                        Chưa có subscriber trong nhóm này.
                      </div>
                    )}
                    {groupItems.map((item) => (
                      <div key={`${item.userId}-${item.subscribedOn}`} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_120px]">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {item.user || "Người dùng chưa có tên"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Hết hạn: {formatDate(item.expiriesOn)}
                          </div>
                        </div>
                        <div className="font-semibold text-foreground sm:text-right">
                          {formatMoney(item.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {analyticsTab === "recent" && (
          <RecentSubscriberList
            items={recentSubscribersQuery.data?.items ?? []}
            isLoading={recentSubscribersQuery.isLoading}
            isError={recentSubscribersQuery.isError}
          />
        )}

        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Trang detail {analyticsPage}/{analyticsTotalPages}
          </p>
          <div className="flex items-center gap-2">
            <PageJumpInput
              page={analyticsPage}
              totalPages={analyticsTotalPages}
              onPageChange={setAnalyticsPage}
            />
            <button
              type="button"
              onClick={() => setAnalyticsPage((value) => Math.max(1, value - 1))}
              disabled={analyticsPage <= 1}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              onClick={() =>
                setAnalyticsPage((value) =>
                  Math.min(analyticsTotalPages, value + 1),
                )
              }
              disabled={analyticsPage >= analyticsTotalPages}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Danh sách gói
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quản lý giá, thời hạn và trạng thái gói.
              </p>
            </div>
            <button
              type="button"
              onClick={() => plansQuery.refetch()}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Gói
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Giá
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Thời hạn
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Quota
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {plansQuery.isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải gói dịch vụ...
                      </span>
                    </td>
                  </tr>
                )}

                {plansQuery.isError && !plansQuery.isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-destructive">
                      Không thể tải danh sách gói.
                    </td>
                  </tr>
                )}

                {!plansQuery.isLoading && !plansQuery.isError && plans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      Chưa có gói nào. Tạo gói đầu tiên để bắt đầu kiểm thử.
                    </td>
                  </tr>
                )}

                {plans.map((plan) => (
                  <tr key={plan.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {plan.type || "Gói tổ chức"}
                      </div>
                      {plan.description && (
                        <div className="mt-1 line-clamp-2 max-w-xs text-xs text-muted-foreground">
                          {plan.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {formatMoney(plan.price)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {plan.durationDays ? `${plan.durationDays} ngày` : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{plan.maxOrganizations ?? "-"} tổ chức</div>
                      <div className="text-xs">
                        {plan.maxOrganizationUsers ?? "-"} người dùng/tổ chức
                      </div>
                      <div className="text-xs">
                        {formatStorage(plan.maxStorageBytes)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          plan.isActive !== false
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {plan.isActive !== false ? "Đang hoạt động" : "Tạm dừng"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(plan)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"
                          title="Sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(plan)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
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
        </section>

        <section className="rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Phân bổ gói</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Người đăng ký theo từng gói đang bật.
            </p>
          </div>
          <div className="space-y-3 p-5">
            {dashboardQuery.isLoading && (
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải thống kê...
              </div>
            )}
            {!dashboardQuery.isLoading &&
              (dashboard?.subscriberBySubscriptions ?? []).length === 0 && (
                <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                  Chưa có dữ liệu subscriber theo gói.
                </div>
              )}
            {(dashboard?.subscriberBySubscriptions ?? []).map((item) => {
              const total = Math.max(1, dashboard?.subscriber ?? 0);
              const width = `${Math.min(100, (item.numberOfSubscriber / total) * 100)}%`;
              return (
                <div key={item.subscriptionName} className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {item.subscriptionName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.numberOfSubscriber}
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-foreground" style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Gán gói cho user
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quản trị viên cấp hoặc gia hạn gói đang bật cho một người dùng cụ thể.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGiveSubscription}
            disabled={giveSubscriptionMutation.isPending || activePlans.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {giveSubscriptionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BadgeDollarSign className="h-4 w-4" />
            )}
            Gán gói
          </button>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(220px,1fr)_minmax(240px,1fr)_minmax(220px,0.8fr)]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tìm user</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={grantSearchInput}
                  onChange={(event) => setGrantSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearchGrantUser();
                  }}
                  placeholder="Tên hoặc email"
                  className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchGrantUser}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                <Search className="h-4 w-4" />
                Tìm
              </button>
            </div>
          </div>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Người dùng</span>
            <select
              value={grantUserId}
              onChange={(event) => setGrantUserId(event.target.value)}
              disabled={!grantSearch || grantUsersQuery.isLoading}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {grantUsersQuery.isLoading
                  ? "Đang tải user..."
                  : grantSearch
                    ? "Chọn user"
                    : "Tìm user trước"}
              </option>
              {grantUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {(item.displayName || item.email || "Người dùng") + " - " + item.email}
                </option>
              ))}
            </select>
            {grantSearch && !grantUsersQuery.isLoading && grantUsers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Không tìm thấy user phù hợp.
              </p>
            )}
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Gói</span>
            <select
              value={grantPlanId}
              onChange={(event) => setGrantPlanId(event.target.value)}
              disabled={activePlans.length === 0}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {activePlans.length === 0 ? "Chưa có gói đang bật" : "Chọn gói"}
              </option>
              {activePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {formatMoney(plan.price)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Người đăng ký</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Danh sách người dùng đang có gói hoạt động.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={subscriberSearchInput}
                onChange={(event) => setSubscriberSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setSubscriberPage(1);
                    setSubscriberSearch(subscriberSearchInput.trim());
                  }
                }}
                placeholder="Tên user hoặc gói"
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-64"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSubscriberPage(1);
                setSubscriberSearch(subscriberSearchInput.trim());
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              <Search className="h-4 w-4" />
              Tìm
            </button>
            <button
              type="button"
              onClick={() => subscribersQuery.refetch()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Người dùng
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Gói
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Giá
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Ngày đăng ký
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Hết hạn
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Còn lại
                </th>
              </tr>
            </thead>
            <tbody>
              {subscribersQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải subscriber...
                    </span>
                  </td>
                </tr>
              )}

              {subscribersQuery.isError && !subscribersQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-destructive">
                    Không thể tải subscriber.
                  </td>
                </tr>
              )}

              {!subscribersQuery.isLoading &&
                !subscribersQuery.isError &&
                subscribers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Chưa có người đăng ký đang hoạt động.
                    </td>
                  </tr>
                )}

              {subscribers.map((subscriber) => (
                <tr key={`${subscriber.userId}-${subscriber.plan}`} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {subscriber.user || "Người dùng chưa có tên"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {subscriber.plan || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {formatMoney(subscriber.price)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(subscriber.subscribedOn)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(subscriber.expiriesOn)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatRemainingDayCount(subscriber.dayRemaining)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Tổng: {subscribersQuery.data?.totalItems ?? 0} subscriber
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubscriberPage((value) => Math.max(1, value - 1))}
              disabled={subscriberPage <= 1}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <span className="text-sm text-muted-foreground">
              Trang {subscriberPage}/{totalSubscriberPages}
            </span>
            <PageJumpInput
              page={subscriberPage}
              totalPages={totalSubscriberPages}
              onPageChange={setSubscriberPage}
            />
            <button
              type="button"
              onClick={() =>
                setSubscriberPage((value) =>
                  Math.min(totalSubscriberPages, value + 1),
                )
              }
              disabled={subscriberPage >= totalSubscriberPages}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      <AppModal
        open={Boolean(deletePlanTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeletePlanTarget(null);
        }}
        title="Xóa gói dịch vụ"
        description="Gói bị xóa sẽ không còn hiển thị để người dùng đăng ký."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeletePlanTarget(null)}
              disabled={deleteMutation.isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmDeletePlan}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xóa gói
            </button>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            {deletePlanTarget?.name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMoney(deletePlanTarget?.price)} ·{" "}
            {deletePlanTarget?.durationDays ?? 0} ngày
          </p>
        </div>
      </AppModal>

      <AppModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={formMode === "create" ? "Tạo gói dịch vụ" : "Cập nhật gói dịch vụ"}
        description="Thiết lập giá, thời hạn và trạng thái gói."
        className="max-w-4xl"
        contentClassName="max-h-[72vh]"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Tên gói</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Loại gói</span>
                  <input
                    required
                    value={form.type}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, type: event.target.value }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                  <span>Mô tả</span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Giá</span>
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, price: event.target.value }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Thời hạn ngày</span>
                  <input
                    type="number"
                    min={0}
                    value={form.durationDays}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        durationDays: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Số tổ chức tối đa</span>
                  <input
                    type="number"
                    min={0}
                    value={form.maxOrganizations}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        maxOrganizations: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Người dùng tối đa / tổ chức</span>
                  <input
                    type="number"
                    min={0}
                    value={form.maxOrganizationUsers}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        maxOrganizationUsers: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Dung lượng lưu trữ GB</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.maxStorageGb}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        maxStorageGb: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Điểm đổi gói</span>
                  <input
                    type="number"
                    min={0}
                    value={form.pointsCost}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        pointsCost: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Điểm thưởng</span>
                  <input
                    type="number"
                    min={0}
                    value={form.rewardPoints}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        rewardPoints: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Thứ tự hiển thị</span>
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        sortOrder: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-lg border bg-background px-3 py-3 text-sm font-medium sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  Đang hoạt động
                </label>
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
                  {isMutating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BadgeDollarSign className="h-4 w-4" />
                  )}
                  {formMode === "create" ? "Tạo" : "Lưu"}
                </button>
              </div>
        </form>
      </AppModal>
    </div>
  );
}


