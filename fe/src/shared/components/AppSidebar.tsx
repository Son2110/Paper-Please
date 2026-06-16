import {
  Building2,
  CalendarDays,
  CheckSquare,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  SendHorizonal,
  Settings,
  User,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { organizationApi, type OrganizationMemberDTO } from "@/api/organizationApi";
import { queryKeys } from "@/api/queryKeys";
import { BrandIcon } from "@/shared/components/BrandIcon";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { cn } from "@/lib/utils";

type Screen =
  | "dashboard"
  | "documents"
  | "organization"
  | "calendar"
  | "approvals"
  | "my-submissions"
  | "billing"
  | "settings"
  | "document-detail";

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  open: boolean;
  onClose: () => void;
}

const menuGroups: Array<{
  label: string;
  items: Array<{ id: Screen; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: "Công việc",
    items: [
      { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { id: "my-submissions", label: "Tài liệu đã nộp", icon: SendHorizonal },
      { id: "approvals", label: "Cần xử lý", icon: CheckSquare },
      { id: "documents", label: "Kho tài liệu", icon: FolderOpen },
    ],
  },
  {
    label: "Không gian",
    items: [
      { id: "organization", label: "Tổ chức", icon: Building2 },
      { id: "calendar", label: "Lịch nhắc", icon: CalendarDays },
      { id: "billing", label: "Gói & thanh toán", icon: CreditCard },
      { id: "settings", label: "Cài đặt", icon: Settings },
    ],
  },
];

function normalizeRole(value?: OrganizationMemberDTO["role"]) {
  if (value === "Owner" || value === 4) return "Owner";
  if (value === "Administrator" || value === 3) return "Administrator";
  if (value === "Manager" || value === 2) return "Manager";
  return "Member";
}

export function AppSidebar({
  activeScreen,
  onNavigate,
  open,
  onClose,
}: SidebarProps) {
  const { user } = useAuth();
  const { activeOrganization, activeOrganizationId } = useOrganization();
  const currentMembershipQuery = useQuery({
    queryKey: queryKeys.organizations.currentMembership(activeOrganizationId, user?.id),
    queryFn: () =>
      organizationApi.getMembers(activeOrganizationId ?? "", {
        page: 1,
        pageSize: 100,
      }),
    enabled: Boolean(activeOrganizationId && user?.id),
    staleTime: 30_000,
  });

  const currentMembership = currentMembershipQuery.data?.items.find(
    (member) => member.user?.id === user?.id,
  );
  const isOrganizationOwner =
    activeOrganization?.owner?.id === user?.id ||
    normalizeRole(currentMembership?.role) === "Owner";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <BrandIcon className="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">
                Paper Please
              </p>
              <p className="truncate text-xs text-sidebar-foreground">
                {activeOrganization?.name || "Chưa chọn tổ chức"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {menuGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-sidebar-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items
                  .filter((item) => item.id !== "organization" || isOrganizationOwner)
                  .map((item) => {
                  const active =
                    activeScreen === item.id ||
                    (item.id === "documents" && activeScreen === "document-detail");
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                        active
                          ? "bg-foreground text-white"
                          : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100">
              <User className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {user?.displayName || user?.email || "Người dùng"}
              </p>
              <p className="truncate text-xs text-sidebar-foreground">
                {user?.email || "Tài khoản"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export type { Screen };
