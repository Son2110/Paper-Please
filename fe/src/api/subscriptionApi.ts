import { apiRequest } from "./httpClient";
import type { UserMinimalDTO } from "./activityLogApi";
import type { PaginatedResult } from "./adminUserApi";

export interface SubscriptionDTO {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  type?: string | null;
  rewardPoints?: number | null;
  durationDays?: number | null;
  isActive?: boolean | null;
  pointsCost?: number | null;
  maxOrganizations?: number | null;
  maxOrganizationUsers?: number | null;
  maxStorageBytes?: number | null;
  sortOrder?: number | null;
  features?: SubscriptionFeatureDTO[] | null;
}

export interface SubscriptionFeatureDTO {
  id?: string;
  subscriptionId?: string;
  featureCode?: string | number;
  enabled?: boolean;
}

export interface SubscriptionCreateRequest {
  name: string;
  description?: string | null;
  price: number;
  type: string;
  durationDays?: number | null;
  pointsCost?: number | null;
  rewardPoints: number;
  isActive?: boolean | null;
  maxOrganizations?: number | null;
  maxOrganizationUsers?: number | null;
  maxStorageBytes?: number | null;
  sortOrder?: number | null;
}

export interface SubscriptionUpdateRequest extends Partial<SubscriptionCreateRequest> {
  id: string;
}

export interface Subscriber {
  user: UserMinimalDTO;
  subscriptionName: string;
}

export interface SubscriberBySubscription {
  subscriptionName: string;
  numberOfSubscriber: number;
}

export interface MostPopularTier extends SubscriberBySubscription {
  percentage: number;
}

export interface SubscriptionDashboardResponse {
  subscriptionRevenue: number;
  subscriptionRevenueFluct?: number | null;
  subscriber: number;
  subscriberFluct?: number | null;
  newSubscriber: number;
  newSubscriberFluct?: number | null;
  quitSubscriber: number;
  quitSubscriberFluct?: number | null;
  subscriberBySubscriptionsFluct?: number | null;
  recentSubscribers: Subscriber[];
  subscriberBySubscriptions: SubscriberBySubscription[];
  mostPopularTier: MostPopularTier;
}

export interface SubscriptionDetailResponse {
  userId?: string | null;
  user?: string | null;
  plan?: string | null;
  price: number;
  duration?: number | null;
  subscribedOn?: string | null;
  originalEndDate?: string | null;
  expiriesOn?: string | null;
  dayRemaining: number;
}

export interface UserSubscriptionDTO {
  userId?: string | null;
  subscriptionId?: string | null;
  subscription?: SubscriptionDTO | null;
  startDate?: string | null;
  endDate?: string | null;
  renewalDate?: string | null;
  originalEndDate?: string | null;
  autoRenew?: boolean | null;
}

export interface SubscriberQuery {
  query?: string;
  page?: number;
  pageSize?: number;
}

export const subscriptionApi = {
  getAll() {
    return apiRequest<SubscriptionDTO[]>("/Subscription");
  },

  getActive() {
    return apiRequest<SubscriptionDTO[]>("/Subscription/active");
  },

  getMine() {
    return apiRequest<UserSubscriptionDTO | null>("/Subscription/me");
  },

  getById(id: string) {
    return apiRequest<SubscriptionDTO>(`/Subscription/${id}`);
  },

  getDashboard() {
    return apiRequest<SubscriptionDashboardResponse>("/Subscription/dashboard");
  },

  getSubscribers(query: SubscriberQuery = {}) {
    const { query: searchQuery, ...paging } = query;

    if (searchQuery?.trim()) {
      return apiRequest<PaginatedResult<SubscriptionDetailResponse>>(
        "/Subscription/query",
        {
          query: {
            query: searchQuery.trim(),
            page: 1,
            pageSize: 10,
            ...paging,
          },
        },
      );
    }

    return apiRequest<PaginatedResult<SubscriptionDetailResponse>>(
      "/Subscription/dashboard-get-subscribers",
      {
        query: {
          page: 1,
          pageSize: 10,
          ...paging,
        },
      },
    );
  },

  getNewSubscribers(query: Omit<SubscriberQuery, "query"> = {}) {
    return apiRequest<PaginatedResult<SubscriptionDetailResponse>>(
      "/Subscription/dashboard-get-new-subscribers",
      {
        query: {
          page: 1,
          pageSize: 10,
          ...query,
        },
      },
    );
  },

  getQuitSubscribers(query: Omit<SubscriberQuery, "query"> = {}) {
    return apiRequest<PaginatedResult<SubscriptionDetailResponse>>(
      "/Subscription/dashboard-get-quit-subscribers",
      {
        query: {
          page: 1,
          pageSize: 10,
          ...query,
        },
      },
    );
  },

  getSubscribersBySubscription(query: Omit<SubscriberQuery, "query"> = {}) {
    return apiRequest<PaginatedResult<SubscriptionDetailResponse>[]>(
      "/Subscription/dashboard-get-subscribers-by-subscription",
      {
        query: {
          page: 1,
          pageSize: 10,
          ...query,
        },
      },
    );
  },

  getRecentSubscribersWithinPeriod(
    period: number,
    query: Omit<SubscriberQuery, "query"> = {},
  ) {
    return apiRequest<PaginatedResult<Subscriber>>(
      "/Subscription/dashboard-get-recent-subscribers-within-period",
      {
        query: {
          period,
          page: 1,
          pageSize: 10,
          ...query,
        },
      },
    );
  },

  create(request: SubscriptionCreateRequest) {
    return apiRequest<SubscriptionDTO>("/Subscription/create", {
      method: "POST",
      body: request,
    });
  },

  update(request: SubscriptionUpdateRequest) {
    return apiRequest<SubscriptionDTO>("/Subscription/update", {
      method: "PUT",
      body: request,
    });
  },

  delete(id: string) {
    return apiRequest<SubscriptionDTO>(`/Subscription/delete/${id}`, {
      method: "DELETE",
    });
  },

  cancelMine() {
    return apiRequest<unknown>("/Subscription/me", {
      method: "DELETE",
    });
  },

  giveSubscription(userId: string, subscriptionId: string) {
    return apiRequest<unknown>("/Subscription/give-subscription", {
      method: "POST",
      query: { userId, subscriptionId },
    });
  },

  refreshAllStatus() {
    return apiRequest<unknown>("/Subscription/refresh-all-status", {
      method: "POST",
    });
  },

  getExpiringSoon(days = 3) {
    return apiRequest<unknown>("/Subscription/expiring-soon", {
      query: { days },
    });
  },

  emailExpiringSoon(days = 3) {
    return apiRequest<unknown>("/Subscription/email-expiring-soon", {
      query: { days },
    });
  },
};
