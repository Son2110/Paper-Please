import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, CreditCard, Home, XCircle } from "lucide-react";
import { queryKeys } from "@/api/queryKeys";
import { BrandIcon } from "@/shared/components/BrandIcon";
import { cn } from "@/lib/utils";

function cleanMessage(value?: string | null) {
  if (!value) return "";
  return value.replace(/^"|"$/g, "").trim();
}

export function PaymentResultScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const result = useMemo(() => {
    const successParam = searchParams.get("success");
    const failedParam = searchParams.get("false");
    const isSuccess = successParam?.toLowerCase() === "true";
    const isFailed =
      failedParam?.toLowerCase() === "true" ||
      successParam?.toLowerCase() === "false";

    return {
      isSuccess,
      isFailed,
      paymentId: searchParams.get("paymentId") || searchParams.get("paymentID"),
      message: cleanMessage(searchParams.get("message")),
    };
  }, [searchParams]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["billing"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.mine });
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.active });
    queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
  }, [queryClient]);

  const goToBilling = () => {
    navigate("/?workspace=billing", { replace: true });
  };

  const iconClass = result.isSuccess
    ? "bg-emerald-50 text-emerald-600"
    : "bg-red-50 text-red-600";
  const Icon = result.isSuccess ? CheckCircle2 : XCircle;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <BrandIcon className="h-10 w-10" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Paper Please
              </p>
              <h1 className="truncate text-lg font-bold text-foreground">
                Kết quả thanh toán
              </h1>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center px-4 py-10 sm:px-6">
        <section className="w-full rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
                iconClass,
              )}
            >
              <Icon className="h-7 w-7" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                VNPay
              </p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">
                {result.isSuccess
                  ? "Thanh toán thành công"
                  : "Thanh toán chưa hoàn tất"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {result.isSuccess
                  ? "Gói dịch vụ của bạn đã được hệ thống ghi nhận. Bạn có thể quay lại để tạo hoặc vào tổ chức."
                  : result.message ||
                    "Giao dịch thất bại hoặc đã bị hủy. Bạn có thể quay lại màn gói dịch vụ để thử lại."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Mã thanh toán
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-foreground">
                    {result.paymentId || "Không có"}
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Trạng thái
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {result.isSuccess
                      ? "Đã ghi nhận"
                      : result.isFailed
                        ? "Không thành công"
                        : "Chưa xác định"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={goToBilling}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <CreditCard className="h-4 w-4" />
                  Về gói dịch vụ
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/", { replace: true })}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-semibold hover:bg-muted"
                >
                  <Home className="h-4 w-4" />
                  Về trang chủ
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
