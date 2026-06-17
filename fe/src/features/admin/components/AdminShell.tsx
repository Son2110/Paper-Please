import { useState } from "react";
import {
  BadgeDollarSign,
  Bell,
  ClipboardList,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandIcon } from "@/shared/components/BrandIcon";
import { NotificationDropdown } from "@/shared/components/NotificationDropdown";
import { UserManagementPanel } from "@/features/admin/users/UserManagementPanel";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { AdminActivityLogScreen } from "@/features/admin/activity-logs/AdminActivityLogScreen";
import { AdminBillingScreen } from "@/features/admin/billing/AdminBillingScreen";
import { AdminCdnFileScreen } from "@/features/admin/cdn/AdminCdnFileScreen";
import { AdminDashboardScreen } from "@/features/admin/dashboard/AdminDashboardScreen";
import { AdminNotificationScreen } from "@/features/admin/notifications/AdminNotificationScreen";
import { AdminSubscriptionScreen } from "@/features/admin/subscriptions/AdminSubscriptionScreen";

type AdminScreen =
  | "overview"
  | "users"
  | "subscriptions"
  | "billing"
  | "notifications"
  | "cdn-files"
  | "activity-logs";

interface AdminMenuItem {
  id: AdminScreen;
  label: string;
  icon: LucideIcon;
}

const menuGroups: { label: string; items: AdminMenuItem[] }[] = [
  {
    label: "Điều hành",
    items: [{ id: "overview", label: "Tổng quan", icon: LayoutDashboard }],
  },
  {
    label: "Người dùng",
    items: [
      { id: "users", label: "Tài khoản", icon: Users },
      { id: "activity-logs", label: "Nhật ký hoạt động", icon: ClipboardList },
    ],
  },
  {
    label: "Kinh doanh",
    items: [
      { id: "subscriptions", label: "Gói dịch vụ", icon: CreditCard },
      { id: "billing", label: "Thanh toán", icon: BadgeDollarSign },
    ],
  },
  {
    label: "Vận hành",
    items: [
      { id: "notifications", label: "Thông báo", icon: Bell },
      { id: "cdn-files", label: "Tệp hệ thống", icon: FolderOpen },
    ],
  },
];

const screenTitles: Record<AdminScreen, string> = {
  overview: "Tổng quan quản trị",
  users: "Tài khoản người dùng",
  subscriptions: "Gói dịch vụ",
  billing: "Thanh toán",
  notifications: "Thông báo",
  "cdn-files": "Tệp hệ thống",
  "activity-logs": "Nhật ký hoạt động",
};

function userTypeLabel(value?: string | null) {
  if (value === "Admin") return "Quản trị viên";
  if (value === "Moderator") return "Điều phối viên";
  if (value === "User") return "Người dùng";
  return value || "Tài khoản";
}

function statusLabel(value?: string | null) {
  if (value === "Active") return "Đang hoạt động";
  if (value === "Inactive") return "Tạm dừng";
  if (value === "Disabled") return "Đã vô hiệu hóa";
  if (value === "Suspended") return "Bị tạm khóa";
  if (value === "Banned") return "Bị chặn";
  return value || "Chưa rõ";
}

export function AdminShell() {
  const { logout, user } = useAuth();
  const [screen, setScreen] = useState<AdminScreen>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  const navigate = (nextScreen: AdminScreen) => {
    setScreen(nextScreen);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950 text-white transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <BrandIcon className="h-10 w-10 ring-white/10" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold">Paper Please</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Quản trị hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {menuGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = screen === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                        active
                          ? "bg-white text-neutral-950"
                          : "text-neutral-300 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-neutral-800 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <UserRound className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.displayName || user?.email || "Quản trị viên"}
              </p>
              <p className="truncate text-xs text-neutral-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-foreground hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {screenTitles[screen]}
              </p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {userTypeLabel(user?.userType)} · {statusLabel(user?.status)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((open) => !open)}
                className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                {notificationUnreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </button>
              <NotificationDropdown
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                onUnreadCountChange={setNotificationUnreadCount}
              />
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {screen === "overview" && (
            <AdminDashboardScreen
              onOpenUsers={() => navigate("users")}
              onOpenSettings={() => navigate("overview")}
              onOpenSubscriptions={() => navigate("subscriptions")}
              onOpenBilling={() => navigate("billing")}
              onOpenNotifications={() => navigate("notifications")}
              onOpenCdnFiles={() => navigate("cdn-files")}
              onOpenActivityLogs={() => navigate("activity-logs")}
            />
          )}
          {screen === "users" && <UserManagementPanel />}
          {screen === "subscriptions" && <AdminSubscriptionScreen />}
          {screen === "billing" && <AdminBillingScreen />}
          {screen === "notifications" && <AdminNotificationScreen />}
          {screen === "cdn-files" && <AdminCdnFileScreen />}
          {screen === "activity-logs" && <AdminActivityLogScreen />}
        </main>
      </div>
    </div>
  );
}

export type { AdminScreen };
