import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  FileText,
  History,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Send,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cdnApi } from "@/api/cdnApi";
import {
  documentApi,
  type DocumentAccessLevel,
  type DocumentCommentDTO,
  type DocumentDetailDTO,
  type DocumentParticipantDTO,
  type DocumentStatus,
  type DocumentVersionDTO,
  type WorkflowStepType,
} from "@/api/documentApi";
import {
  organizationApi,
  type OrganizationMemberDTO,
} from "@/api/organizationApi";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { cn } from "@/lib/utils";
import type { Document } from "@/pages/Index";
import { AppModal } from "@/shared/components/AppModal";

interface DocumentDetailProps {
  docId: string;
  document?: Document;
  onBack: () => void;
  showApprovalActions?: boolean;
  onApprove?: (id: string, signatureUrl?: string) => void;
  onReject?: (id: string, reason: string) => void;
}

type DetailTab = "overview" | "files" | "workflow" | "collaboration";

interface WorkflowRow {
  id: string;
  userId: string;
  stepType: WorkflowStepType;
}

const tabs: Array<{ id: DetailTab; label: string; icon: typeof FileText }> = [
  { id: "overview", label: "Tổng quan", icon: FileText },
  { id: "files", label: "Tệp", icon: Download },
  { id: "workflow", label: "Quy trình", icon: CheckCircle2 },
  { id: "collaboration", label: "Trao đổi", icon: MessageSquare },
];

const statusLabels: Record<DocumentStatus, string> = {
  Draft: "Bản nháp",
  InProgress: "Đang xử lý",
  WaitingSignature: "Chờ ký",
  Completed: "Hoàn tất",
  Rejected: "Từ chối",
  Archived: "Lưu trữ",
};

const accessLabels: Record<DocumentAccessLevel, string> = {
  Owner: "Chủ sở hữu",
  Editor: "Biên tập",
  Viewer: "Chỉ xem",
};

const workflowTypeLabels: Record<WorkflowStepType, string> = {
  Review: "Xem xét",
  Approve: "Phê duyệt",
  Sign: "Ký tài liệu",
  Acknowledge: "Xác nhận đã đọc",
};

const auditTypeLabels: Record<string, string> = {
  Created: "Tạo tài liệu",
  Submitted: "Nộp quy trình",
  Updated: "Cập nhật tài liệu",
  Deleted: "Xóa tài liệu",
  VersionCreated: "Thêm phiên bản",
  ParticipantAdded: "Thêm người tham gia",
  ParticipantUpdated: "Cập nhật quyền",
  ParticipantRemoved: "Gỡ người tham gia",
  WorkflowCreated: "Tạo quy trình",
  WorkflowCancelled: "Hủy quy trình",
  WorkflowCompleted: "Hoàn tất quy trình",
  WorkflowRejected: "Từ chối quy trình",
  CommentAdded: "Thêm bình luận",
  CommentUpdated: "Cập nhật bình luận",
  CommentDeleted: "Xóa bình luận",
};

function labelizeAuditType(value?: string | null) {
  if (!value) return "Hoạt động";
  return (
    auditTypeLabels[value] ||
    value
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .trim()
  );
}

function translateAuditDescription(value?: string | null) {
  if (!value) return "Không có mô tả";

  const versionMatch = value.match(/^Version\s+(\d+)\s+uploaded\.?$/i);
  if (versionMatch) return `Đã tải lên phiên bản ${versionMatch[1]}.`;

  const documentCreatedMatch = value.match(/^Document '(.+)' created\.?$/i);
  if (documentCreatedMatch) {
    return `Đã tạo tài liệu "${documentCreatedMatch[1]}".`;
  }

  const documentUpdatedMatch = value.match(/^Document '(.+)' updated\.?$/i);
  if (documentUpdatedMatch) {
    return `Đã cập nhật tài liệu "${documentUpdatedMatch[1]}".`;
  }

  const documentDeletedMatch = value.match(/^Document '(.+)' deleted\.?$/i);
  if (documentDeletedMatch) {
    return `Đã xóa tài liệu "${documentDeletedMatch[1]}".`;
  }

  const translations: Record<string, string> = {
    "Workflow created.": "Đã tạo quy trình phê duyệt.",
    "Workflow cancelled.": "Đã hủy quy trình phê duyệt.",
    "Workflow completed.": "Quy trình phê duyệt đã hoàn tất.",
    "Workflow rejected.": "Quy trình phê duyệt đã bị từ chối.",
    "Participant added.": "Đã thêm người tham gia.",
    "Participant updated.": "Đã cập nhật quyền người tham gia.",
    "Participant removed.": "Đã gỡ người tham gia.",
    "Comment added.": "Đã thêm bình luận.",
    "Comment updated.": "Đã cập nhật bình luận.",
    "Comment deleted.": "Đã xóa bình luận.",
  };

  return translations[value] || value;
}

function createWorkflowRow(): WorkflowRow {
  return {
    id: crypto.randomUUID(),
    userId: "",
    stepType: "Approve",
  };
}

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

function formatFileSize(size?: number | null) {
  const value = size ?? 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(fileName?: string | null) {
  const name = fileName ?? "";
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

function isImageVersion(version?: DocumentVersionDTO) {
  const extension = getExtension(version?.fileName);
  return (
    version?.mimeType?.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(extension)
  );
}

function isPdfVersion(version?: DocumentVersionDTO) {
  return (
    version?.mimeType === "application/pdf" ||
    getExtension(version?.fileName) === "pdf"
  );
}

function isTextVersion(version?: DocumentVersionDTO) {
  const extension = getExtension(version?.fileName);
  return (
    version?.mimeType?.startsWith("text/") ||
    ["txt", "csv", "json", "xml", "log", "md"].includes(extension)
  );
}

function isOfficeVersion(version?: DocumentVersionDTO) {
  return ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(
    getExtension(version?.fileName),
  );
}

function buildOfficeViewerUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

function getMemberUserId(member: OrganizationMemberDTO) {
  return member.user?.id ?? "";
}

function getMemberLabel(member: OrganizationMemberDTO) {
  return (
    member.user?.displayName ||
    member.user?.email ||
    member.user?.id ||
    "Thành viên"
  );
}

function isOrganizationOwnerRole(role?: OrganizationMemberDTO["role"] | null) {
  return String(role).toLowerCase() === "owner" || String(role) === "3";
}

export function DocumentDetailScreen({ docId, onBack }: DocumentDetailProps) {
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganization();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [newComment, setNewComment] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionSummary, setVersionSummary] = useState("");
  const [selectedPreviewVersionId, setSelectedPreviewVersionId] = useState<
    string | null
  >(null);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [participantUserId, setParticipantUserId] = useState("");
  const [participantAccess, setParticipantAccess] =
    useState<DocumentAccessLevel>("Viewer");
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [workflowRows, setWorkflowRows] = useState<WorkflowRow[]>([
    createWorkflowRow(),
  ]);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState<string | undefined>(undefined);
  const [removeParticipantTarget, setRemoveParticipantTarget] =
    useState<DocumentParticipantDTO | null>(null);
  const [showCancelWorkflowConfirm, setShowCancelWorkflowConfirm] =
    useState(false);
  const [deleteCommentTargetId, setDeleteCommentTargetId] = useState<
    string | null
  >(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  const detailQuery = useQuery({
    queryKey: queryKeys.documents.detail(docId),
    queryFn: () => documentApi.getDetailed(docId),
    enabled: Boolean(docId),
    staleTime: 15_000,
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.organizations.members(activeOrganization?.id, {
      page: 1,
      pageSize: 100,
    }),
    queryFn: () =>
      organizationApi.getMembers(activeOrganization?.id ?? "", {
        page: 1,
        pageSize: 100,
      }),
    enabled: Boolean(activeOrganization?.id),
    staleTime: 2 * 60_000,
  });

  const detail = detailQuery.data ?? null;
  const organizationMembers = useMemo(
    () => membersQuery.data?.items ?? [],
    [membersQuery.data?.items],
  );
  const isLoading = detailQuery.isLoading || detailQuery.isFetching;
  const error =
    detailQuery.error instanceof Error ? detailQuery.error.message : null;

  const document = detail?.document;
  const versions = useMemo(
    () => (Array.isArray(detail?.versions) ? detail.versions : []),
    [detail?.versions],
  );
  const participants = useMemo(
    () => (Array.isArray(detail?.participants) ? detail.participants : []),
    [detail?.participants],
  );
  const workflows = Array.isArray(detail?.workflows) ? detail.workflows : [];
  const currentWorkflow = workflows[0] ?? null;
  const comments = Array.isArray(detail?.comments) ? detail.comments : [];
  const audits = Array.isArray(detail?.audits) ? detail.audits : [];
  const currentVersion = useMemo(
    () =>
      versions.find((version) => version.isCurrent) ??
      [...versions].sort((a, b) => b.versionNumber - a.versionNumber)[0],
    [versions],
  );
  const previewVersion = useMemo(
    () =>
      versions.find((version) => version.id === selectedPreviewVersionId) ??
      currentVersion,
    [currentVersion, selectedPreviewVersionId, versions],
  );
  const canCreateWorkflow =
    !currentWorkflow ||
    currentWorkflow.status === "Rejected" ||
    currentWorkflow.status === "Cancelled";
  const isRejectedDocument =
    document?.status === "Rejected" || currentWorkflow?.status === "Rejected";
  const workflowSubmitLabel = isRejectedDocument
    ? "Nộp lại tài liệu"
    : "Tạo quy trình";
  const currentWorkflowSteps = Array.isArray(currentWorkflow?.steps)
    ? currentWorkflow.steps
    : [];
  const pendingStep = currentWorkflowSteps.find(
    (step) => step.status === "Pending",
  );
  const completedSteps = currentWorkflowSteps.filter(
    (step) => step.status !== "Pending",
  ).length;

  const availableMembers = useMemo(() => {
    const participantIds = new Set(participants.map((item) => item.userId));
    return organizationMembers.filter((member) => {
      const userId = getMemberUserId(member);
      return userId && !participantIds.has(userId);
    });
  }, [organizationMembers, participants]);
  const currentOrgMember = useMemo(
    () =>
      organizationMembers.find((member) => getMemberUserId(member) === user?.id),
    [organizationMembers, user?.id],
  );
  const currentParticipant = useMemo(
    () => participants.find((participant) => participant.userId === user?.id),
    [participants, user?.id],
  );
  const isDocumentCreator = Boolean(user?.id && document?.ownerId === user.id);
  const isOrganizationOwner = Boolean(
    user?.id &&
      (activeOrganization?.owner?.id === user.id ||
        isOrganizationOwnerRole(currentOrgMember?.role)),
  );
  const canManageDocumentAccess = isDocumentCreator || isOrganizationOwner;
  const canEditFiles =
    canManageDocumentAccess ||
    currentParticipant?.accessLevel === "Owner" ||
    currentParticipant?.accessLevel === "Editor";

  const refreshDetail = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.documents.detail(docId),
    });

  const handleOpenFile = (version?: DocumentVersionDTO) => {
    if (!version?.fileUrl) {
      toast.error("Phiên bản này chưa có đường dẫn file.");
      return;
    }
    window.open(version.fileUrl, "_blank", "noopener,noreferrer");
  };

  const handleUploadVersion = async () => {
    if (!canEditFiles) {
      toast.error("Bạn không có quyền cập nhật tệp của tài liệu này.");
      return;
    }

    if (!versionFile) {
      toast.error("Vui lòng chọn file phiên bản mới.");
      return;
    }

    setIsUploadingVersion(true);
    try {
      const uploaded = await cdnApi.uploadFile(versionFile, versionSummary);
      await documentApi.uploadVersion(docId, {
        fileName: uploaded.originalName || versionFile.name,
        fileUrl: uploaded.apiUrl || uploaded.APIUrl || uploaded.url,
        mimeType:
          uploaded.mimeType || versionFile.type || "application/octet-stream",
        fileSize: uploaded.sizeBytes || versionFile.size,
        changeSummary: versionSummary.trim() || "Cập nhật phiên bản mới",
      });
      toast.success("Đã upload phiên bản mới.");
      setVersionFile(null);
      setVersionSummary("");
      await refreshDetail();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể upload phiên bản.",
      );
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!participantUserId) {
      toast.error("Vui lòng chọn thành viên.");
      return;
    }

    setIsAddingParticipant(true);
    try {
      await documentApi.addParticipant(docId, {
        userId: participantUserId,
        accessLevel: participantAccess,
      });
      toast.success("Đã thêm người tham gia.");
      setParticipantUserId("");
      setParticipantAccess("Viewer");
      await refreshDetail();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể thêm người tham gia.",
      );
    } finally {
      setIsAddingParticipant(false);
    }
  };

  const handleUpdateParticipant = async (
    participant: DocumentParticipantDTO,
    accessLevel: DocumentAccessLevel,
  ) => {
    try {
      await documentApi.updateParticipant(docId, participant.userId, {
        accessLevel,
      });
      toast.success("Đã cập nhật quyền.");
      await refreshDetail();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật quyền.",
      );
    }
  };

  const handleRemoveParticipant = async (
    participant: DocumentParticipantDTO,
  ) => {
    if (participant.accessLevel === "Owner") return;
    setRemoveParticipantTarget(participant);
  };

  const confirmRemoveParticipant = async () => {
    if (!removeParticipantTarget) return;
    try {
      await documentApi.removeParticipant(docId, removeParticipantTarget.userId);
      toast.success("Đã gỡ người tham gia.");
      setRemoveParticipantTarget(null);
      await refreshDetail();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gỡ người tham gia.",
      );
    }
  };

  const handleSendComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    setIsSendingComment(true);
    const success = await handleAddComment(content);
    if (success) setNewComment("");
    setIsSendingComment(false);
  };

  const handleCreateWorkflow = async () => {
    const steps = workflowRows
      .filter((row) => row.userId)
      .map((row) => ({
        assignedToId: row.userId,
        stepType: row.stepType,
      }));

    if (steps.length === 0) {
      toast.error("Vui lòng chọn ít nhất một người xử lý.");
      return;
    }
    if (steps.some((step) => step.assignedToId === user?.id)) {
      toast.error("Bạn không thể tự phê duyệt tài liệu của mình.");
      return;
    }

    setIsCreatingWorkflow(true);
    try {
      const participantIds = new Set(participants.map((item) => item.userId));
      for (const step of steps) {
        if (!participantIds.has(step.assignedToId)) {
          await documentApi.addParticipant(docId, {
            userId: step.assignedToId,
            accessLevel: "Viewer",
          });
          participantIds.add(step.assignedToId);
        }
      }

      await documentApi.createWorkflow(docId, { steps });
      toast.success(
        isRejectedDocument ? "Đã nộp lại tài liệu." : "Đã tạo quy trình.",
      );
      setWorkflowRows([createWorkflowRow()]);
      await refreshDetail();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể tạo quy trình.",
      );
    } finally {
      setIsCreatingWorkflow(false);
    }
  };

  const handleCancelWorkflow = async () => {
    setShowCancelWorkflowConfirm(true);
  };

  const confirmCancelWorkflow = async () => {
    try {
      await documentApi.cancelWorkflow(docId);
      toast.success("Đã hủy quy trình.");
      setShowCancelWorkflowConfirm(false);
      await refreshDetail();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể hủy quy trình.",
      );
    }
  };

  // Generic comment handler
  const handleAddComment = async (
    content: string,
    parentCommentId?: string,
  ) => {
    if (!content.trim()) return false;
    try {
      await documentApi.addComment(docId, {
        content: content.trim(),
        parentCommentId: parentCommentId || null,
      });
      toast.success("Đã gửi bình luận.");
      await refreshDetail();
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi bình luận.",
      );
      return false;
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    if (!content.trim()) return;
    try {
      await documentApi.updateComment(commentId, { content: content.trim() });
      toast.success("Đã cập nhật bình luận.");
      await refreshDetail();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật bình luận.",
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeleteCommentTargetId(commentId);
  };

  const confirmDeleteComment = async () => {
    if (!deleteCommentTargetId) return;
    setIsDeletingComment(true);
    try {
      await documentApi.deleteComment(deleteCommentTargetId);
      toast.success("Đã xóa bình luận.");
      setDeleteCommentTargetId(null);
      await refreshDetail();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa bình luận.",
      );
    } finally {
      setIsDeletingComment(false);
    }
  };

  // Edit Document handlers
  const openEditModal = () => {
    if (document) {
      setEditTitle(document.title);
      setEditDescription(document.description || "");
      setEditDueDate(document.dueDate || undefined);
      setIsEditModalOpen(true);
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleUpdateDocument = async () => {
    if (!document) return;

    if (!editTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề.");
      return;
    }

    try {
      await documentApi.updateDocument(docId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        dueDate: editDueDate || undefined,
        status: document.status,
      });
      toast.success("Đã cập nhật tài liệu.");
      closeEditModal();
      await refreshDetail();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật tài liệu.",
      );
    }
  };

  // Edit Document Modal Component
  const EditDocumentModal = () => {
    if (!isEditModalOpen) return null;

    return (
      <AppModal
        open={isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) closeEditModal();
        }}
        title="Sửa tài liệu"
        description="Cập nhật thông tin cơ bản của tài liệu."
        className="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={closeEditModal}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleUpdateDocument}
              disabled={!editTitle.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              Lưu thay đổi
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Tiêu đề <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Mô tả
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Hạn xử lý
              </label>
              <input
                type="date"
                value={editDueDate?.split("T")[0] || ""}
                onChange={(e) => setEditDueDate(e.target.value || undefined)}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      </AppModal>
    );
  };

  return (
    <>
      {isEditModalOpen && <EditDocumentModal />}
      <div className="animate-fade-in space-y-5">
        <header className="rounded-lg border bg-card">
          <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={onBack}
                className="mt-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={document?.status} />
                </div>
                <h1 className="mt-3 line-clamp-2 text-2xl font-bold text-foreground">
                  {document?.title ?? "Đang tải tài liệu"}
                </h1>
                <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-muted-foreground">
                  {document?.description || "Chưa có mô tả"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={openEditModal}
                disabled={isLoading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
              >
                <Edit className="h-4 w-4" />
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={refreshDetail}
                disabled={isLoading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
              >
                <RefreshCcw
                  className={cn("h-4 w-4", isLoading && "animate-spin")}
                />
                Tải lại
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isRejectedDocument) {
                    setActiveTab("workflow");
                  } else {
                    handleOpenFile(currentVersion);
                  }
                }}
                disabled={!isRejectedDocument && !currentVersion?.fileUrl}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRejectedDocument ? (
                  <UploadCloud className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isRejectedDocument ? "Nộp lại tài liệu" : "Mở file"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-t bg-muted/20 p-4 sm:grid-cols-3">
            <MetaChip
              icon={Clock}
              label="Hạn xử lý"
              value={formatDate(document?.dueDate)}
            />
            <MetaChip
              icon={Users}
              label="Người phụ trách"
              value={document?.ownerName || document?.ownerId || "Chưa có"}
            />
            <MetaChip
              icon={FileText}
              label="Phiên bản"
              value={
                currentVersion ? `v${currentVersion.versionNumber}` : "Chưa có"
              }
            />
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading && !detail ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border bg-card text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Đang tải chi tiết tài liệu...
          </div>
        ) : (
          <section className="rounded-lg border bg-card">
            <nav className="flex gap-1 overflow-x-auto border-b p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {activeTab === "overview" && (
              <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-foreground">
                    Những gì cần biết
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoTile
                      label="Trạng thái tài liệu"
                      value={
                        document ? statusLabels[document.status] : "Chưa có"
                      }
                    />
                    <InfoTile
                      label="Số phiên bản"
                      value={String(versions.length)}
                    />
                    <InfoTile
                      label="Thành viên"
                      value={String(participants.length)}
                    />
                  </div>

                  <details className="rounded-lg border bg-background p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-foreground">
                      Xem mô tả đầy đủ
                    </summary>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {document?.description ||
                        "Chưa có mô tả cho tài liệu này."}
                    </p>
                  </details>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Bước tiếp theo
                  </p>
                  {isRejectedDocument ? (
                    <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                      <p>
                        Tài liệu bị từ chối. Upload bản sửa nếu cần, sau đó tạo
                        lại quy trình.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("workflow")}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        <UploadCloud className="h-4 w-4" />
                        Nộp lại tài liệu
                      </button>
                    </div>
                  ) : pendingStep ? (
                    <div className="mt-3 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Bước {pendingStep.stepOrder}:{" "}
                        {workflowTypeLabels[pendingStep.stepType]}
                      </p>
                      <p className="mt-1">
                        Đang chờ{" "}
                        {pendingStep.assignedToName ||
                          pendingStep.assignedToEmail ||
                          pendingStep.assignedToId}
                        .
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Chưa có việc cần xử lý ngay.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "files" && (
              <div className="space-y-5 p-5">
                <DocumentPreview version={previewVersion} />

                {canEditFiles && (
                <details className="rounded-lg border bg-background p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Upload phiên bản mới
                  </summary>
                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
                    <input
                      type="file"
                      onChange={(event) =>
                        setVersionFile(event.target.files?.[0] ?? null)
                      }
                      className="h-10 rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      value={versionSummary}
                      onChange={(event) =>
                        setVersionSummary(event.target.value)
                      }
                      placeholder="Ghi chú thay đổi"
                      className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={handleUploadVersion}
                      disabled={isUploadingVersion}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {isUploadingVersion ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                      Upload
                    </button>
                  </div>
                </details>
                )}

                <div className="divide-y rounded-lg border">
                  {versions.length === 0 && (
                    <EmptyState text="Chưa có phiên bản nào." />
                  )}
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewVersionId(version.id)}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-foreground">
                          v{version.versionNumber} · {version.fileName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(version.fileSize)} ·{" "}
                          {formatDate(version.createdDate)}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenFile(version)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
                      >
                        <Download className="h-4 w-4" />
                        Mở
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "workflow" && (
              <div className="space-y-5 p-5">
                {currentWorkflow && !canCreateWorkflow && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 rounded-lg border bg-background p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Quy trình đang chạy
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {completedSteps}/{currentWorkflowSteps.length} bước
                          đã xử lý.
                        </p>
                      </div>
                      {currentWorkflow.status === "InProgress" && (
                        <button
                          type="button"
                          onClick={handleCancelWorkflow}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                        >
                          <XCircle className="h-4 w-4" />
                          Hủy quy trình
                        </button>
                      )}
                    </div>
                    <WorkflowSteps steps={currentWorkflowSteps} />
                  </div>
                )}

                {canCreateWorkflow && (
                  <div className="rounded-lg border bg-background p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {workflowSubmitLabel}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Chọn người xử lý theo đúng thứ tự. Thông tin phiên bản
                          và audit vẫn giữ nguyên.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setWorkflowRows((prev) => [
                            ...prev,
                            createWorkflowRow(),
                          ])
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
                      >
                        <UserPlus className="h-4 w-4" />
                        Thêm bước
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {workflowRows.map((row, index) => (
                        <div
                          key={row.id}
                          className="grid gap-3 rounded-lg bg-muted/30 p-3 md:grid-cols-[80px_1fr_auto_auto] md:items-center"
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
                            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">Chọn người xử lý</option>
                            {organizationMembers.map((member) => {
                              const userId = getMemberUserId(member);
                              if (!userId) return null;
                              if (userId === user?.id) return null;
                              return (
                                <option
                                  key={member.memberId || member.id || userId}
                                  value={userId}
                                >
                                  {getMemberLabel(member)}
                                </option>
                              );
                            })}
                          </select>
                          <span className="inline-flex h-10 items-center rounded-lg border bg-background px-3 text-sm font-semibold text-muted-foreground">
                            {workflowTypeLabels.Approve}
                          </span>
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
                      onClick={handleCreateWorkflow}
                      disabled={isCreatingWorkflow}
                      className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {isCreatingWorkflow ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {workflowSubmitLabel}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "collaboration" && (
              <div className="space-y-5 p-5">
                <section className="rounded-lg border bg-background p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Bình luận
                  </p>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={newComment}
                      onChange={(event) => setNewComment(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleSendComment();
                      }}
                      placeholder="Nhập bình luận..."
                      className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={handleSendComment}
                      disabled={isSendingComment}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {isSendingComment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Gửi
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {comments.length === 0 && (
                      <EmptyState text="Chưa có bình luận nào." />
                    )}
                    {comments.slice(0, 50).map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        canEdit={
                          comment.authorName === user?.displayName ||
                          comment.authorName === user?.email
                        }
                        currentUserName={user?.displayName || user?.email}
                        onReply={handleAddComment}
                        onEdit={handleUpdateComment}
                        onDelete={handleDeleteComment}
                      />
                    ))}
                  </div>
                </section>

                {canManageDocumentAccess && (
                <details className="rounded-lg border bg-background p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Thành viên và quyền truy cập ({participants.length})
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
                      <select
                        value={participantUserId}
                        onChange={(event) =>
                          setParticipantUserId(event.target.value)
                        }
                        className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Chọn thành viên</option>
                        {availableMembers.map((member) => {
                          const userId = getMemberUserId(member);
                          if (!userId) return null;
                          return (
                            <option
                              key={member.memberId || member.id || userId}
                              value={userId}
                            >
                              {getMemberLabel(member)}
                            </option>
                          );
                        })}
                      </select>
                      <select
                        value={participantAccess}
                        onChange={(event) =>
                          setParticipantAccess(
                            event.target.value as DocumentAccessLevel,
                          )
                        }
                        className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="Editor">{accessLabels.Editor}</option>
                        <option value="Viewer">{accessLabels.Viewer}</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddParticipant}
                        disabled={isAddingParticipant}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                      >
                        {isAddingParticipant ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        Thêm
                      </button>
                    </div>

                    <div className="divide-y rounded-lg border">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {participant.displayName ||
                                participant.email ||
                                participant.userId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {participant.email || participant.userId}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={participant.accessLevel}
                              onChange={(event) =>
                                handleUpdateParticipant(
                                  participant,
                                  event.target.value as DocumentAccessLevel,
                                )
                              }
                              disabled={participant.accessLevel === "Owner"}
                              className="h-9 rounded-lg border bg-background px-3 text-sm outline-none disabled:opacity-60"
                            >
                              <option value="Owner">
                                {accessLabels.Owner}
                              </option>
                              <option value="Editor">
                                {accessLabels.Editor}
                              </option>
                              <option value="Viewer">
                                {accessLabels.Viewer}
                              </option>
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveParticipant(participant)
                              }
                              disabled={participant.accessLevel === "Owner"}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-40"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
                )}

                <details className="rounded-lg border bg-background p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Lịch sử xử lý ({audits.length})
                  </summary>
                  <div className="mt-4 divide-y rounded-lg border">
                    {audits.length === 0 && (
                      <EmptyState text="Chưa có lịch sử." />
                    )}
                    {audits.map((audit) => (
                      <div key={audit.id} className="p-4">
                        <p className="font-semibold text-foreground">
                          {labelizeAuditType(audit.auditType)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {translateAuditDescription(audit.description)}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {audit.createdByName || "Hệ thống"} ·{" "}
                          {formatDate(audit.createdDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </section>
        )}
      </div>
      <AppModal
        open={Boolean(removeParticipantTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveParticipantTarget(null);
        }}
        title="Gỡ người tham gia"
        description="Người này sẽ không còn trong danh sách truy cập tài liệu."
        footer={
          <>
            <button
              type="button"
              onClick={() => setRemoveParticipantTarget(null)}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmRemoveParticipant}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              <X className="h-4 w-4" />
              Gỡ người này
            </button>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            {removeParticipantTarget?.displayName ||
              removeParticipantTarget?.email ||
              removeParticipantTarget?.userId}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {removeParticipantTarget?.email || "Không có email"}
          </p>
        </div>
      </AppModal>

      <AppModal
        open={showCancelWorkflowConfirm}
        onOpenChange={(open) => {
          if (!open) setShowCancelWorkflowConfirm(false);
        }}
        title="Hủy quy trình xử lý"
        description="Quy trình đang xử lý của tài liệu này sẽ bị hủy."
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowCancelWorkflowConfirm(false)}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Giữ quy trình
            </button>
            <button
              type="button"
              onClick={confirmCancelWorkflow}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              <XCircle className="h-4 w-4" />
              Hủy quy trình
            </button>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            {document?.title || "Tài liệu hiện tại"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentWorkflowSteps.length} bước xử lý
          </p>
        </div>
      </AppModal>

      <AppModal
        open={Boolean(deleteCommentTargetId)}
        onOpenChange={(open) => {
          if (!open && !isDeletingComment) setDeleteCommentTargetId(null);
        }}
        title="Xóa bình luận"
        description="Bình luận này sẽ bị xóa khỏi phần trao đổi."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteCommentTargetId(null)}
              disabled={isDeletingComment}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmDeleteComment}
              disabled={isDeletingComment}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeletingComment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xóa bình luận
            </button>
          </>
        }
      >
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Thao tác này không thể hoàn tác.
        </div>
      </AppModal>
    </>
  );
}

function MetaChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-background p-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status?: DocumentStatus }) {
  if (!status) return null;
  const tone =
    status === "Completed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "Rejected"
        ? "border-red-200 bg-red-50 text-red-700"
        : status === "InProgress" || status === "WaitingSignature"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-border bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

function DocumentPreview({ version }: { version?: DocumentVersionDTO }) {
  if (!version?.fileUrl) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Chưa có file để xem trước.
      </div>
    );
  }

  const title = `v${version.versionNumber} - ${version.fileName}`;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-semibold text-foreground">
            Xem trước: {title}
          </p>
          <p className="text-xs text-muted-foreground">
            {version.mimeType || "Không rõ định dạng"} ·{" "}
            {formatFileSize(version.fileSize)}
          </p>
        </div>
        <a
          href={version.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Mở tab mới
        </a>
      </div>

      <div className="min-h-[420px] bg-muted/20">
        {isImageVersion(version) && (
          <div className="flex min-h-[420px] items-center justify-center p-4">
            <img
              src={version.fileUrl}
              alt={version.fileName}
              className="max-h-[70vh] max-w-full rounded-lg border bg-white object-contain"
            />
          </div>
        )}
        {isPdfVersion(version) && (
          <iframe
            title={title}
            src={version.fileUrl}
            className="h-[70vh] min-h-[420px] w-full bg-white"
          />
        )}
        {isTextVersion(version) && (
          <iframe
            title={title}
            src={version.fileUrl}
            className="h-[70vh] min-h-[420px] w-full bg-white"
          />
        )}
        {isOfficeVersion(version) && (
          <iframe
            title={title}
            src={buildOfficeViewerUrl(version.fileUrl)}
            className="h-[70vh] min-h-[420px] w-full bg-white"
          />
        )}
        {!isImageVersion(version) &&
          !isPdfVersion(version) &&
          !isTextVersion(version) &&
          !isOfficeVersion(version) && (
            <div className="flex min-h-[420px] flex-col items-center justify-center p-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold text-foreground">
                Chưa hỗ trợ preview định dạng này
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Bạn vẫn có thể mở file trong tab mới hoặc tải về để xem bằng ứng
                dụng phù hợp.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

function WorkflowSteps({
  steps,
}: {
  steps: DocumentDetailDTO["workflows"][number]["steps"];
}) {
  const safeSteps = Array.isArray(steps) ? steps : [];

  return (
    <div className="divide-y rounded-lg border">
      {safeSteps.map((step) => (
        <div
          key={step.id}
          className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                Bước {step.stepOrder}
              </span>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {workflowTypeLabels[step.stepType]}
              </span>
              <WorkflowStepBadge status={step.status} />
            </div>
            <p className="mt-2 font-semibold text-foreground">
              {step.assignedToName || step.assignedToEmail || step.assignedToId}
            </p>
            {step.comment && (
              <details className="mt-2 rounded-lg bg-background p-3 text-sm text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground">
                  Xem ghi chú
                </summary>
                <p className="mt-2">{step.comment}</p>
              </details>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {step.completedAt
              ? `Xử lý: ${formatDate(step.completedAt)}`
              : "Đang chờ xử lý"}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

interface CommentItemProps {
  comment: DocumentCommentDTO;
  canEdit?: boolean;
  currentUserName?: string | null;
  onReply: (parentId: string, content: string) => Promise<boolean> | void;
  onEdit?: (commentId: string, content: string) => Promise<void> | void;
  onDelete?: (commentId: string) => void;
}

function CommentItem({
  comment,
  canEdit = false,
  currentUserName,
  onReply,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOwnComment = canEdit;
  const replies = Array.isArray(comment.replies) ? comment.replies : [];

  const handleReplySubmit = async () => {
    if (isOwnComment) {
      toast.error("Bạn không thể tự phản hồi bình luận của mình.");
      return;
    }
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      await onReply(comment.id, replyContent);
      setReplyContent("");
      setIsReplying(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim()) return;
    setIsSubmitting(true);
    try {
      await onEdit?.(comment.id, editContent);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    await onDelete?.(comment.id);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-foreground">
          {comment.authorName || "Người dùng"}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(comment.createdDate)}
        </p>
      </div>
      {isEditing ? (
        <div className="mt-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleEditSubmit}
              disabled={isSubmitting || !editContent.trim()}
              className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              className="inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold hover:bg-muted"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {comment.content}
        </p>
      )}
      <div className="mt-2 flex gap-3 text-xs">
        {!isEditing && (
          <>
            {!isOwnComment && (
              <button
                type="button"
                onClick={() => setIsReplying(!isReplying)}
                className="text-muted-foreground hover:text-foreground"
              >
                Phản hồi
              </button>
            )}
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  Xóa
                </button>
              </>
            )}
          </>
        )}
      </div>
      {isReplying && (
        <div className="mt-3 flex gap-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Nhập phản hồi..."
            rows={2}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleReplySubmit}
              disabled={isSubmitting || !replyContent.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Gửi
            </button>
            <button
              type="button"
              onClick={() => {
                setIsReplying(false);
                setReplyContent("");
              }}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold hover:bg-muted"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
      {replies.length > 0 && (
        <details className="mt-3 border-l pl-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            {replies.length} phản hồi
          </summary>
          <div className="mt-2 space-y-2">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                canEdit={reply.authorName === currentUserName}
                currentUserName={currentUserName}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function WorkflowStepBadge({ status }: { status: string }) {
  if (status === "Approved" || status === "Signed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {status === "Signed" ? "Đã ký" : "Đã duyệt"}
      </span>
    );
  }

  if (status === "Rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <XCircle className="h-3.5 w-3.5" />
        Từ chối
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <Clock className="h-3.5 w-3.5" />
      Đang chờ
    </span>
  );
}
