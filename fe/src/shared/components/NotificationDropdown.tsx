import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Upload,
  MessageSquare,
  X,
  Loader2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  notificationApi,
  type NotificationDTO,
} from "@/api/notificationApi";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/context/AuthContext";

interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

function getNotificationVisual(notification: NotificationDTO) {
  const value = `${notification.type} ${notification.title}`.toLowerCase();

  if (value.includes("reminder") || value.includes("warning")) {
    return { icon: AlertTriangle, color: "text-warning" };
  }
  if (value.includes("upload") || value.includes("file")) {
    return { icon: Upload, color: "text-primary" };
  }
  if (value.includes("approved") || value.includes("success")) {
    return { icon: CheckCircle, color: "text-success" };
  }
  if (value.includes("comment") || value.includes("message")) {
    return { icon: MessageSquare, color: "text-orange" };
  }

  return { icon: Bell, color: "text-muted-foreground" };
}

const notificationTextMap: Record<string, string> = {
  "notification marked as read.": "Đã đánh dấu thông báo là đã đọc.",
  "marked all notification as read.": "Đã đánh dấu tất cả thông báo là đã đọc.",
  "no unread notifications.": "Không có thông báo chưa đọc.",
  "notification sent.": "Đã gửi thông báo.",
};

const notificationWordMap: Record<string, string> = {
  notification: "thông báo",
  document: "tài liệu",
  documents: "tài liệu",
  workflow: "quy trình",
  approved: "đã phê duyệt",
  approve: "phê duyệt",
  rejected: "đã từ chối",
  reject: "từ chối",
  completed: "hoàn tất",
  pending: "đang chờ",
  reminder: "nhắc việc",
  warning: "cảnh báo",
  upload: "tải lên",
  uploaded: "đã tải lên",
  comment: "bình luận",
  message: "tin nhắn",
  payment: "thanh toán",
  subscription: "gói dịch vụ",
  organization: "tổ chức",
  user: "người dùng",
};

const notificationTypeMap: Record<string, string> = {
  Info: "Thông tin",
  Success: "Thành công",
  Warning: "Cảnh báo",
  Error: "Lỗi",
  Reminder: "Nhắc việc",
  Document: "Tài liệu",
  Workflow: "Quy trình",
  Payment: "Thanh toán",
  Subscription: "Gói dịch vụ",
  Organization: "Tổ chức",
};

function translateNotificationText(value?: string | null) {
  if (!value) return "";
  const exact = notificationTextMap[value.trim().toLowerCase()];
  if (exact) return exact;

  return value.replace(/\b[A-Za-z]+\b/g, (word) => {
    const translated = notificationWordMap[word.toLowerCase()];
    return translated ?? word;
  });
}

function translateNotificationType(value?: string | null) {
  if (!value) return "-";
  return notificationTypeMap[value] ?? translateNotificationText(value);
}

function formatRelativeTime(value: string) {
  const sentAt = new Date(value).getTime();
  if (Number.isNaN(sentAt)) return "";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - sentAt) / 60000));
  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

export function NotificationDropdown({
  open,
  onClose,
  onUnreadCountChange,
}: NotificationDropdownProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationDTO | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.notifications.mine({ page: 1, pageSize: 10 }),
    queryFn: () => notificationApi.getMine({ page: 1, pageSize: 10 }),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const notifications = useMemo(() => data?.items ?? [], [data?.items]);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [onUnreadCountChange, unreadCount]);

  const readNotificationMutation = useMutation({
    mutationFn: notificationApi.read,
    onSuccess: (notification) => {
      setSelectedNotification(notification);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      setSelectedNotification((current) =>
        current ? { ...current, isRead: true } : current,
      );
    },
  });

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card rounded-xl border shadow-2xl z-50 animate-fade-in overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-foreground">Thông báo</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải thông báo...
            </div>
          )}

          {isError && (
            <div className="px-4 py-8 text-center text-sm text-destructive">
              Không thể tải thông báo.
            </div>
          )}

          {!isLoading && !isError && notifications.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có thông báo nào.
            </div>
          )}

          {notifications.map((notification) => {
            const visual = getNotificationVisual(notification);
            const Icon = visual.icon;
            const isSelected = selectedNotification?.id === notification.id;
            const title = translateNotificationText(notification.title);
            const message = translateNotificationText(notification.message);

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  readNotificationMutation.mutate(notification.id);
                }}
                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors border-b last:border-b-0 text-left ${
                  !notification.isRead ? "bg-primary/5" : ""
                } ${isSelected ? "ring-1 ring-inset ring-primary/30" : ""}`}
              >
                <div className={`mt-0.5 ${visual.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-snug mt-0.5">
                    {message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(notification.sentAt)}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
                {readNotificationMutation.isPending && isSelected && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-1 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
        {selectedNotification && (
          <div className="border-t bg-muted/30 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {translateNotificationText(selectedNotification.title)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {translateNotificationText(selectedNotification.message)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <span>Loại: {translateNotificationType(selectedNotification.type)}</span>
              <span>Người gửi: {selectedNotification.sender || "-"}</span>
              <span>
                Nhóm: {translateNotificationType(selectedNotification.targetType)}
              </span>
              <span>{formatRelativeTime(selectedNotification.sentAt)}</span>
            </div>
          </div>
        )}
        <div className="px-4 py-3 border-t">
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
            className="w-full text-sm text-primary font-medium hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </div>
    </>
  );
}
