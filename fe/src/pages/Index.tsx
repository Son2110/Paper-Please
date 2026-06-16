import { useEffect, useState } from "react";
import { Menu, Bell, Building2, ChevronDown, LogOut, Loader2 } from "lucide-react";
import { AppSidebar, type Screen } from "@/shared/components/AppSidebar";
import { DashboardScreen } from "@/features/dashboard/components/DashboardScreen";
import { DocumentHubScreen } from "@/features/documents/components/DocumentHubScreen";
import { CalendarScreen } from "@/features/dashboard/components/CalendarScreen";
import { ApprovalsScreen } from "@/features/documents/components/ApprovalsScreen";
import { MySubmissionsScreen } from "@/features/documents/components/MySubmissionsScreen";
import { SettingsScreen } from "@/features/settings/components/SettingsScreen";
import { BillingScreen } from "@/features/billing/components/BillingScreen";
import { OrganizationScreen } from "@/features/organizations/components/OrganizationScreen";
import { DocumentDetailScreen } from "@/features/documents/components/DocumentDetailScreen";
import { LoginScreen } from "@/features/auth/components/LoginScreen";
import { NotificationDropdown } from "@/shared/components/NotificationDropdown";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { WorkspaceSelectScreen } from "@/features/organizations/components/WorkspaceSelectScreen";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";

export const documentCategories = [
  "Cá nhân",
  "Công việc",
  "Học vấn",
  "Y tế",
  "Bất động sản",
  "Phương tiện",
  "Bảo hiểm",
  "Tài chính",
];

export interface ApprovalLevel {
  name: string;
  status: "approved" | "pending" | "waiting" | "rejected";
  signatureUrl?: string;
  approvedAt?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  expiry: string;
  status: string;
  progress: { label: string; done: boolean }[];
  submittedBy?: string;
  submittedAt?: string;
  signatureUrl?: string;
  fileUrl?: string;
  fileName?: string;
  cdnSavedName?: string;
  approver?: string;
  approvers?: ApprovalLevel[];
  currentApprovalLevel?: number;
  rejectReason?: string;
}

const initialDocuments: Document[] = [];

const Index = () => {
  const { isAuthenticated, isInitializing, logout, user } = useAuth();
  const { activeOrganization, isLoading: isLoadingOrganizations } =
    useOrganization();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [workspaceConfirmed, setWorkspaceConfirmed] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [docFilter, setDocFilter] = useState("");
  const [docCategoryFilter, setDocCategoryFilter] = useState("");
  const [fromApprovals, setFromApprovals] = useState(false);
  const [mySubmissionsTab, setMySubmissionsTab] = useState<
    "all" | "cho-duyet" | "da-duyet" | "da-tu-choi"
  >("all");
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  useEffect(() => {
    setWorkspaceConfirmed(false);
    setScreen("dashboard");
  }, [user?.id]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Đang tải phiên đăng nhập...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (user?.userType === "Admin") {
    return <AdminShell />;
  }

  if (!workspaceConfirmed || (!activeOrganization && !isLoadingOrganizations)) {
    return <WorkspaceSelectScreen onContinue={() => setWorkspaceConfirmed(true)} />;
  }

  const handleOpenDetail = (docId: string) => {
    setSelectedDocId(docId);
    setFromApprovals(screen === "approvals");
    setScreen("document-detail");
  };

  const handleBackFromDetail = () => {
    setScreen(fromApprovals ? "approvals" : "documents");
    setFromApprovals(false);
  };

  const handleNavigateWithFilter = (filter: string) => {
    if (filter === "all") {
      setMySubmissionsTab("all");
    } else if (
      filter === "cho-duyet" ||
      filter === "sap-den-han" ||
      filter === "qua-han"
    ) {
      setMySubmissionsTab("cho-duyet");
    } else {
      setMySubmissionsTab("all");
    }
    setScreen("my-submissions");
  };

  const handleNavigateWithCategory = (category: string) => {
    setDocCategoryFilter(category);
    setDocFilter("");
    setScreen("documents");
  };

  const handleNavigate = (s: Screen) => {
    if (s !== "documents") {
      setDocFilter("");
      setDocCategoryFilter("");
    }
    setScreen(s);
  };

  const handleDeleteDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAddDoc = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleApproveDoc = (id: string, signatureUrl?: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const approvers = d.approvers ? [...d.approvers] : [];
        const currentLevel = d.currentApprovalLevel ?? 0;
        const now = new Date();
        const ts = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        if (approvers[currentLevel]) {
          approvers[currentLevel] = {
            ...approvers[currentLevel],
            status: "approved",
            signatureUrl: signatureUrl || undefined,
            approvedAt: ts,
          };
        }

        const nextLevel = currentLevel + 1;
        const isLastLevel = nextLevel >= approvers.length;

        if (!isLastLevel && approvers[nextLevel]) {
          approvers[nextLevel] = { ...approvers[nextLevel], status: "pending" };
        }

        const newProgress = approvers.map((a, i) => ({
          label:
            a.status === "approved"
              ? `${a.name} ✓`
              : i === nextLevel && !isLastLevel
                ? `Đang chờ ${a.name}`
                : `Chờ ${a.name}`,
          done: a.status === "approved",
        }));

        return {
          ...d,
          approvers,
          currentApprovalLevel: nextLevel,
          status: isLastLevel ? "da-duyet" : d.status,
          progress: newProgress,
          signatureUrl: isLastLevel
            ? signatureUrl || d.signatureUrl
            : d.signatureUrl,
          approver: isLastLevel
            ? approvers[approvers.length - 1]?.name
            : approvers[nextLevel]?.name,
        };
      }),
    );
    setScreen("approvals");
  };

  const handleRejectDoc = (id: string, reason?: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const approvers = d.approvers ? [...d.approvers] : [];
        const currentLevel = d.currentApprovalLevel ?? 0;
        const rejecterName = approvers[currentLevel]?.name || "Người duyệt";
        const now = new Date();
        const ts = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        if (approvers[currentLevel]) {
          approvers[currentLevel] = {
            ...approvers[currentLevel],
            status: "rejected",
            approvedAt: ts,
          };
        }
        return {
          ...d,
          approvers,
          status: "da-tu-choi",
          rejectReason: reason || "",
          progress: [
            ...d.progress.filter((p) => p.done),
            { label: `${rejecterName} đã từ chối`, done: false },
          ],
        };
      }),
    );
    setScreen("approvals");
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar
        activeScreen={screen}
        onNavigate={handleNavigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b bg-card shrink-0">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceConfirmed(false)}
              className="flex min-w-0 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              title="Đổi tổ chức"
            >
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="max-w-[160px] truncate">
                {activeOrganization?.name || "Chọn tổ chức"}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setWorkspaceConfirmed(false)}
            className="hidden min-w-0 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted lg:inline-flex"
            title="Đổi tổ chức"
          >
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="max-w-[260px] truncate">
              {activeOrganization?.name || "Chọn tổ chức"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative"
              >
                <Bell className="w-5 h-5" />
                {notificationUnreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
                )}
              </button>
              <NotificationDropdown
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                onUnreadCountChange={setNotificationUnreadCount}
              />
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {screen === "dashboard" && (
            <DashboardScreen
              documents={documents}
              onNavigateWithFilter={handleNavigateWithFilter}
              onNavigateWithCategory={handleNavigateWithCategory}
              onOpenDetail={handleOpenDetail}
            />
          )}
          {screen === "documents" && (
            <DocumentHubScreen
              onOpenDetail={handleOpenDetail}
            />
          )}
          {screen === "calendar" && (
            <CalendarScreen onOpenDetail={handleOpenDetail} />
          )}
          {screen === "organization" && <OrganizationScreen />}
          {screen === "billing" && <BillingScreen />}
          {screen === "approvals" && (
            <ApprovalsScreen
              documents={documents}
              onOpenDetail={handleOpenDetail}
            />
          )}
          {screen === "my-submissions" && (
            <MySubmissionsScreen
              documents={documents}
              onOpenDetail={handleOpenDetail}
              onAddDoc={handleAddDoc}
              initialTab={mySubmissionsTab}
            />
          )}
          {screen === "settings" && <SettingsScreen />}
          {screen === "document-detail" && (
            <DocumentDetailScreen
              docId={selectedDocId}
              document={documents.find((d) => d.id === selectedDocId)}
              onBack={handleBackFromDetail}
              showApprovalActions={fromApprovals}
              onApprove={handleApproveDoc}
              onReject={handleRejectDoc}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;


