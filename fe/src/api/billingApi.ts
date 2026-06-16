import { apiRequest } from "./httpClient";
import type { PaginatedResult } from "./adminUserApi";
import type { UserMinimalDTO } from "./activityLogApi";
import type { SubscriptionDTO } from "./subscriptionApi";

export type VnPayUrlResponse =
  | string
  | {
      url?: string;
      paymentUrl?: string;
      data?: string;
    };

export interface BillingRecordDTO {
  billingId: string;
  userId?: string;
  user?: UserMinimalDTO | null;
  subscriptionId?: string;
  subscription?: SubscriptionDTO | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  paidAt?: string | null;
  paymentMethod?: string | null;
  paymentGateway?: string | null;
  transactionId?: string | null;
  status: string;
  invoiceUrl?: string | null;
  notes?: string | null;
}

export interface BillingHistoryResponse {
  userName?: string | null;
  email?: string | null;
  remainSubscriptionDays: number;
  totalMoneySpent: number;
  subscriptionName?: string | null;
  subscriptionPrice: number;
  subscriptionDurationDays: number;
  subscriptionEndDate?: string | null;
  billingHistory: PaginatedResult<BillingRecordDTO>;
}

export interface BillingHistoryQuery {
  query?: string;
  ascOrder?: boolean | null;
  page?: number;
  pageSize?: number;
}

export const billingApi = {
  getMyHistory(query: BillingHistoryQuery = {}) {
    return apiRequest<BillingHistoryResponse>("/User/billing-history/me", {
      query: {
        page: 1,
        pageSize: 10,
        ...query,
      },
    });
  },

  getUserHistory(userId: string, query: BillingHistoryQuery = {}) {
    return apiRequest<BillingHistoryResponse>(`/User/billing-history/${userId}`, {
      query: {
        page: 1,
        pageSize: 5,
        ...query,
      },
    });
  },

  queryAll(query: BillingHistoryQuery = {}) {
    return apiRequest<PaginatedResult<BillingRecordDTO>>(
      "/User/billing-history-query",
      {
        query: {
          page: 1,
          pageSize: 10,
          ...query,
        },
      },
    );
  },

  createVnPayUrl(subscriptionId: string) {
    return apiRequest<VnPayUrlResponse>("/VNPay/create-payment-url", {
      query: { subscriptionId },
    });
  },
};
