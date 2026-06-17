const titleMap: Record<string, string> = {
  "organization invitation": "Lời mời vào tổ chức",
  "removed from organization": "Đã bị gỡ khỏi tổ chức",
  "document access granted": "Đã cấp quyền truy cập tài liệu",
  "document access removed": "Đã gỡ quyền truy cập tài liệu",
  "new document version": "Phiên bản tài liệu mới",
  "workflow assignment": "Phân công xử lý quy trình",
  "workflow action required": "Cần xử lý quy trình",
  "workflow step approved": "Một bước đã được phê duyệt",
  "workflow rejected": "Quy trình bị từ chối",
  "workflow completed": "Quy trình đã hoàn tất",
  "workflow cancelled": "Quy trình đã bị hủy",
  "subscription activated": "Gói dịch vụ đã kích hoạt",
  "subscription extended": "Gói dịch vụ đã gia hạn",
};

const typeMap: Record<string, string> = {
  System: "Hệ thống",
  Info: "Thông tin",
  Success: "Thành công",
  Warning: "Cảnh báo",
  Error: "Lỗi",
  Reminder: "Nhắc việc",
  Message: "Tin nhắn",
  Document: "Tài liệu",
  Workflow: "Quy trình",
  Payment: "Thanh toán",
  Billing: "Thanh toán",
  Subscription: "Gói dịch vụ",
  Organization: "Tổ chức",
  User: "Người dùng",
  ORGANIZATION_INVITED: "Lời mời vào tổ chức",
  ORGANIZATION_MEMBER_REMOVED: "Gỡ thành viên khỏi tổ chức",
  DOCUMENT_PARTICIPANT_ADDED: "Cấp quyền tài liệu",
  DOCUMENT_PARTICIPANT_REMOVED: "Gỡ quyền tài liệu",
  DOCUMENT_VERSION_UPLOADED: "Phiên bản tài liệu mới",
  WORKFLOW_ASSIGNED: "Phân công quy trình",
  WORKFLOW_STEP_AVAILABLE: "Cần xử lý quy trình",
  WORKFLOW_APPROVED: "Đã phê duyệt bước",
  WORKFLOW_REJECTED: "Quy trình bị từ chối",
  WORKFLOW_COMPLETED: "Quy trình hoàn tất",
  WORKFLOW_CANCELLED: "Quy trình bị hủy",
  SUBSCRIPTION_ACTIVATED: "Kích hoạt gói dịch vụ",
  SUBSCRIPTION_EXTENDED: "Gia hạn gói dịch vụ",
};

const exactTextMap: Record<string, string> = {
  "notification marked as read.": "Đã đánh dấu thông báo là đã đọc.",
  "marked all notification as read.": "Đã đánh dấu tất cả thông báo là đã đọc.",
  "no unread notifications.": "Không có thông báo chưa đọc.",
  "notification sent.": "Đã gửi thông báo.",
};

const phraseReplacements: Array<[RegExp, string]> = [
  [/^You have been added to organization '(.+)'\.?$/i, "Bạn đã được thêm vào tổ chức \"$1\"."],
  [/^You were added to document '(.+)'\.?$/i, "Bạn đã được cấp quyền truy cập tài liệu \"$1\"."],
  [/^You have been assigned to review '(.+)'\.?$/i, "Bạn được phân công xử lý tài liệu \"$1\"."],
  [/^You may now review '(.+)'\.?$/i, "Bạn có thể xử lý tài liệu \"$1\" ngay bây giờ."],
  [/^(.+) approved workflow step (\d+)\.?$/i, "$1 đã phê duyệt bước $2."],
  [/^(.+) rejected workflow for '(.+)'\.?$/i, "$1 đã từ chối quy trình của tài liệu \"$2\"."],
  [/^Workflow for '(.+)' has been completed\.?$/i, "Quy trình của tài liệu \"$1\" đã hoàn tất."],
  [/^Workflow for '(.+)' has been cancelled\.?$/i, "Quy trình của tài liệu \"$1\" đã bị hủy."],
  [/^Target user does not exist\.?$/i, "Người nhận không tồn tại."],
  [/^Notification not found\.?$/i, "Không tìm thấy thông báo."],
  [/^You cannot access this notification\.?$/i, "Bạn không có quyền xem thông báo này."],
];

const wordMap: Record<string, string> = {
  notification: "thông báo",
  notifications: "thông báo",
  document: "tài liệu",
  documents: "tài liệu",
  workflow: "quy trình",
  step: "bước",
  assigned: "được phân công",
  approved: "đã phê duyệt",
  approve: "phê duyệt",
  rejected: "đã từ chối",
  reject: "từ chối",
  completed: "hoàn tất",
  cancelled: "đã hủy",
  canceled: "đã hủy",
  pending: "đang chờ",
  reminder: "nhắc việc",
  warning: "cảnh báo",
  upload: "tải lên",
  uploaded: "đã tải lên",
  comment: "bình luận",
  message: "tin nhắn",
  payment: "thanh toán",
  billing: "thanh toán",
  subscription: "gói dịch vụ",
  organization: "tổ chức",
  user: "người dùng",
  access: "quyền truy cập",
  granted: "đã cấp",
  removed: "đã gỡ",
  invitation: "lời mời",
};

function hasVietnamese(value: string) {
  return /[À-ỹĐđ]/.test(value);
}

export function translateNotificationText(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trim();
  const exact = exactTextMap[trimmed.toLowerCase()] || titleMap[trimmed.toLowerCase()];
  if (exact) return exact;

  for (const [pattern, replacement] of phraseReplacements) {
    if (pattern.test(trimmed)) return trimmed.replace(pattern, replacement);
  }

  if (hasVietnamese(trimmed)) return trimmed;

  return trimmed
    .replace(/_/g, " ")
    .replace(/\b[A-Za-z]+\b/g, (word) => wordMap[word.toLowerCase()] ?? word);
}

export function translateNotificationType(value?: string | null) {
  if (!value) return "-";
  return typeMap[value] ?? translateNotificationText(value);
}
