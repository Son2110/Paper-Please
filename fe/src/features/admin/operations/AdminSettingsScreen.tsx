import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  systemConfigApi,
  type SystemConfigurationDTO,
} from "@/api/systemConfigApi";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="break-all text-sm font-medium text-foreground">
        {value || "Chưa có"}
      </span>
    </div>
  );
}

function formatDateTime(value?: string | null) {
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

function getConfigGroup(key: string) {
  if (key.startsWith("Subscription_")) return "Subscription";
  if (key.startsWith("BillingRecord_")) return "Billing";
  if (key.startsWith("StoryPublish_")) return "Publish";
  if (key.startsWith("Login_")) return "Login";
  return "System";
}

function getGroupClass(group: string) {
  if (group === "Subscription") return "border-sky-200 bg-sky-50 text-sky-700";
  if (group === "Billing") return "border-amber-200 bg-amber-50 text-amber-700";
  if (group === "Publish") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (group === "Login") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-border bg-muted text-muted-foreground";
}

function configLabel(key: string) {
  return key.replace(/_/g, " ");
}

function sortConfigs(configs: SystemConfigurationDTO[]) {
  return [...configs].sort((a, b) => {
    const groupCompare = getConfigGroup(a.key).localeCompare(getConfigGroup(b.key));
    if (groupCompare !== 0) return groupCompare;
    return a.key.localeCompare(b.key);
  });
}

export function AdminSettingsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const configsQuery = useQuery({
    queryKey: ["admin-system-configs"],
    queryFn: systemConfigApi.getAll,
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      systemConfigApi.update(key, { value }),
    onSuccess: () => {
      toast.success("Đã cập nhật cấu hình");
      setEditingKey(null);
      setDraftValue("");
      queryClient.invalidateQueries({ queryKey: ["admin-system-configs"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật cấu hình");
    },
  });

  const refreshCacheMutation = useMutation({
    mutationFn: systemConfigApi.refreshCache,
    onSuccess: () => {
      toast.success("Đã làm mới cache cấu hình");
      queryClient.invalidateQueries({ queryKey: ["admin-system-configs"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể làm mới cache");
    },
  });

  const configs = useMemo(() => configsQuery.data ?? [], [configsQuery.data]);
  const filteredConfigs = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const result = query
      ? configs.filter((config) =>
          [config.key, config.value, getConfigGroup(config.key)]
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : configs;

    return sortConfigs(result);
  }, [configs, searchValue]);

  const groups = useMemo(
    () => Array.from(new Set(configs.map((config) => getConfigGroup(config.key)))),
    [configs],
  );

  const beginEdit = (config: SystemConfigurationDTO) => {
    setEditingKey(config.key);
    setDraftValue(config.value ?? "");
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftValue("");
  };

  const saveEdit = (key: string) => {
    updateMutation.mutate({ key, value: draftValue.trim() });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quản trị hệ thống
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          Thiết lập hệ thống
        </h1>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border bg-card">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <UserRound className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Tài khoản admin
              </h2>
              <p className="text-sm text-muted-foreground">
                Thông tin phiên đăng nhập hiện tại.
              </p>
            </div>
          </div>
          <div className="px-5 py-2">
            <Row label="Tên hiển thị" value={user?.displayName} />
            <Row label="Email" value={user?.email} />
            <Row label="Số điện thoại" value={user?.phoneNumber} />
            <Row label="Vai trò" value={user?.userType} />
            <Row label="Trạng thái" value={user?.status} />
          </div>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <ShieldCheck className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Phạm vi quản trị
              </h2>
              <p className="text-sm text-muted-foreground">
                Trạng thái các khu vực vận hành.
              </p>
            </div>
          </div>
          <div className="grid gap-3 p-5">
            {["Dashboard hệ thống", "Quản lý người dùng", "Thông báo", "CDN"].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-lg border bg-background px-4 py-3"
                >
                  <span className="text-sm font-medium text-foreground">{item}</span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Đã bật
                  </span>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card xl:col-span-2">
          <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Cấu hình hệ thống
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {configs.length} key · {groups.length} nhóm
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setSearchValue(searchInput);
                  }}
                  placeholder="Tìm cấu hình"
                  className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-56"
                />
              </div>
              <button
                type="button"
                onClick={() => setSearchValue(searchInput)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                <Search className="h-4 w-4" />
                Tìm
              </button>
              <button
                type="button"
                onClick={() => configsQuery.refetch()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" />
                Tải lại
              </button>
              <button
                type="button"
                onClick={() => refreshCacheMutation.mutate()}
                disabled={refreshCacheMutation.isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshCacheMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Làm mới cache
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Nhóm
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Giá trị
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Cập nhật
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {configsQuery.isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải cấu hình...
                      </span>
                    </td>
                  </tr>
                )}

                {configsQuery.isError && !configsQuery.isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-destructive">
                      Không thể tải cấu hình hệ thống.
                    </td>
                  </tr>
                )}

                {!configsQuery.isLoading &&
                  !configsQuery.isError &&
                  filteredConfigs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        Không có cấu hình phù hợp.
                      </td>
                    </tr>
                  )}

                {filteredConfigs.map((config) => {
                  const group = getConfigGroup(config.key);
                  const isEditing = editingKey === config.key;

                  return (
                    <tr key={config.key} className="border-t">
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                            getGroupClass(group),
                          )}
                        >
                          {group}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {configLabel(config.key)}
                        </div>
                        <div className="text-xs text-muted-foreground">{config.key}</div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={draftValue}
                            onChange={(event) => setDraftValue(event.target.value)}
                            className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="font-mono text-sm text-foreground">
                            {config.value}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{formatDateTime(config.updatedAt)}</div>
                        <div className="text-xs">
                          {config.updatedBy?.displayName || config.createdBy?.displayName || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveEdit(config.key)}
                                disabled={updateMutation.isPending}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Lưu"
                              >
                                {updateMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"
                                title="Hủy"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => beginEdit(config)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"
                              title="Sửa"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
