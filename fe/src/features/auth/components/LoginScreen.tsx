import { useMemo, useState } from "react";
import {
  CircleHelp,
  ArrowLeft,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { authApi, type TokenPurpose } from "@/api/authApi";
import { BrandIcon } from "@/shared/components/BrandIcon";
import { useAuth } from "@/context/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AuthMode = "login" | "register" | "forgot" | "reset" | "confirm";

interface LoginScreenProps {
  onLogin?: () => void;
}

const REMEMBER_LOGIN_KEY = "paperPlease.rememberLogin";
const REMEMBERED_EMAIL_KEY = "paperPlease.rememberedEmail";

const inputClass =
  "w-full mt-1 px-3 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed";

const passwordInputClass =
  "w-full mt-1 px-3 py-2.5 pr-10 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed";

const passwordRuleText =
  "Mật khẩu tối thiểu 6 ký tự, nên có chữ hoa, chữ thường, số và ký tự đặc biệt.";

function formatError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function formatLoginError(err: unknown) {
  const message = formatError(err, "Không thể đăng nhập. Vui lòng thử lại.");
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid") ||
    lower.includes("incorrect") ||
    lower.includes("unauthorized") ||
    lower.includes("failed") ||
    lower.includes("401")
  ) {
    return "Email hoặc mật khẩu không đúng.";
  }

  return message;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { login, isLoading, error } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [remember, setRemember] = useState(
    () => window.localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false",
  );
  const [localError, setLocalError] = useState("");

  const [loginEmail, setLoginEmail] = useState(
    () => window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "",
  );
  const [loginPassword, setLoginPassword] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dob, setDob] = useState("");

  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmToken, setConfirmToken] = useState("");

  const pending = isLoading || isSubmitting;
  const displayedError = localError || (mode === "login" ? error : "");

  const modeMeta = useMemo(() => {
    switch (mode) {
      case "register":
        return {
          title: "Tạo tài khoản",
          subtitle: "Đăng ký tài khoản người dùng mới",
          icon: UserPlus,
        };
      case "forgot":
        return {
          title: "Quên mật khẩu",
          subtitle: "Nhận mã đặt lại mật khẩu qua email",
          icon: Mail,
        };
      case "reset":
        return {
          title: "Đặt lại mật khẩu",
          subtitle: "Nhập mã xác thực và mật khẩu mới",
          icon: KeyRound,
        };
      case "confirm":
        return {
          title: "Xác nhận email",
          subtitle: "Gửi mã hoặc nhập mã xác nhận email",
          icon: ShieldCheck,
        };
      default:
        return {
          title: "Đăng nhập",
          subtitle: "Quản lý tài liệu doanh nghiệp thông minh",
          icon: FileText,
        };
    }
  }, [mode]);

  const ModeIcon = modeMeta.icon;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLocalError("");
    setShowPassword(false);
    setShowNewPassword(false);
  };

  const runAuthAction = async (action: () => Promise<void>) => {
    setIsSubmitting(true);
    setLocalError("");
    try {
      await action();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email: loginEmail, password: loginPassword }, remember);
      window.localStorage.setItem(REMEMBER_LOGIN_KEY, String(remember));
      if (remember) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, loginEmail.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      toast.success("Đăng nhập thành công");
      onLogin?.();
    } catch (err) {
      const message = formatLoginError(err);
      setLocalError(message);
      toast.error(message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAuthAction(async () => {
      try {
        const email = registerEmail.trim();
        await authApi.register({
          email,
          password: registerPassword,
          displayName: displayName || undefined,
          phoneNumber: phoneNumber || undefined,
          dob,
        });
        toast.success("Đăng ký thành công");
        setLoginEmail(email);
        setLoginPassword("");
        switchMode("login");
      } catch (err) {
        const message = formatError(err, "Không thể đăng ký tài khoản");
        setLocalError(message);
        toast.error(message);
      }
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAuthAction(async () => {
      try {
        await authApi.forgotPassword({ email: recoveryEmail });
        toast.success("Đã gửi mã đặt lại mật khẩu nếu email hợp lệ");
        switchMode("reset");
      } catch (err) {
        const message = formatError(err, "Không thể gửi mã đặt lại mật khẩu");
        setLocalError(message);
        toast.error(message);
      }
    });
  };

  const handleVerifyToken = async (
    purpose: TokenPurpose,
    email: string,
    token: string,
  ) => {
    await runAuthAction(async () => {
      try {
        await authApi.verifyToken({ email, token, purpose });
        toast.success("Mã xác thực hợp lệ");
      } catch (err) {
        const message = formatError(err, "Mã xác thực không hợp lệ");
        setLocalError(message);
        toast.error(message);
      }
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetToken.length !== 6) {
      toast.error("Mã xác thực phải gồm 6 ký tự");
      return;
    }
    await runAuthAction(async () => {
      try {
        await authApi.resetPassword({
          email: recoveryEmail,
          token: resetToken,
          newPassword,
          confirmNewPassword,
        });
        toast.success("Đặt lại mật khẩu thành công");
        setLoginEmail(recoveryEmail);
        setLoginPassword("");
        switchMode("login");
      } catch (err) {
        const message = formatError(err, "Không thể đặt lại mật khẩu");
        setLocalError(message);
        toast.error(message);
      }
    });
  };

  const handleSendEmailConfirmation = async () => {
    await runAuthAction(async () => {
      try {
        await authApi.sendEmailConfirmation({ email: confirmEmail });
        toast.success("Đã gửi mã xác nhận email");
      } catch (err) {
        const message = formatError(err, "Không thể gửi mã xác nhận");
        setLocalError(message);
        toast.error(message);
      }
    });
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAuthAction(async () => {
      try {
        await authApi.confirmEmail({ email: confirmEmail, token: confirmToken });
        toast.success("Xác nhận email thành công");
        setLoginEmail(confirmEmail);
        switchMode("login");
      } catch (err) {
        const message = formatError(err, "Không thể xác nhận email");
        setLocalError(message);
        toast.error(message);
      }
    });
  };

  const renderPasswordToggle = (
    show: boolean,
    onToggle: () => void,
    label: string,
  ) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-muted-foreground hover:text-foreground"
      aria-label={label}
      disabled={pending}
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-8">
          <BrandIcon className="h-12 w-12 rounded-xl" />
          <span className="text-2xl font-bold text-foreground tracking-tight">
            Paper Please
          </span>
        </div>

        <div className="bg-card rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ModeIcon className="w-5 h-5" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground text-center mb-1">
            {modeMeta.title}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {modeMeta.subtitle}
          </p>

          {(mode === "login" || mode === "register") && (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted mb-6">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`h-9 rounded-md text-sm font-medium transition-colors ${
                  mode === "login"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`h-9 rounded-md text-sm font-medium transition-colors ${
                  mode === "register"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nguyenvana@example.com"
                  required
                  disabled={pending}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={pending}
                    placeholder="********"
                    className={passwordInputClass}
                  />
                  {renderPasswordToggle(
                    showPassword,
                    () => setShowPassword(!showPassword),
                    showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu",
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    Ghi nhớ đăng nhập
                  </span>
                </label>
                <div className="flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryEmail(loginEmail);
                      switchMode("forgot");
                    }}
                    className="text-primary hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                Đăng nhập
              </button>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Họ tên
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tên hiển thị"
                  disabled={pending}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    disabled={pending}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Số điện thoại
                  </label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={pending}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    disabled={pending}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Mật khẩu
                  </label>
                  <span className="ml-1.5 inline-flex items-center text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex transition-colors hover:text-foreground"
                          aria-label="Quy tắc đặt mật khẩu"
                          tabIndex={0}
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-64 text-sm">
                        {passwordRuleText}
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      minLength={6}
                      required
                      disabled={pending}
                      className={passwordInputClass}
                    />
                    {renderPasswordToggle(
                      showPassword,
                      () => setShowPassword(!showPassword),
                      showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu",
                    )}
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                <UserPlus className="w-4 h-4" />
                Tạo tài khoản
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  required
                  disabled={pending}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Mail className="w-4 h-4" />
                Gửi mã đặt lại
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  required
                  disabled={pending}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Mã xác thực
                </label>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={6}
                  value={resetToken}
                  onChange={(e) =>
                    setResetToken(e.target.value.trim().slice(0, 6))
                  }
                  required
                  disabled={pending}
                  placeholder="Nhập mã 6 ký tự"
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      required
                      disabled={pending}
                      className={passwordInputClass}
                    />
                    {renderPasswordToggle(
                      showNewPassword,
                      () => setShowNewPassword(!showNewPassword),
                      showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu",
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Nhập lại mật khẩu
                  </label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    minLength={6}
                    required
                    disabled={pending}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={pending || resetToken.length !== 6}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Đặt lại mật khẩu
                </button>
              </div>
            </form>
          )}

          {mode === "confirm" && (
            <form onSubmit={handleConfirmEmail} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  required
                  disabled={pending}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Mã xác nhận
                </label>
                <textarea
                  value={confirmToken}
                  onChange={(e) => setConfirmToken(e.target.value)}
                  required
                  disabled={pending}
                  rows={3}
                  className="w-full mt-1 px-3 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={pending || !confirmEmail}
                  onClick={handleSendEmailConfirmation}
                  className="inline-flex items-center justify-center gap-2 border px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Mail className="w-4 h-4" />
                  Gửi mã
                </button>
                <button
                  type="button"
                  disabled={pending || !confirmEmail || !confirmToken}
                  onClick={() =>
                    handleVerifyToken("EmailConfirmation", confirmEmail, confirmToken)
                  }
                  className="inline-flex items-center justify-center gap-2 border px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Kiểm tra
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Xác nhận
                </button>
              </div>
            </form>
          )}

          {displayedError && (
            <p className="text-sm text-destructive text-center mt-4">
              {displayedError}
            </p>
          )}

          {mode !== "login" && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              disabled={pending}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại đăng nhập
            </button>
          )}
        </div>

        <p className="text-center text-xs text-sidebar-foreground mt-6">
          © 2026 Paper Please. All rights reserved.
        </p>
      </div>
    </div>
  );
}
