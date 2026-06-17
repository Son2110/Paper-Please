import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Loader2,
  RefreshCcw,
  Search,
  Trash2,
  UploadCloud,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cdnApi } from "@/api/cdnApi";
import {
  documentApi,
  type DocumentAccessLevel,
  type DocumentDTO,
  type DocumentStatus,
  type WorkflowStepType,
} from "@/api/documentApi";
import {
  ORGANIZATION_ROLES,
  organizationApi,
  type OrganizationMemberDTO,
  type OrganizationRole,
} from "@/api/organizationApi";
import { queryKeys } from "@/api/queryKeys";
import { AppModal } from "@/shared/components/AppModal";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { cn } from "@/lib/utils";

interface DocumentHubProps {
  onOpenDetail: (docId: string) => void;
  mode?: "repository" | "submissions";
}

interface CreateFormState {
  title: string;
  description: string;
  dueDate: string;
  changeSummary: string;
}

interface BulkUploadFormState {
  description: string;
  dueDate: string;
  changeSummary: string;
}

interface WorkflowAssigneeRow {
  id: string;
  userId: string;
  stepType: WorkflowStepType;
  accessLevel: Exclude<DocumentAccessLevel, "Owner">;
}

const emptyCreateForm: CreateFormState = {
  title: "",
  description: "",
  dueDate: "",
  changeSummary: "",
};

const emptyBulkUploadForm: BulkUploadFormState = {
  description: "",
  dueDate: "",
  changeSummary: "",
};

const statusLabels: Record<DocumentStatus, string> = {
  Draft: "Bản nháp",
  InProgress: "Đang xử lý",
  WaitingSignature: "Chờ ký",
  Completed: "Hoàn tất",
  Rejected: "Từ chối",
  Archived: "Lưu trữ",
};

const statusClasses: Record<DocumentStatus, string> = {
  Draft: "border-neutral-300 bg-neutral-50 text-neutral-700",
  InProgress: "border-blue-200 bg-blue-50 text-blue-700",
  WaitingSignature: "border-amber-200 bg-amber-50 text-amber-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rejected: "border-red-200 bg-red-50 text-red-700",
  Archived: "border-slate-200 bg-slate-50 text-slate-600",
};

const submissionStatusFilters: DocumentStatus[] = [
  "Draft",
  "InProgress",
  "Completed",
  "Rejected",
];

const workflowTypeLabels: Record<WorkflowStepType, string> = {
  Review: "Xem xét",
  Approve: "Phê duyệt",
  Sign: "Ký tài liệu",
  Acknowledge: "Xác nhận đã đọc",
};

const workflowAccessLabels: Record<Exclude<DocumentAccessLevel, "Owner">, string> = {
  Viewer: "Chỉ xem",
  Editor: "Có thể sửa",
};

function createWorkflowRow(): WorkflowAssigneeRow {
  return {
    id: crypto.randomUUID(),
    userId: "",
    stepType: "Approve",
    accessLevel: "Viewer",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa đặt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa đặt";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getMemberUserId(member: OrganizationMemberDTO) {
  return member.user?.id ?? "";
}

function getMemberLabel(member: OrganizationMemberDTO) {
  return member.user?.displayName || member.user?.email || member.user?.id || "Thành viên";
}

function normalizeRole(value: OrganizationMemberDTO["role"]): OrganizationRole {
  if (typeof value === "string") return value as OrganizationRole;
  return ORGANIZATION_ROLES[value - 1] ?? "Member";
}

function getFileTitle(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

function getTodayInputDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isPastInputDate(value?: string | null) {
  return Boolean(value && value < getTodayInputDate());
}

export function DocumentHubScreen({
  onOpenDetail,
  mode = "repository",
}: DocumentHubProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "">("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [bulkUploadForm, setBulkUploadForm] =
    useState<BulkUploadFormState>(emptyBulkUploadForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [workflowRows, setWorkflowRows] = useState<WorkflowAssigneeRow[]>([
    createWorkflowRow(),
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentDTO | null>(null);

  const organizationId = activeOrganization?.id;
  const isRepository = mode === "repository";
  const isSubmissions = mode === "submissions";

  const documentFilters = useMemo(
    (): {
      searchQuery: string;
      status: DocumentStatus | "";
      page: number;
      pageSize: number;
    } => ({
      searchQuery: searchQuery.trim(),
      status: isRepository ? ("Completed" as DocumentStatus) : statusFilter,
      page: 1,
      pageSize: 50,
    }),
    [isRepository, searchQuery, statusFilter],
  );

  const documentsQuery = useQuery({
    queryKey: isRepository
      ? queryKeys.documents.list(organizationId, documentFilters)
      : ["documents", "mine", organizationId ?? "none", documentFilters],
    queryFn: () =>
      isRepository
        ? documentApi.getOrganizationDocuments(organizationId ?? "", {
            searchQuery: documentFilters.searchQuery,
            status: documentFilters.status,
            page: documentFilters.page,
            pageSize: documentFilters.pageSize,
          })
        : documentApi.getMyDocuments({
            searchQuery: documentFilters.searchQuery,
            status: documentFilters.status,
            page: documentFilters.page,
            pageSize: documentFilters.pageSize,
          }),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.organizations.members(organizationId, {
      page: 1,
      pageSize: 100,
    }),
    queryFn: () =>
      organizationApi.getMembers(organizationId ?? "", {
        page: 1,
        pageSize: 100,
      }),
    enabled: Boolean(organizationId),
    staleTime: 2 * 60_000,
  });

  const documents = useMemo(() => {
    const items = documentsQuery.data?.items ?? [];
    if (isRepository) return items;
    return items.filter((document) => document.organizationId === organizationId);
  }, [documentsQuery.data?.items, isRepository, organizationId]);
  const organizationMembers = useMemo(
    () => membersQuery.data?.items ?? [],
    [membersQuery.data?.items],
  );
  const currentMembership = useMemo(
    () =>
      organizationMembers.find((member) => getMemberUserId(member) === user?.id) ??
      null,
    [organizationMembers, user?.id],
  );
  const canBulkUpload =
    isRepository &&
    (activeOrganization?.owner?.id === user?.id ||
      (currentMembership
        ? ["Owner", "Administrator"].includes(normalizeRole(currentMembership.role))
        : false));
  const isLoading = documentsQuery.isLoading || documentsQuery.isFetching;
  const error = documentsQuery.error instanceof Error ? documentsQuery.error.message : null;

  const loadDocuments = () => {
    documentsQuery.refetch();
  };

  const filteredDocuments = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return documents;
    return documents.filter((document) =>
      [document.title, document.description, document.ownerName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword)),
    );
  }, [documents, searchQuery]);

  const stats = useMemo(
    () => ({
      total: documents.length,
      processing: documents.filter((document) =>
        ["InProgress", "WaitingSignature"].includes(document.status),
      ).length,
      completed: documents.filter((document) => document.status === "Completed").length,
      rejected: documents.filter((document) => document.status === "Rejected").length,
      withDeadline: documents.filter((document) => Boolean(document.dueDate)).length,
      ownedByMe: documents.filter((document) => document.ownerId === user?.id).length,
      visible: filteredDocuments.length,
    }),
    [documents, filteredDocuments.length, user?.id],
  );

  const selectedWorkflowSteps = workflowRows
    .filter((row) => row.userId)
    .map((row) => ({
      assignedToId: row.userId,
      stepType: row.stepType,
    }));

  const resetCreateModal = () => {
    setCreateForm(emptyCreateForm);
    setSelectedFile(null);
    setWorkflowRows([createWorkflowRow()]);
    setShowCreateModal(false);
  };

  const resetBulkUploadModal = () => {
    setBulkUploadForm(emptyBulkUploadForm);
    setBulkFiles([]);
    setShowBulkUploadModal(false);
  };

  const handleBulkUpload = async () => {
    if (!organizationId) {
      toast.error("Bạn cần chọn tổ chức trước khi tải tài liệu.");
      return;
    }
    if (!canBulkUpload) {
      toast.error("Chỉ chủ sở hữu hoặc quản trị viên tổ chức mới được tải nhiều tài liệu.");
      return;
    }
    if (bulkFiles.length === 0) {
      toast.error("Vui lòng chọn ít nhất một file.");
      return;
    }

    if (isPastInputDate(bulkUploadForm.dueDate)) {
      toast.error("Hạn xử lý không được là ngày trong quá khứ.");
      return;
    }

    setIsBulkUploading(true);
    try {
      const uploadedFiles = await cdnApi.uploadMultiple(
        bulkFiles,
        bulkUploadForm.description.trim() || undefined,
      );

      await documentApi.bulkImport({
        organizationId,
        documents: uploadedFiles.map((uploaded, index) => {
          const sourceFile = bulkFiles[index];
          return {
            title: getFileTitle(uploaded.originalName || sourceFile?.name || "Tài liệu"),
            description: bulkUploadForm.description.trim() || null,
            dueDate: bulkUploadForm.dueDate
              ? new Date(bulkUploadForm.dueDate).toISOString()
              : null,
            version: {
              fileName: uploaded.originalName || sourceFile?.name || "document",
              fileUrl: uploaded.apiUrl || uploaded.APIUrl || uploaded.url,
              mimeType:
                uploaded.mimeType ||
                sourceFile?.type ||
                "application/octet-stream",
              fileSize: uploaded.sizeBytes || sourceFile?.size || 0,
              changeSummary:
                bulkUploadForm.changeSummary.trim() || "Tải lên hàng loạt",
            },
          };
        }),
      });

      toast.success(`Đã tải ${bulkFiles.length} tài liệu. Tài liệu mới nằm ở bản nháp.`);
      resetBulkUploadModal();
      await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể tải nhiều tài liệu.",
      );
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!organizationId) {
      toast.error("Bạn cần chọn tổ chức trước khi tạo tài liệu.");
      return;
    }
    if (!createForm.title.trim()) {
      toast.error("Vui lòng nhập tên tài liệu.");
      return;
    }
    if (!selectedFile) {
      toast.error("Vui lòng chọn file để tạo phiên bản đầu tiên.");
      return;
    }
    if (selectedWorkflowSteps.length === 0) {
      toast.error("Vui lòng chọn ít nhất một người phê duyệt.");
      return;
    }
    if (selectedWorkflowSteps.some((step) => step.assignedToId === user?.id)) {
      toast.error("Bạn không thể tự phê duyệt tài liệu của mình.");
      return;
    }

    if (isPastInputDate(createForm.dueDate)) {
      toast.error("Hạn xử lý không được là ngày trong quá khứ.");
      return;
    }

    setIsCreating(true);
    let createdDocumentId: string | null = null;
    try {
      const uploaded = await cdnApi.uploadFile(
        selectedFile,
        createForm.description.trim() || undefined,
      );

      const document = await documentApi.createDocument({
        organizationId,
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        dueDate: createForm.dueDate ? new Date(createForm.dueDate).toISOString() : null,
      });
      createdDocumentId = document.id;

      await documentApi.uploadVersion(document.id, {
        fileName: uploaded.originalName || selectedFile.name,
        fileUrl: uploaded.apiUrl || uploaded.APIUrl || uploaded.url,
        mimeType: uploaded.mimeType || selectedFile.type || "application/octet-stream",
        fileSize: uploaded.sizeBytes || selectedFile.size,
        changeSummary: createForm.changeSummary.trim() || "Phiên bản đầu tiên",
      });

      const accessByAssignee = new Map<string, Exclude<DocumentAccessLevel, "Owner">>();
      workflowRows.forEach((row) => {
        if (!row.userId || row.userId === user?.id) return;
        const currentAccess = accessByAssignee.get(row.userId);
        if (currentAccess === "Editor") return;
        accessByAssignee.set(row.userId, row.accessLevel);
      });

      for (const [assigneeId, accessLevel] of accessByAssignee) {
        await documentApi.addParticipant(document.id, {
          userId: assigneeId,
          accessLevel,
        });
      }

      await documentApi.createWorkflow(document.id, {
        steps: selectedWorkflowSteps,
      });

      toast.success("Đã tạo tài liệu và quy trình phê duyệt.");
      resetCreateModal();
      await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    } catch (err) {
      if (createdDocumentId) {
        try {
          await documentApi.deleteDocument(createdDocumentId);
          await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
          toast.error(
            err instanceof Error
              ? `Không thể nộp tài liệu: ${err.message}. Bản nháp vừa tạo đã được hủy.`
              : "Không thể nộp tài liệu. Bản nháp vừa tạo đã được hủy.",
          );
        } catch {
          toast.error(
            err instanceof Error
              ? `Không thể nộp tài liệu: ${err.message}. Tài liệu đang được giữ ở bản nháp để bạn xử lý lại.`
              : "Không thể nộp tài liệu. Tài liệu đang được giữ ở bản nháp để bạn xử lý lại.",
          );
        }
        return;
      }

      toast.error(err instanceof Error ? err.message : "Không thể tạo tài liệu.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const documentId = deleteTarget.id;
    setDeletingId(documentId);
    try {
      await documentApi.deleteDocument(documentId);
      setDeleteTarget(null);
      toast.success("Đã xóa tài liệu.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa tài liệu.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {activeOrganization?.name ?? "Chưa chọn tổ chức"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {isRepository ? "Kho tài liệu" : "Tài liệu đã nộp"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {isRepository
              ? "Lưu trữ các tài liệu đã hoàn tất quy trình xử lý trong tổ chức."
              : "Theo dõi các tài liệu bạn đã nộp hoặc được gán tham gia xử lý."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDocuments}
            disabled={isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Tải lại
          </button>
          {canBulkUpload && (
            <button
              type="button"
              onClick={() => setShowBulkUploadModal(true)}
              disabled={!organizationId}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UploadCloud className="h-4 w-4" />
              Tải nhiều file
            </button>
          )}
          {isSubmissions && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              disabled={!organizationId}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FilePlus2 className="h-4 w-4" />
              Nộp tài liệu
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isRepository ? (
          <>
            <StatTile label="Tài liệu hoàn tất" value={stats.total} />
            <StatTile label="Có hạn xử lý" value={stats.withDeadline} />
            <StatTile label="Tôi đã nộp" value={stats.ownedByMe} />
            <StatTile label="Đang hiển thị" value={stats.visible} />
          </>
        ) : (
          <>
            <StatTile label="Tổng tài liệu" value={stats.total} />
            <StatTile label="Đang xử lý" value={stats.processing} />
            <StatTile label="Hoàn tất" value={stats.completed} />
            <StatTile label="Từ chối" value={stats.rejected} />
          </>
        )}
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") loadDocuments();
              }}
              placeholder="Tìm theo tên, mô tả hoặc người tạo..."
              className="h-10 w-full rounded-lg border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {isSubmissions && (
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as DocumentStatus | "")
              }
              className="h-10 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 md:w-52"
            >
              <option value="">Tất cả trạng thái</option>
              {submissionStatusFilters.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="m-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Không tải được tài liệu</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <TableHead>Tài liệu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Người tạo</TableHead>
                <TableHead>Hạn xử lý</TableHead>
                <TableHead align="right">Thao tác</TableHead>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                    Đang tải tài liệu...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredDocuments.map((document) => (
                  <tr
                    key={document.id}
                    className="border-b last:border-b-0 transition-colors hover:bg-muted/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onOpenDetail(document.id)}
                            className="line-clamp-1 text-left text-sm font-semibold text-foreground hover:text-primary"
                          >
                            {document.title}
                          </button>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {document.description || "Chưa có mô tả"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          statusClasses[document.status],
                        )}
                      >
                        {statusLabels[document.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground">
                      <p className="font-medium">{document.ownerName || "Không rõ"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(document.createdDate)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(document.dueDate)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton label="Xem chi tiết" onClick={() => onOpenDetail(document.id)}>
                          <Eye className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Mở file trong chi tiết" onClick={() => onOpenDetail(document.id)}>
                          <Download className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label="Xóa tài liệu"
                          onClick={() => setDeleteTarget(document)}
                          disabled={deletingId === document.id}
                          danger
                        >
                          {deletingId === document.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredDocuments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="rounded-full bg-muted p-3 text-muted-foreground">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        {isRepository
                          ? "Chưa có tài liệu hoàn tất"
                          : "Chưa có tài liệu đã nộp"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isRepository
                          ? "Tài liệu sẽ xuất hiện ở đây sau khi quy trình phê duyệt hoàn tất."
                          : "Nộp tài liệu đầu tiên để bắt đầu quy trình xử lý trong tổ chức."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AppModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null);
        }}
        title="Xóa tài liệu"
        description="Tài liệu sau khi xóa sẽ không còn hiển thị trong danh sách."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(deletingId)}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={Boolean(deletingId)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
            >
              {deletingId && <Loader2 className="h-4 w-4 animate-spin" />}
              Xóa tài liệu
            </button>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            {deleteTarget?.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {deleteTarget?.description || "Tài liệu không có mô tả."}
          </p>
        </div>
      </AppModal>

      <AppModal
        open={showBulkUploadModal}
        onOpenChange={(open) => {
          if (!open && !isBulkUploading) resetBulkUploadModal();
        }}
        className="max-w-2xl"
        contentClassName="max-h-[70vh]"
        title="Tải nhiều file"
        description="Dành cho chủ sở hữu hoặc quản trị viên. Mỗi file sẽ được tạo thành một tài liệu bản nháp."
        footer={
          <>
            <button
              type="button"
              onClick={resetBulkUploadModal}
              disabled={isBulkUploading}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleBulkUpload}
              disabled={isBulkUploading || bulkFiles.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {isBulkUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Tải lên
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-background px-4 py-8 text-center transition hover:bg-muted">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <span className="mt-3 text-sm font-semibold text-foreground">
              {bulkFiles.length > 0
                ? `Đã chọn ${bulkFiles.length} file`
                : "Chọn nhiều file để tải lên"}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, hình ảnh hoặc file nghiệp vụ khác
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) =>
                setBulkFiles(Array.from(event.target.files ?? []))
              }
            />
          </label>

          {bulkFiles.length > 0 && (
            <div className="rounded-lg border">
              <div className="border-b px-4 py-3 text-sm font-semibold text-foreground">
                Danh sách file
              </div>
              <div className="max-h-52 divide-y overflow-y-auto">
                {bulkFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.type || "Không rõ định dạng"} · {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setBulkFiles((prev) =>
                          prev.filter((_, fileIndex) => fileIndex !== index),
                        )
                      }
                      disabled={isBulkUploading}
                      className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                      aria-label="Xóa file khỏi danh sách"
                      title="Xóa file khỏi danh sách"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-foreground">
                Hạn xử lý chung
              </span>
              <input
                type="date"
                min={getTodayInputDate()}
                value={bulkUploadForm.dueDate}
                onChange={(event) =>
                  setBulkUploadForm((prev) => ({
                    ...prev,
                    dueDate: event.target.value,
                  }))
                }
                className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-foreground">
                Ghi chú phiên bản
              </span>
              <input
                value={bulkUploadForm.changeSummary}
                onChange={(event) =>
                  setBulkUploadForm((prev) => ({
                    ...prev,
                    changeSummary: event.target.value,
                  }))
                }
                placeholder="Tải lên hàng loạt"
                className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-medium text-foreground">Mô tả chung</span>
              <textarea
                value={bulkUploadForm.description}
                onChange={(event) =>
                  setBulkUploadForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Mô tả dùng chung cho các tài liệu được tạo từ danh sách file."
                className="mt-2 w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open && !isCreating) resetCreateModal();
        }}
        className="max-w-2xl"
        contentClassName="max-h-[70vh]"
        title="Nộp tài liệu"
        description="Upload file, lưu phiên bản đầu tiên và tạo quy trình xử lý."
        footer={
          <>
            <button
              type="button"
              onClick={resetCreateModal}
              disabled={isCreating}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleCreateDocument}
              disabled={isCreating}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Nộp tài liệu
            </button>
          </>
        }
      >
        <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="text-sm font-medium text-foreground">
                    Tên tài liệu
                  </span>
                  <input
                    value={createForm.title}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Ví dụ: Hợp đồng dịch vụ tháng 6"
                    className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label>
                  <span className="text-sm font-medium text-foreground">
                    Hạn xử lý
                  </span>
                  <input
                    type="date"
                    min={getTodayInputDate()}
                    value={createForm.dueDate}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))
                    }
                    className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label>
                  <span className="text-sm font-medium text-foreground">
                    Ghi chú phiên bản
                  </span>
                  <input
                    value={createForm.changeSummary}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        changeSummary: event.target.value,
                      }))
                    }
                    placeholder="Phiên bản đầu tiên"
                    className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-sm font-medium text-foreground">
                    Mô tả
                  </span>
                  <textarea
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Mô tả ngắn để thành viên nhận biết tài liệu."
                    className="mt-2 w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              <div>
                <span className="text-sm font-medium text-foreground">
                  File tài liệu
                </span>
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-background px-4 py-8 text-center transition hover:bg-muted">
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <span className="mt-3 text-sm font-semibold text-foreground">
                    {selectedFile ? selectedFile.name : "Chọn file để upload"}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {selectedFile
                      ? `${selectedFile.type || "Không rõ định dạng"} · ${formatFileSize(selectedFile.size)}`
                      : "PDF, DOCX, hình ảnh hoặc file nghiệp vụ khác"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>

              <details open className="rounded-lg border bg-background p-4">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">
                  Quy trình xử lý
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Chọn người phê duyệt và quyền truy cập tài liệu của từng người.
                </p>

                <div className="mt-4 space-y-3">
                  {workflowRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="grid gap-3 rounded-lg bg-muted/30 p-3 md:grid-cols-[80px_1fr_150px_auto_auto] md:items-center"
                    >
                      <div className="text-sm font-semibold text-muted-foreground">
                        Bước {index + 1}
                      </div>
                      <select
                        value={row.userId}
                        onChange={(event) =>
                          setWorkflowRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, userId: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className="h-10 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Chọn người xử lý</option>
                        {organizationMembers.map((member) => {
                          const memberUserId = getMemberUserId(member);
                          if (!memberUserId) return null;
                          if (memberUserId === user?.id) return null;
                          return (
                            <option
                              key={member.memberId || member.id || memberUserId}
                              value={memberUserId}
                            >
                              {getMemberLabel(member)}
                            </option>
                          );
                        })}
                      </select>
                      <span className="inline-flex h-10 items-center rounded-lg border bg-background px-3 text-sm font-semibold text-muted-foreground">
                        {workflowTypeLabels.Approve}
                      </span>
                      <select
                        value={row.accessLevel}
                        onChange={(event) =>
                          setWorkflowRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? {
                                    ...item,
                                    accessLevel: event.target
                                      .value as Exclude<DocumentAccessLevel, "Owner">,
                                  }
                                : item,
                            ),
                          )
                        }
                        className="h-10 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        title="Quyền truy cập tài liệu"
                      >
                        <option value="Viewer">{workflowAccessLabels.Viewer}</option>
                        <option value="Editor">{workflowAccessLabels.Editor}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setWorkflowRows((prev) =>
                            prev.length === 1
                              ? [createWorkflowRow()]
                              : prev.filter((item) => item.id !== row.id),
                          )
                        }
                        className="inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setWorkflowRows((prev) => [...prev, createWorkflowRow()])}
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
                >
                  <UserPlus className="h-4 w-4" />
                  Thêm bước
                </button>
              </details>
        </div>
      </AppModal>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-5 py-3 text-xs font-semibold text-muted-foreground",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50",
        danger && "hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}
