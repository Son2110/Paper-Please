import { apiRequest } from "./httpClient";

export interface EmailSendRequest {
  recipients: string;
  subject: string;
  body: string;
  ccRecipients?: string | null;
  bccRecipients?: string | null;
}

export interface EmailSubscriptionReceiptRequest {
  subject?: string | null;
  supportEmail?: string | null;
  recipient: string;
  subscriberName: string;
  subscriptionName: string;
  subscriptionId: string;
  subscriberEmail: string;
  transactionId: string;
  paymentId: string;
  paidAt: string;
  paymentMethod: string;
  total: string;
}

export interface EmailSubscriptionReminderRequest {
  subject?: string | null;
  supportEmail?: string | null;
  recipient: string;
  displayName: string;
  subscriptionName: string;
  subscriptionExpiry: string;
}

export const emailApi = {
  send(request: EmailSendRequest) {
    return apiRequest<unknown>("/Email/send", {
      method: "POST",
      body: request,
    });
  },

  sendReceipt(request: EmailSubscriptionReceiptRequest) {
    return apiRequest<unknown>("/Email/send-receipt", {
      method: "POST",
      body: request,
    });
  },

  sendSubscriptionReminder(request: EmailSubscriptionReminderRequest) {
    return apiRequest<unknown>("/Email/send-subscription-reminder", {
      method: "POST",
      body: request,
    });
  },
};
