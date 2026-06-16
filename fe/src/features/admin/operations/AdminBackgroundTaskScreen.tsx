import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Power, RefreshCw, ServerCog, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import {
  backgroundTaskApi,
  type BackgroundTaskType,
} from "@/api/backgroundTaskApi";

const taskLabels: Record<BackgroundTaskType, { title: string; description: string }> = {
  BillingRecords: {
    title: "Billing records",
    description: "Job đồng bộ/cập nhật billing record định kỳ.",
  },
  SubscriptionEmailReminder: {
    title: "Subscription email reminder",
    description: "Job gửi email nhắc subscription sắp hết hạn.",
  },
  SubscriptionExpiration: {
    title: "Subscription expiration",
    description: "Job đánh dấu subscription đã hết hạn.",
  },
};

export function AdminBackgroundTaskScreen() {
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({
    queryKey: ["admin-background-tasks"],
    queryFn: backgroundTaskApi.getAll,
    staleTime: 15_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-background-tasks"] });

  const taskMutation = useMutation({
    mutationFn: ({
      action,
      taskType,
    }: {
      action: "toggle" | "enable" | "disable";
      taskType: BackgroundTaskType;
    }) => backgroundTaskApi[action](taskType),
    onSuccess: () => {
      toast.success("Đã cập nhật background task");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật task"),
  });

  const tasks = tasksQuery.data ?? {
    BillingRecords: false,
    SubscriptionEmailReminder: false,
    SubscriptionExpiration: false,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Admin Console
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Tác vụ nền
          </h1>
        </div>
        <button
          type="button"
          onClick={() => tasksQuery.refetch()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Tải lại
        </button>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        {(Object.keys(taskLabels) as BackgroundTaskType[]).map((taskType) => {
          const enabled = Boolean(tasks[taskType]);
          const meta = taskLabels[taskType];
          return (
            <div key={taskType} className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ServerCog className="h-5 w-5 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">
                      {meta.title}
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    enabled
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {enabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <button
                  type="button"
                  onClick={() => taskMutation.mutate({ action: "toggle", taskType })}
                  disabled={taskMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enabled ? (
                    <ToggleRight className="h-4 w-4" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                  Toggle
                </button>
                <button
                  type="button"
                  onClick={() => taskMutation.mutate({ action: "enable", taskType })}
                  disabled={taskMutation.isPending || enabled}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Power className="h-4 w-4" />
                  Enable
                </button>
                <button
                  type="button"
                  onClick={() => taskMutation.mutate({ action: "disable", taskType })}
                  disabled={taskMutation.isPending || !enabled}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {taskMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  Disable
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {tasksQuery.isError && (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm text-destructive">
          Không thể tải trạng thái background jobs.
        </div>
      )}
    </div>
  );
}
