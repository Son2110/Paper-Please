import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCcw,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  documentApi,
  type PendingWorkflowTaskDTO,
  type WorkflowStepType,
} from "@/api/documentApi";
import { queryKeys } from "@/api/queryKeys";
import { AppModal } from "@/shared/components/AppModal";
import type { Document } from "@/pages/Index";

interface ApprovalsProps {
  documents?: Document[];
  onOpenDetail: (docId: string) => void;
}

const stepTypeLabels: Record<WorkflowStepType, string> = {
  Review: "Xem xét",
  Approve: "Phê duyệt",
  Sign: "Ký tài liệu",
  Acknowledge: "Xác nhận đã đọc",
};

function formatDate(value?: string | null) {
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

function getDaysPending(dateString?: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Hôm nay";
  return `Đang chờ ${diffDays} ngày`;
}

export function ApprovalsScreen({ onOpenDetail }: ApprovalsProps) {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] =
    useState<PendingWorkflowTaskDTO | null>(null);
  const [action, setAction] = useState<"Approved" | "Rejected" | null>(null);
  const [comment, setComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const tasksQuery = useQuery({
    queryKey: queryKeys.documents.pendingTasks({ page: 1, pageSize: 50 }),
    queryFn: () =>
      documentApi.getMyPendingTasks({
        page: 1,
        pageSize: 50,
      }),
    staleTime: 15_000,
  });

  const tasks = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data?.items]);
  const isLoading = tasksQuery.isLoading || tasksQuery.isFetching;
  const error = tasksQuery.error instanceof Error ? tasksQuery.error.message : null;

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort(
        (a, b) =>
          new Date(a.createdDate ?? 0).getTime() -
          new Date(b.createdDate ?? 0).getTime(),
      ),
    [tasks],
  );

  const openActionModal = (
    task: PendingWorkflowTaskDTO,
    nextAction: "Approved" | "Rejected",
  ) => {
    setSelectedTask(task);
    setAction(nextAction);
    setComment("");
  };

  const closeActionModal = () => {
    setSelectedTask(null);
    setAction(null);
    setComment("");
  };

  const handleProcess = async () => {
    if (!selectedTask || !action) return;

    setIsProcessing(true);
    try {
      await documentApi.processWorkflowStep(selectedTask.id, {
        status: action,
        comment: comment.trim() || null,
      });
      toast.success(action === "Approved" ? "Đã phê duyệt." : "Đã từ chối.");
      closeActionModal();
      await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể xử lý yêu cầu.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Công việc
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Cần tôi xử lý
          </h1>
        </div>
        <button
          type="button"
          onClick={() => tasksQuery.refetch()}
          disabled={isLoading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <section className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Đang tải công việc...
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              Không có tài liệu chờ xử lý
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Khi bạn được gán vào quy trình phê duyệt, tài liệu sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedTasks.map((task) => (
              <article
                key={task.id}
                className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <Clock className="h-3.5 w-3.5" />
                      {stepTypeLabels[task.stepType]}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Bước {task.stepOrder}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDetail(task.documentId)}
                    className="mt-2 line-clamp-1 text-left text-base font-semibold text-foreground hover:text-primary"
                  >
                    {task.documentTitle}
                  </button>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {task.organizationName} · tạo lúc {formatDate(task.createdDate)} · {getDaysPending(task.createdDate)}
                  </p>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                      Xem thêm thông tin
                    </summary>
                    <dl className="mt-2 grid gap-3 rounded-lg bg-muted/50 p-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Tài liệu</dt>
                        <dd className="mt-1 truncate font-medium text-foreground">
                          {task.documentTitle}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Bước xử lý</dt>
                        <dd className="mt-1 font-medium text-foreground">
                          Bước {task.stepOrder}
                        </dd>
                      </div>
                    </dl>
                  </details>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(task.documentId)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
                  >
                    <Eye className="h-4 w-4" />
                    Chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={() => openActionModal(task, "Rejected")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => openActionModal(task, "Approved")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Duyệt
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <AppModal
        open={Boolean(selectedTask && action)}
        onOpenChange={(open) => {
          if (!open && !isProcessing) closeActionModal();
        }}
        className="max-w-lg"
        title={action === "Approved" ? "Duyệt tài liệu" : "Từ chối tài liệu"}
        description={selectedTask?.documentTitle}
        footer={
          <>
            <button
              type="button"
              onClick={closeActionModal}
              disabled={isProcessing}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                action === "Approved"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Xác nhận
            </button>
          </>
        }
      >
        {selectedTask && action && (
          <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Ghi chú</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  placeholder={
                    action === "Approved"
                      ? "Thêm ghi chú khi duyệt..."
                      : "Nhập lý do từ chối..."
                  }
                  className="mt-1 w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
          </div>
        )}
      </AppModal>
    </div>
  );
}
