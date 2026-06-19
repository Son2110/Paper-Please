import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { adminUserApi } from "@/api/adminUserApi";
import {
  notificationApi,
  type NotificationDTO,
  type NotificationSendRequest,
} from "@/api/notificationApi";
import { queryKeys } from "@/api/queryKeys";
import type { UserDTO } from "@/api/userApi";
import { PageJumpInput } from "@/shared/components/PageJumpInput";
import {
  translateNotificationText,
  translateNotificationType,
} from "@/shared/lib/notificationText";

const notificationTypes = [
  { value: "System", label: "Hệ thống" },
  { value: "Reminder", label: "Nhắc việc" },
  { value: "Warning", label: "Cảnh báo" },
  { value: "Success", label: "Thành công" },
  { value: "Message", label: "Tin nhắn" },
];

const targetTypes = [
  { value: "System", label: "Hệ thống" },
  { value: "User", label: "Người dùng" },
  { value: "Subscription", label: "Gói dịch vụ" },
  { value: "Billing", label: "Thanh toán" },
  { value: "Document", label: "Tài liệu" },
];

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

function findLabel(
  options: { value: string; label: string }[],
  value?: string | null,
) {
  return (
    options.find((item) => item.value === value)?.label ||
    translateNotificationType(value)
  );
}

function typeClass(type?: string) {
  const normalized = type?.toLowerCase() ?? "";
  if (normalized.includes("warning") || normalized.includes("reminder")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized.includes("success")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized.includes("message")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-border bg-muted text-muted-foreground";
}

function SentNotificationRow({ item }: { item: NotificationDTO }) {
  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">
          {translateNotificationText(item.title)}
        </div>
        <div className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">
          {translateNotificationText(item.message)}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${typeClass(
            item.type,
          )}`}
        >
          {findLabel(notificationTypes, item.type)}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        <div>{item.userId ? "Một người dùng" : "Toàn hệ thống"}</div>
        <details className="mt-1 text-xs">
          <summary className="cursor-pointer hover:text-foreground">Chi tiết</summary>
          <div className="mt-2 space-y-1 rounded-lg bg-muted/50 p-2">
            <div>Phạm vi: {findLabel(targetTypes, item.targetType)}</div>
            <div>Người gửi: {item.sender || "-"}</div>
          </div>
        </details>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(item.sentAt)}</td>
    </tr>
  );
}

export function AdminNotificationScreen() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetMode, setTargetMode] = useState<"broadcast" | "user">("broadcast");
  const [targetSearch, setTargetSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "System",
    sender: "",
    targetType: "System",
  });

  const sentQuery = useQuery({
    queryKey: queryKeys.admin.notifications({ page, pageSize: 10, searchQuery }),
    queryFn: () =>
      notificationApi.getSent({
        searchQuery: searchQuery || undefined,
        page,
        pageSize: 10,
      }),
    staleTime: 30_000,
  });

  const userSearchQuery = useQuery({
    queryKey: queryKeys.admin.users({
      searchValue: targetSearch.trim(),
      pageNumber: 1,
      pageSize: 5,
    }),
    queryFn: () =>
      adminUserApi.queryUsers({
        searchValue: targetSearch.trim(),
        pageNumber: 1,
        pageSize: 5,
      }),
    enabled: targetMode === "user" && targetSearch.trim().length >= 2,
    staleTime: 20_000,
  });

  const sendMutation = useMutation({
    mutationFn: (request: NotificationSendRequest) => notificationApi.send(request),
    onSuccess: () => {
      toast.success("Đã gửi thông báo");
      setForm((prev) => ({ ...prev, title: "", message: "" }));
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể gửi thông báo");
    },
  });

  const users = userSearchQuery.data?.items ?? [];
  const records = sentQuery.data?.items ?? [];
  const totalPages = Math.max(1, sentQuery.data?.totalPages ?? 1);

  const canSubmit = useMemo(() => {
    if (!form.title.trim() || !form.message.trim()) return false;
    if (targetMode === "user" && !selectedUser?.id) return false;
    return true;
  }, [form.message, form.title, selectedUser?.id, targetMode]);

  const applySearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    sendMutation.mutate({
      userId: targetMode === "user" ? selectedUser?.id : null,
      title: form.title.trim(),
      message: form.message.trim(),
      type: form.type,
      sender: form.sender.trim() || null,
      targetType: form.targetType || null,
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quản trị hệ thống
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Thông báo</h1>
        </div>
        <button
          type="button"
          onClick={() => sentQuery.refetch()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.5fr)]">
        <section className="rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Send className="h-5 w-5 text-primary" />
              Gửi thông báo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chọn toàn hệ thống hoặc một người dùng cụ thể.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => {
                  setTargetMode("broadcast");
                  setSelectedUser(null);
                }}
                className={`h-9 rounded-md text-sm font-semibold transition-colors ${
                  targetMode === "broadcast"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Toàn hệ thống
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("user")}
                className={`h-9 rounded-md text-sm font-semibold transition-colors ${
                  targetMode === "user"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Một người dùng
              </button>
            </div>

            {targetMode === "user" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Tìm người nhận
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={targetSearch}
                    onChange={(event) => {
                      setTargetSearch(event.target.value);
                      setSelectedUser(null);
                    }}
                    placeholder="Tên hoặc email"
                    className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {selectedUser ? (
                  <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {selectedUser.displayName || selectedUser.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {selectedUser.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Đổi
                    </button>
                  </div>
                ) : (
                  targetSearch.trim().length >= 2 && (
                    <div className="max-h-52 overflow-auto rounded-lg border bg-background">
                      {userSearchQuery.isLoading && (
                        <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tìm người dùng...
                        </div>
                      )}
                      {!userSearchQuery.isLoading && users.length === 0 && (
                        <div className="px-3 py-3 text-sm text-muted-foreground">
                          Không tìm thấy người dùng phù hợp.
                        </div>
                      )}
                      {users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {user.displayName || user.email}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground">Tiêu đề</label>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Nội dung</label>
              <textarea
                value={form.message}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, message: event.target.value }))
                }
                rows={4}
                className="mt-1 w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <details className="rounded-lg border bg-background p-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                Tùy chọn nâng cao
              </summary>
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-foreground">
                    <span>Loại thông báo</span>
                    <select
                      value={form.type}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, type: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {notificationTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-medium text-foreground">
                    <span>Nhóm liên quan</span>
                    <select
                      value={form.targetType}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          targetType: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {targetTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-medium text-foreground">
                  Người gửi hiển thị
                  <input
                    value={form.sender}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, sender: event.target.value }))
                    }
                    placeholder="Để trống nếu dùng tên quản trị viên"
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
            </details>

            <button
              type="submit"
              disabled={!canSubmit || sendMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Gửi thông báo
            </button>
          </form>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Megaphone className="h-5 w-5 text-primary" />
                Đã gửi gần đây
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tra cứu thông báo đã gửi theo tiêu đề, nội dung hoặc người gửi.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applySearch();
                  }}
                  placeholder="Tìm thông báo"
                  className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-72"
                />
              </div>
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
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Nội dung
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Loại
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Người nhận
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Thời gian gửi
                  </th>
                </tr>
              </thead>
              <tbody>
                {sentQuery.isLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải thông báo...
                      </span>
                    </td>
                  </tr>
                )}
                {sentQuery.isError && !sentQuery.isLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-destructive">
                      Không thể tải thông báo đã gửi.
                    </td>
                  </tr>
                )}
                {!sentQuery.isLoading && !sentQuery.isError && records.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      Chưa có thông báo phù hợp.
                    </td>
                  </tr>
                )}
                {records.map((item) => (
                  <SentNotificationRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              Tổng: {sentQuery.data?.totalItems ?? 0} thông báo
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
                <CheckCircle className="h-4 w-4" />
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
        </section>
      </div>
    </div>
  );
}
