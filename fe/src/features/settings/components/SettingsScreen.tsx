import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
    Save,
  XCircle,
  KeyRound,
  CircleHelp,
  Loader2,
  Trash2,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { userApi } from "@/api/userApi";
import { subscriptionApi } from "@/api/subscriptionApi";
import { queryKeys } from "@/api/queryKeys";
import { AppModal } from "@/shared/components/AppModal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const tabs = [
  { id: "profile", label: "Thông tin cá nhân", icon: User },
  { id: "subscription", label: "Gói dịch vụ", icon: CreditCard },
  { id: "security", label: "Bảo mật", icon: KeyRound },
];

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN").format(date);
};

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const passwordRuleText =
  "Mật khẩu tối thiểu 6 ký tự, nên có chữ hoa, chữ thường, số và ký tự đặc biệt.";

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const { user, updateProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    email: "",
    phoneNumber: "",
    dob: "",
    userType: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [showCancelSubscriptionConfirm, setShowCancelSubscriptionConfirm] =
    useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    setProfileForm({
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
      phoneNumber: user?.phoneNumber ?? "",
      dob: user?.dob ? user.dob.slice(0, 10) : "",
      userType: user?.userType ?? "",
    });
  }, [user]);

  const subscriptionQuery = useQuery({
    queryKey: queryKeys.subscriptions.mine,
    queryFn: subscriptionApi.getMine,
    enabled: activeTab === "subscription",
    retry: false,
    staleTime: 60_000,
  });

  const subscription = subscriptionQuery.data ?? null;
  const isLoadingSubscription =
    subscriptionQuery.isLoading || subscriptionQuery.isFetching;

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateProfile({
        displayName: profileForm.displayName || undefined,
        phoneNumber: profileForm.phoneNumber || undefined,
        dob: profileForm.dob || null,
      });
      toast.success("Đã lưu thông tin cá nhân");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể lưu thông tin";
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast.error("Mật khẩu mới không khớp");
      return;
    }

    setIsChangingPassword(true);
    try {
      await userApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      toast.success("Đã đổi mật khẩu");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể đổi mật khẩu";
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancellingSubscription(true);
    try {
      await subscriptionApi.cancelMine();
      queryClient.setQueryData(queryKeys.subscriptions.mine, null);
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.mine });
      setShowCancelSubscriptionConfirm(false);
      toast.success("Đã hủy gói dịch vụ hiện tại");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể hủy gói dịch vụ";
      toast.error(message);
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      toast.error("Nhập DELETE để xác nhận xóa tài khoản");
      return;
    }

    setIsDeletingAccount(true);
    try {
      await userApi.deleteMe({ currentPassword: deletePassword });
      toast.success("Tài khoản đã được xóa");
      logout();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể xóa tài khoản";
      toast.error(message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Cài đặt</h1>
      <p className="text-muted-foreground mt-1">Quản lý cấu hình hệ thống</p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mt-6 bg-muted rounded-lg p-1 w-fit max-w-full">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border mt-5 p-6">
        {activeTab === "profile" && (
          <div className="space-y-5 max-w-lg">
            <div>
              <label className="text-sm font-medium text-foreground">
                Họ và tên
              </label>
              <input
                value={profileForm.displayName}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    displayName: e.target.value,
                  }))
                }
                className="w-full mt-1 px-3 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                value={profileForm.email}
                disabled
                className="w-full mt-1 px-3 py-2.5 text-sm bg-muted border rounded-lg text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Số điện thoại
              </label>
              <input
                value={profileForm.phoneNumber}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    phoneNumber: e.target.value,
                  }))
                }
                className="w-full mt-1 px-3 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Ngày sinh
              </label>
              <input
                type="date"
                value={profileForm.dob}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    dob: e.target.value,
                  }))
                }
                className="w-full mt-1 px-3 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Chức vụ
              </label>
              <input
                value={profileForm.userType}
                disabled
                className="w-full mt-1 px-3 py-2.5 text-sm bg-muted border rounded-lg text-muted-foreground"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        )}

        {activeTab === "subscription" && (
          <div className="space-y-5 max-w-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Gói dịch vụ hiện tại
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Theo dõi trạng thái gói đang kích hoạt trên tài khoản của bạn.
                </p>
              </div>
              {isLoadingSubscription && (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              )}
            </div>

            {!isLoadingSubscription && subscription?.subscription ? (
              <div className="border rounded-xl p-5 bg-background">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {subscription.subscription.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {subscription.subscription.type || "Gói dịch vụ"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(subscription.subscription.price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.subscription.durationDays
                        ? `${subscription.subscription.durationDays} ngày`
                        : "Không giới hạn ngày"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 mt-5">
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Bắt đầu</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {formatDate(subscription.startDate)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Hết hạn</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {formatDate(subscription.endDate)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowCancelSubscriptionConfirm(true)}
                  disabled={isCancellingSubscription}
                  className="mt-5 inline-flex items-center gap-2 border border-destructive/40 text-destructive px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-destructive/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCancellingSubscription ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Hủy gói hiện tại
                </button>
              </div>
            ) : (
              !isLoadingSubscription && (
                <div className="border rounded-xl p-6 text-center bg-background">
                  <CreditCard className="w-9 h-9 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">
                    Chưa có gói dịch vụ đang hoạt động
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vào màn Thanh toán để chọn gói phù hợp.
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-8 max-w-lg">
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Đổi mật khẩu
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Cập nhật mật khẩu đăng nhập cho tài khoản hiện tại.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  className="w-full mt-1 px-3 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Mật khẩu mới
                </label>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Quy tắc mật khẩu</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex transition-colors hover:text-foreground"
                        aria-label="Quy tắc đặt mật khẩu"
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64 text-sm">
                      {passwordRuleText}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  minLength={6}
                  className="w-full mt-1 px-3 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Nhập lại mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmNewPassword: e.target.value,
                    }))
                  }
                  minLength={6}
                  className="w-full mt-1 px-3 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={
                  isChangingPassword ||
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword ||
                  !passwordForm.confirmNewPassword
                }
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                Đổi mật khẩu
              </button>
            </div>

            <div className="border border-destructive/30 rounded-xl p-5 bg-destructive/5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h3 className="text-base font-semibold text-destructive">
                    Xóa tài khoản
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Thao tác này sẽ xóa tài khoản hiện tại. Bạn sẽ được đăng xuất
                    ngay sau khi BE xử lý thành công.
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Nhập DELETE để xác nhận
                </label>
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive"
                />
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={
                  isDeletingAccount ||
                  !deletePassword ||
                  deleteConfirm !== "DELETE"
                }
                className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeletingAccount ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Xóa tài khoản
              </button>
            </div>
          </div>
        )}

        

        

        
      </div>

      <AppModal
        open={showCancelSubscriptionConfirm}
        onOpenChange={(open) => {
          if (!open && !isCancellingSubscription) {
            setShowCancelSubscriptionConfirm(false);
          }
        }}
        title="Hủy gói dịch vụ"
        description="Gói hiện tại sẽ bị hủy trên tài khoản của bạn."
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowCancelSubscriptionConfirm(false)}
              disabled={isCancellingSubscription}
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Giữ lại
            </button>
            <button
              type="button"
              onClick={handleCancelSubscription}
              disabled={isCancellingSubscription}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancellingSubscription ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Hủy gói
            </button>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            {subscription?.subscription?.name || "Gói dịch vụ hiện tại"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {subscription?.subscription?.price != null
              ? formatCurrency(subscription.subscription.price)
              : "Không có thông tin giá"}
          </p>
        </div>
      </AppModal>
    </div>
  );
}
