import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Receipt, Send, Loader2, BellRing } from "lucide-react";
import { toast } from "sonner";
import { emailApi } from "@/api/emailApi";

type EmailMode = "general" | "receipt" | "reminder";

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const textareaClass =
  "w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export function AdminEmailScreen() {
  const [mode, setMode] = useState<EmailMode>("general");
  const [general, setGeneral] = useState({
    recipients: "",
    ccRecipients: "",
    bccRecipients: "",
    subject: "",
    body: "",
  });
  const [receipt, setReceipt] = useState({
    recipient: "",
    subscriberName: "",
    subscriptionName: "",
    subscriptionId: "",
    subscriberEmail: "",
    transactionId: "",
    paymentId: "",
    paidAt: "",
    paymentMethod: "VNPay",
    total: "",
    subject: "",
    supportEmail: "",
  });
  const [reminder, setReminder] = useState({
    recipient: "",
    displayName: "",
    subscriptionName: "",
    subscriptionExpiry: "",
    subject: "",
    supportEmail: "",
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (mode === "general") {
        return emailApi.send({
          ...general,
          ccRecipients: general.ccRecipients || null,
          bccRecipients: general.bccRecipients || null,
        });
      }
      if (mode === "receipt") {
        return emailApi.sendReceipt({
          ...receipt,
          subject: receipt.subject || null,
          supportEmail: receipt.supportEmail || null,
        });
      }
      return emailApi.sendSubscriptionReminder({
        ...reminder,
        subject: reminder.subject || null,
        supportEmail: reminder.supportEmail || null,
      });
    },
    onSuccess: () => toast.success("Đã gửi email"),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không thể gửi email"),
  });

  const modeMeta = {
    general: { label: "Email thường", icon: Mail },
    receipt: { label: "Receipt", icon: Receipt },
    reminder: { label: "Reminder", icon: BellRing },
  } satisfies Record<EmailMode, { label: string; icon: typeof Mail }>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Admin Console
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Email</h1>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Gửi email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gửi email thường, biên nhận thanh toán hoặc nhắc hạn gói theo mẫu hệ thống.
          </p>
        </div>

        <div className="grid gap-2 border-b p-5 sm:grid-cols-3">
          {(Object.keys(modeMeta) as EmailMode[]).map((key) => {
            const Icon = modeMeta[key].icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors ${
                  mode === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {modeMeta[key].label}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMutation.mutate();
          }}
          className="space-y-4 p-5"
        >
          {mode === "general" && (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="space-y-1 text-sm font-medium">
                  <span>Recipients</span>
                  <input
                    required
                    value={general.recipients}
                    onChange={(e) =>
                      setGeneral((prev) => ({ ...prev, recipients: e.target.value }))
                    }
                    placeholder="a@company.com;b@company.com"
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>CC</span>
                  <input
                    value={general.ccRecipients}
                    onChange={(e) =>
                      setGeneral((prev) => ({ ...prev, ccRecipients: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>BCC</span>
                  <input
                    value={general.bccRecipients}
                    onChange={(e) =>
                      setGeneral((prev) => ({ ...prev, bccRecipients: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm font-medium">
                <span>Subject</span>
                <input
                  required
                  value={general.subject}
                  onChange={(e) =>
                    setGeneral((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                <span>Body</span>
                <textarea
                  required
                  rows={8}
                  value={general.body}
                  onChange={(e) =>
                    setGeneral((prev) => ({ ...prev, body: e.target.value }))
                  }
                  className={textareaClass}
                />
              </label>
            </>
          )}

          {mode === "receipt" && (
            <div className="grid gap-4 lg:grid-cols-2">
              {Object.entries(receipt).map(([key, value]) => (
                <label key={key} className="space-y-1 text-sm font-medium">
                  <span>{key}</span>
                  <input
                    required={!["subject", "supportEmail"].includes(key)}
                    value={value}
                    onChange={(e) =>
                      setReceipt((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          )}

          {mode === "reminder" && (
            <div className="grid gap-4 lg:grid-cols-2">
              {Object.entries(reminder).map(([key, value]) => (
                <label key={key} className="space-y-1 text-sm font-medium">
                  <span>{key}</span>
                  <input
                    required={!["subject", "supportEmail"].includes(key)}
                    value={value}
                    onChange={(e) =>
                      setReminder((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={sendMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Gửi email
          </button>
        </form>
      </section>
    </div>
  );
}
