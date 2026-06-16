import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Inbox,
  Loader2,
  RefreshCw,
  SendHorizonal,
} from "lucide-react";
import {
  documentApi,
  type DocumentDTO,
  type DocumentStatus,
  type PendingWorkflowTaskDTO,
} from "@/api/documentApi";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import type { Document } from "@/pages/Index";

interface DashboardScreenProps {
  documents?: Document[];
  onNavigateWithFilter?: (filter: string) => void;
  onNavigateWithCategory?: (category: string) => void;
  onOpenDetail?: (docId: string) => void;
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa đặt hạn";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa đặt hạn";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function dueLabel(value?: string | null) {
  const days = getDaysUntil(value);
  if (days == null) return "Chưa đặt hạn";
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return "Hôm nay";
  return `Còn ${days} ngày`;
}

function statusLabel(status: DocumentStatus) {
  if (status === "Draft") return "Bản nháp";
  if (status === "InProgress") return "Đang xử lý";
  if (status === "WaitingSignature") return "Chờ ký";
  if (status === "Completed") return "Hoàn tất";
  if (status === "Rejected") return "Từ chối";
  return "Lưu trữ";
}

export function DashboardScreen({
  onNavigateWithFilter,
  onOpenDetail,
}: DashboardScreenProps) {
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.id;

  const documentsQuery = useQuery({
    queryKey: queryKeys.documents.list(organizationId, {
      page: 1,
      pageSize: 50,
    }),
    queryFn: () =>
      documentApi.getOrganizationDocuments(organizationId ?? "", {
        page: 1,
        pageSize: 50,
      }),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
  });

  const pendingTasksQuery = useQuery({
    queryKey: queryKeys.documents.pendingTasks({ page: 1, pageSize: 50 }),
    queryFn: () =>
      documentApi.getMyPendingTasks({
        page: 1,
        pageSize: 50,
      }),
    staleTime: 15_000,
  });

  const documents = useMemo(
    () => documentsQuery.data?.items ?? [],
    [documentsQuery.data?.items],
  );
  const pendingTasks = useMemo(
    () => pendingTasksQuery.data?.items ?? [],
    [pendingTasksQuery.data?.items],
  );

  const myDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          document.ownerId === user?.id ||
          document.ownerName === user?.displayName ||
          document.ownerName === user?.email,
      ),
    [documents, user?.displayName, user?.email, user?.id],
  );

  const pendingTaskDocumentIds = useMemo(
    () => new Set(pendingTasks.map((task) => task.documentId)),
    [pendingTasks],
  );

  const relevantDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          document.ownerId === user?.id ||
          document.ownerName === user?.displayName ||
          document.ownerName === user?.email ||
          pendingTaskDocumentIds.has(document.id),
      ),
    [
      documents,
      pendingTaskDocumentIds,
      user?.displayName,
      user?.email,
      user?.id,
    ],
  );

  const dueSoonDocuments = useMemo(
    () =>
      [...relevantDocuments]
        .filter((document) => document.status !== "Rejected")
        .filter((document) => {
          const days = getDaysUntil(document.dueDate);
          return days == null || days <= 14;
        })
        .sort((a, b) => {
          const left = getDaysUntil(a.dueDate) ?? Number.MAX_SAFE_INTEGER;
          const right = getDaysUntil(b.dueDate) ?? Number.MAX_SAFE_INTEGER;
          return left - right;
        })
        .slice(0, 5),
    [relevantDocuments],
  );

  const isInitialLoading =
    (documentsQuery.isLoading && documents.length === 0) ||
    (pendingTasksQuery.isLoading && pendingTasks.length === 0);

  const stats = [
    {
      label: "Cần tôi xử lý",
      value: pendingTasks.length,
      icon: Clock,
      filter: "cho-duyet",
    },
    {
      label: "Tôi đã nộp",
      value: myDocuments.length,
      icon: SendHorizonal,
      filter: "all",
    },
    {
      label: "Sắp đến hạn",
      value: dueSoonDocuments.length,
      icon: AlertTriangle,
      filter: "sap-den-han",
    },
    {
      label: "Hoàn tất",
      value: relevantDocuments.filter((document) => document.status === "Completed")
        .length,
      icon: CheckCircle,
      filter: "da-duyet",
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tổng quan
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Công việc hôm nay
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Theo dõi tài liệu cần xử lý, tài liệu đã nộp và các hạn quan trọng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            documentsQuery.refetch();
            pendingTasksQuery.refetch();
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              documentsQuery.isFetching || pendingTasksQuery.isFetching
                ? "animate-spin"
                : ""
            }`}
          />
          Làm mới
        </button>
      </div>

      {isInitialLoading ? (
        <div className="flex min-h-56 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Đang tải tổng quan...
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onNavigateWithFilter?.(item.filter)}
                  className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-foreground">
                        {item.value}
                      </p>
                    </div>
                    <Icon className="h-9 w-9 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <section className="rounded-lg border bg-card">
              <div className="border-b px-5 py-4">
                <h2 className="text-base font-semibold text-foreground">
                  Cần tôi xử lý
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tài liệu đang chờ bạn duyệt, xem xét hoặc ký.
                </p>
              </div>
              <div className="divide-y">
                {pendingTasks.length === 0 && (
                  <EmptyPanel
                    icon={Inbox}
                    title="Không có việc cần xử lý"
                    description="Khi có tài liệu chờ bạn xử lý, danh sách sẽ hiện ở đây."
                  />
                )}
                {pendingTasks.slice(0, 5).map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onOpen={() => onOpenDetail?.(task.documentId)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-lg border bg-card">
              <div className="border-b px-5 py-4">
                <h2 className="text-base font-semibold text-foreground">
                  Gần đến hạn
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ưu tiên các tài liệu có hạn gần nhất trong tổ chức.
                </p>
              </div>
              <div className="divide-y">
                {dueSoonDocuments.length === 0 && (
                  <EmptyPanel
                    icon={FileText}
                    title="Chưa có tài liệu gần hạn"
                    description="Tài liệu gần đến hạn sẽ xuất hiện tại đây."
                  />
                )}
                {dueSoonDocuments.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    meta={`${dueLabel(document.dueDate)} · ${statusLabel(document.status)}`}
                    onOpen={() => onOpenDetail?.(document.id)}
                  />
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onOpen,
}: {
  task: PendingWorkflowTaskDTO;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {task.documentTitle}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {task.organizationName} · bước {task.stepOrder}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function DocumentRow({
  document,
  meta,
  onOpen,
}: {
  document: DocumentDTO;
  meta: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {document.title}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{meta}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Hạn: {formatDate(document.dueDate)}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Inbox;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-5 py-8 text-center">
      <Icon className="h-9 w-9 text-muted-foreground" />
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
