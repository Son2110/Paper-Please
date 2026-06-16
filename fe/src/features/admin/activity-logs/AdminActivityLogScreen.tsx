import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { activityLogApi, type ActivityLogDTO } from "@/api/activityLogApi";
import { queryKeys } from "@/api/queryKeys";
import { AppModal } from "@/shared/components/AppModal";

const pageSize = 12;

function formatDateTime(value?: string) {
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

function toDateInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b),
  );
}

function matchDateRange(log: ActivityLogDTO, from: string, to: string) {
  const timestamp = new Date(log.timestamp).getTime();
  if (Number.isNaN(timestamp)) return true;

  if (from) {
    const fromTime = new Date(`${from}T00:00:00`).getTime();
    if (timestamp < fromTime) return false;
  }

  if (to) {
    const toTime = new Date(`${to}T23:59:59`).getTime();
    if (timestamp > toTime) return false;
  }

  return true;
}

function roleLabel(role?: string | null) {
  if (!role) return "Người dùng";
  if (role === "Admin") return "Quản trị viên";
  if (role === "Moderator") return "Điều phối viên";
  if (role === "User") return "Người dùng";
  return role;
}

export function AdminActivityLogScreen() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [category, setCategory] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const logsQuery = useQuery({
    queryKey: queryKeys.admin.activityLogs,
    queryFn: activityLogApi.getAll,
    staleTime: 30_000,
  });

  const clearMutation = useMutation({
    mutationFn: activityLogApi.clearAll,
    onSuccess: () => {
      toast.success("Đã xóa nhật ký hệ thống");
      setShowClearConfirm(false);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.activityLogs });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể xóa nhật ký");
    },
  });

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const categories = useMemo(() => uniqueSorted(logs.map((log) => log.category)), [logs]);

  const filteredLogs = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return logs
      .filter((log) => {
        if (category && log.category !== category) return false;
        if (!matchDateRange(log, fromDate, toDate)) return false;

        if (!query) return true;

        const haystack = [
          log.user?.displayName,
          log.targetType,
          log.action,
          log.details,
          log.category,
          log.reason,
          log.actorRole,
          log.deviceInfo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }, [category, fromDate, logs, searchValue, toDate]);

  const today = toDateInputValue(new Date().toISOString());
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const visibleLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);
  const todayCount = logs.filter((log) => toDateInputValue(log.timestamp) === today).length;
  const systemCount = logs.filter((log) =>
    (log.category ?? log.action ?? "").toLowerCase().includes("hệ thống"),
  ).length;

  const resetFilters = () => {
    setSearchInput("");
    setSearchValue("");
    setCategory("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const handleClearLogs = () => {
    setShowClearConfirm(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quản trị hệ thống
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Nhật ký hoạt động
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => logsQuery.refetch()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
          <button
            type="button"
            onClick={handleClearLogs}
            disabled={clearMutation.isPending || logs.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-card px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Xóa nhật ký
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-l-4 border-l-sky-500 bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Tổng nhật ký</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{logs.length}</p>
        </div>
        <div className="rounded-lg border border-l-4 border-l-emerald-500 bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Hôm nay</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{todayCount}</p>
        </div>
        <div className="rounded-lg border border-l-4 border-l-amber-500 bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Hệ thống</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{systemCount}</p>
        </div>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(220px,1fr)_180px_150px_150px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setSearchValue(searchInput);
                  setPage(1);
                }
              }}
              placeholder="Tìm nhật ký"
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Tất cả nhóm</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchValue(searchInput);
                setPage(1);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              <Search className="h-4 w-4" />
              Tìm
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted"
              title="Đặt lại"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Người thực hiện
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Đối tượng
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Nội dung
                </th>
              </tr>
            </thead>
            <tbody>
              {logsQuery.isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải nhật ký...
                    </span>
                  </td>
                </tr>
              )}

              {logsQuery.isError && !logsQuery.isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-destructive">
                    Không thể tải nhật ký hoạt động.
                  </td>
                </tr>
              )}

              {!logsQuery.isLoading && !logsQuery.isError && visibleLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    Không có nhật ký phù hợp.
                  </td>
                </tr>
              )}

              {visibleLogs.map((log) => (
                <tr key={log.id} className="border-t align-top">
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {log.user?.displayName || log.user?.email || "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {roleLabel(log.actorRole)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {log.targetType || log.category || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[360px] whitespace-normal text-foreground">
                      {log.details || "-"}
                    </div>
                    {log.reason && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-destructive">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {log.reason}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Hiển thị {visibleLogs.length}/{filteredLogs.length} nhật ký
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
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      <AppModal
        open={showClearConfirm}
        onOpenChange={(open) => {
          if (!open && !clearMutation.isPending) setShowClearConfirm(false);
        }}
        title="Xóa nhật ký hoạt động"
        description="Toàn bộ nhật ký hệ thống hiện có sẽ bị xóa."
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              disabled={clearMutation.isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xóa nhật ký
            </button>
          </>
        }
      >
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Thao tác này không thể hoàn tác. Hiện có {logs.length} nhật ký trong hệ thống.
        </div>
      </AppModal>
    </div>
  );
}
