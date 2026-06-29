import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import {
  documentApi,
  type DocumentDTO,
  type PendingWorkflowTaskDTO,
  type WorkflowStepType,
} from "@/api/documentApi";
import { queryKeys } from "@/api/queryKeys";
import { PaginationFooter } from "@/shared/components/PaginationFooter";
import { useOrganization } from "@/context/OrganizationContext";
import type { Document } from "@/pages/Index";

interface ApprovalsProps {
  documents?: Document[];
  onOpenDetail: (docId: string) => void;
}

const TASK_PAGE_SIZE = 10;
const TASK_FETCH_PAGE_SIZE = 200;
const actionableDocumentStatuses = new Set(["InProgress", "WaitingSignature"]);

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
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.id;
  const [page, setPage] = useState(1);

  const tasksQuery = useQuery({
    queryKey: queryKeys.documents.pendingTasks({
      organizationId,
      page: 1,
      pageSize: TASK_FETCH_PAGE_SIZE,
    }),
    queryFn: () =>
      documentApi.getMyPendingTasks({
        page: 1,
        pageSize: TASK_FETCH_PAGE_SIZE,
      }),
    enabled: Boolean(organizationId),
    staleTime: 15_000,
  });

  const organizationDocumentsQuery = useQuery({
    queryKey: queryKeys.documents.list(organizationId, {
      page: 1,
      pageSize: 200,
    }),
    queryFn: () =>
      documentApi.getOrganizationDocuments(organizationId ?? "", {
        page: 1,
        pageSize: 200,
      }),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
  });

  const tasks = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data?.items]);
  const organizationDocuments = useMemo<DocumentDTO[]>(
    () => organizationDocumentsQuery.data?.items ?? [],
    [organizationDocumentsQuery.data?.items],
  );
  const organizationDocumentIds = useMemo(
    () => new Set(organizationDocuments.map((document) => document.id)),
    [organizationDocuments],
  );
  const organizationDocumentsById = useMemo(
    () =>
      new Map(
        organizationDocuments.map((document) => [document.id, document]),
      ),
    [organizationDocuments],
  );
  const scopedTasks = useMemo(
    () => {
      const newestTaskByDocument = new Map<string, PendingWorkflowTaskDTO>();

      tasks
        .filter((task) => {
          const document = organizationDocumentsById.get(task.documentId);
          const belongsToActiveOrganization =
            organizationDocumentIds.has(task.documentId) ||
            task.organizationName === activeOrganization?.name;

          if (!belongsToActiveOrganization) return false;
          if (!document) return true;

          return actionableDocumentStatuses.has(document.status);
        })
        .forEach((task) => {
          const currentTask = newestTaskByDocument.get(task.documentId);
          const taskCreatedAt = new Date(task.createdDate ?? 0).getTime();
          const currentCreatedAt = currentTask
            ? new Date(currentTask.createdDate ?? 0).getTime()
            : -1;

          if (!currentTask || taskCreatedAt >= currentCreatedAt) {
            newestTaskByDocument.set(task.documentId, task);
          }
        });

      return Array.from(newestTaskByDocument.values());
    },
    [
      activeOrganization?.name,
      organizationDocumentIds,
      organizationDocumentsById,
      tasks,
    ],
  );
  const isLoading =
    tasksQuery.isLoading ||
    tasksQuery.isFetching ||
    organizationDocumentsQuery.isLoading ||
    organizationDocumentsQuery.isFetching;
  const error = tasksQuery.error instanceof Error ? tasksQuery.error.message : null;

  const sortedTasks = useMemo(
    () =>
      [...scopedTasks].sort(
        (a, b) =>
          new Date(a.createdDate ?? 0).getTime() -
          new Date(b.createdDate ?? 0).getTime(),
      ),
    [scopedTasks],
  );
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / TASK_PAGE_SIZE));
  const paginatedTasks = useMemo(
    () =>
      sortedTasks.slice(
        (page - 1) * TASK_PAGE_SIZE,
        page * TASK_PAGE_SIZE,
      ),
    [page, sortedTasks],
  );

  useEffect(() => {
    setPage(1);
  }, [organizationId]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
            {paginatedTasks.map((task) => (
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
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Eye className="h-4 w-4" />
                    Xem tài liệu
                  </button>
                </div>
              </article>
            ))}
            <PaginationFooter
              page={page}
              pageSize={TASK_PAGE_SIZE}
              totalItems={sortedTasks.length}
              totalPages={totalPages}
              itemLabel="công việc"
              disabled={isLoading}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>

    </div>
  );
}
