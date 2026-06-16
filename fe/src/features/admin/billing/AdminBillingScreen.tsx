import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { billingApi, type BillingRecordDTO } from "@/api/billingApi";
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusTone(status?: string) {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("ok") || normalized.includes("success")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized.includes("pending")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized.includes("fail") || normalized.includes("cancel")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-border bg-muted text-muted-foreground";
}

function statusLabel(status?: string | null) {
  if (!status) return "Chưa rõ";
  const normalized = status.toLowerCase();
  if (normalized.includes("success") || normalized.includes("ok")) return "Thành công";
  if (normalized.includes("pending")) return "Đang chờ";
  if (normalized.includes("fail")) return "Thất bại";
  if (normalized.includes("cancel")) return "Đã hủy";
  return status;
}

function BillingAdminRow({ record }: { record: BillingRecordDTO }) {
  const userName = record.user?.displayName || record.user?.email || "Người dùng";
  const planName = record.subscription?.name || "Gói dịch vụ";

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{userName}</div>
        <div className="text-xs text-muted-foreground">{record.user?.email || "-"}</div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{planName}</div>
        <details className="mt-1 text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Chi tiết</summary>
          <div className="mt-2 space-y-1 rounded-lg bg-muted/50 p-2">
            <div>Cổng: {record.paymentGateway || "-"}</div>
            <div>Phương thức: {record.paymentMethod || "-"}</div>
            <div>Ngày thanh toán: {formatDate(record.paidAt)}</div>
          </div>
        </details>
      </td>
      <td className="px-4 py-3 font-semibold text-foreground">
        {formatMoney(record.total ?? record.subtotal)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        <div>{record.paymentGateway || "-"}</div>
        <div className="text-xs">{record.paymentMethod || "-"}</div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(record.paidAt)}</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
            statusTone(record.status),
          )}
        >
          {statusLabel(record.status)}
        </span>
      </td>
    </tr>
  );
}

export function AdminBillingScreen() {
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [ascOrder, setAscOrder] = useState<boolean | null>(false);

  const billingQuery = useQuery({
    queryKey: queryKeys.admin.billing({ page, pageSize: 10, query, ascOrder }),
    queryFn: () =>
      billingApi.queryAll({
        query: query || undefined,
        ascOrder,
        page,
        pageSize: 10,
      }),
    staleTime: 30_000,
  });

  const records = billingQuery.data?.items ?? [];
  const totalPages = Math.max(1, billingQuery.data?.totalPages ?? 1);
  const pageTotal = records.reduce((sum, record) => sum + (record.total ?? 0), 0);

  const applySearch = () => {
    setPage(1);
    setQuery(queryInput.trim());
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quản trị hệ thống
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Thanh toán</h1>
        </div>
        <button
          type="button"
          onClick={() => billingQuery.refetch()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-l-4 border-l-sky-500 bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Giao dịch trang này</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{records.length}</p>
        </div>
        <div className="rounded-lg border border-l-4 border-l-emerald-500 bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Doanh thu trang này</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatMoney(pageTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-l-4 border-l-amber-500 bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Bộ lọc</p>
          <p className="mt-2 truncate text-xl font-bold text-foreground">
            {query || "Tất cả"}
          </p>
        </div>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Lịch sử thanh toán
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Theo dõi giao dịch theo người dùng, gói dịch vụ và trạng thái.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applySearch();
                }}
                placeholder="Tên, email, gói..."
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-72"
              />
            </div>
            <select
              value={ascOrder === null ? "none" : ascOrder ? "asc" : "desc"}
              onChange={(event) => {
                setPage(1);
                setAscOrder(
                  event.target.value === "none"
                    ? null
                    : event.target.value === "asc",
                );
              }}
              className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="desc">Mới nhất</option>
              <option value="asc">Cũ nhất</option>
              <option value="none">Mặc định</option>
            </select>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              <Search className="h-4 w-4" />
              Tìm
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Người dùng
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Gói dịch vụ
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Tổng tiền
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Cổng thanh toán
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Thời gian trả
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {billingQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải giao dịch...
                    </span>
                  </td>
                </tr>
              )}
              {billingQuery.isError && !billingQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-destructive">
                    Không thể tải lịch sử thanh toán.
                  </td>
                </tr>
              )}
              {!billingQuery.isLoading &&
                !billingQuery.isError &&
                records.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      Chưa có giao dịch phù hợp.
                    </td>
                  </tr>
                )}
              {records.map((record) => (
                <BillingAdminRow key={record.billingId} record={record} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            Tổng: {billingQuery.data?.totalItems ?? 0} giao dịch
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
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              Trang {page}/{totalPages}
            </span>
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
      </section>
    </div>
  );
}
