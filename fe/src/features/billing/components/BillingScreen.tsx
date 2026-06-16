import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/httpClient";
import {
  billingApi,
  type BillingRecordDTO,
  type VnPayUrlResponse,
} from "@/api/billingApi";
import { subscriptionApi, type SubscriptionDTO } from "@/api/subscriptionApi";
import { queryKeys } from "@/api/queryKeys";
import { cn } from "@/lib/utils";

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

function getRemainingDays(endDate?: string | null, fallback?: number | null) {
  if (!endDate) return fallback ?? 0;

  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return fallback ?? 0;

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.ceil(
    (endDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(0, diff);
}

function formatRemainingDays(endDate?: string | null, fallback?: number | null) {
  const days = getRemainingDays(endDate, fallback);
  if (days <= 0) return "Đã hết hạn";
  return `${days} ngày`;
}

function formatStorage(value?: number | null) {
  if (value == null) return "-";
  if (value >= 1024 * 1024 * 1024) {
    const gb = value / (1024 * 1024 * 1024);
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`;
  return `${value} bytes`;
}

function statusTone(status?: string) {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("ok") || normalized.includes("success")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized.includes("pending")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-border bg-muted text-muted-foreground";
}

function extractVnPayUrl(response: VnPayUrlResponse) {
  if (typeof response === "string") return response;
  return response.paymentUrl || response.url || response.data || "";
}

function PlanQuota({ plan }: { plan: SubscriptionDTO }) {
  const maxOrganizations = plan.maxOrganizations ?? null;
  const maxOrganizationUsers = plan.maxOrganizationUsers ?? null;
  const quotaItems = [
    maxOrganizations != null ? `${maxOrganizations} tổ chức` : null,
    maxOrganizationUsers != null
      ? `${maxOrganizationUsers} người dùng/tổ chức`
      : null,
    plan.maxStorageBytes != null ? formatStorage(plan.maxStorageBytes) : null,
  ].filter(Boolean);

  if (quotaItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {plan.durationDays
          ? `${plan.durationDays} ngày sử dụng`
          : "Gói đang khả dụng"}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {quotaItems.map((item) => (
        <span
          key={item}
          className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function BillingRow({ record }: { record: BillingRecordDTO }) {
  return (
    <tr className="border-t">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">
          {record.subscription?.name || "Gói dịch vụ"}
        </div>
        <div className="text-xs text-muted-foreground">Thanh toán VNPay</div>
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
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
            statusTone(record.status),
          )}
        >
          {record.status || "-"}
        </span>
      </td>
    </tr>
  );
}

export function BillingScreen() {
  const [page, setPage] = useState(1);
  const [ascOrder, setAscOrder] = useState<boolean | null>(false);

  const billingQuery = useQuery({
    queryKey: queryKeys.billing.mine({ page, pageSize: 8, ascOrder }),
    queryFn: () => billingApi.getMyHistory({ page, pageSize: 8, ascOrder }),
    staleTime: 30_000,
  });

  const plansQuery = useQuery({
    queryKey: queryKeys.subscriptions.active,
    queryFn: subscriptionApi.getActive,
    staleTime: 30_000,
  });

  const payMutation = useMutation({
    mutationFn: billingApi.createVnPayUrl,
    onSuccess: (response) => {
      const url = extractVnPayUrl(response);
      if (!url) {
        toast.error("BE chưa trả payment URL");
        return;
      }
      window.location.assign(url);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể tạo link thanh toán",
      );
    },
  });

  const hasNoActiveSubscription =
    billingQuery.error instanceof ApiError &&
    billingQuery.error.message.toLowerCase().includes("subscription");

  const billing = billingQuery.data;
  const records = billing?.billingHistory.items ?? [];
  const totalPages = Math.max(1, billing?.billingHistory.totalPages ?? 1);
  const plans = plansQuery.data ?? [];
  const remainingText = billing
    ? formatRemainingDays(
        billing.subscriptionEndDate,
        billing.remainSubscriptionDays,
      )
    : "-";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Thanh toán
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Thanh toán & gói dịch vụ
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            billingQuery.refetch();
            plansQuery.refetch();
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Tải lại
        </button>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.45fr)]">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Gói hiện tại
            </div>
            {billingQuery.isLoading && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải thông tin gói...
              </div>
            )}
            {!billingQuery.isLoading && billing && (
              <div className="mt-3">
                <h2 className="text-xl font-bold text-foreground">
                  {billing.subscriptionName || "Gói dịch vụ"}
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Còn lại</p>
                    <p className="mt-1 text-lg font-bold">
                      {remainingText}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Giá gói</p>
                    <p className="mt-1 text-lg font-bold">
                      {formatMoney(billing.subscriptionPrice)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Hết hạn</p>
                    <p className="mt-1 text-lg font-bold">
                      {formatDate(billing.subscriptionEndDate)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!billingQuery.isLoading && !billing && (
              <div className="mt-4 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                {hasNoActiveSubscription
                  ? "Bạn chưa có gói active. Chọn một gói bên dưới để thanh toán qua VNPay."
                  : "Chưa tải được thông tin billing. Có thể BE chưa có dữ liệu subscription cho user này."}
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ReceiptText className="h-4 w-4" />
              Tổng chi tiêu
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {formatMoney(billing?.totalMoneySpent)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {billing?.email || "Theo lịch sử thanh toán thành công"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Gói đang mở bán
          </h2>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {plansQuery.isLoading && (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải gói...
            </div>
          )}
          {!plansQuery.isLoading && plans.length === 0 && (
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              Chưa có gói active để mua.
            </div>
          )}
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.type || "Gói dịch vụ"}
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-4 text-2xl font-bold text-foreground">
                {formatMoney(plan.price)}
              </p>
              <div className="mt-3">
                <PlanQuota plan={plan} />
              </div>
              <button
                type="button"
                onClick={() => payMutation.mutate(plan.id)}
                disabled={payMutation.isPending}
                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {payMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Thanh toán VNPay
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Lịch sử thanh toán
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Các giao dịch VNPay và trạng thái billing của bạn.
            </p>
          </div>
          <select
            value={ascOrder ? "asc" : "desc"}
            onChange={(event) => {
              setPage(1);
              setAscOrder(event.target.value === "asc");
            }}
            className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="desc">Mới nhất</option>
            <option value="asc">Cũ nhất</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Gói / Mã giao dịch
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
              {billingQuery.isLoading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải lịch sử...
                    </span>
                  </td>
                </tr>
              )}
              {!billingQuery.isLoading && records.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Chưa có giao dịch billing.
                  </td>
                </tr>
              )}
              {records.map((record) => (
                <BillingRow key={record.billingId} record={record} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Tổng: {billing?.billingHistory.totalItems ?? 0} giao dịch
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
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              disabled={page >= totalPages}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
