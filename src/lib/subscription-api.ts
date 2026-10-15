import { axiosInstance } from './axios';

// Enums matching backend
export enum PlanId {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentProvider {
  MOMO = 'momo',
  STRIPE = 'stripe',
  PESAPAL = 'pesapal',
  MANUAL = 'manual',
}

// Types
export interface PlanFeatures {
  maxProjects: number;
  maxUsers: number;
  storageGB: number;
  canCreateTenders: boolean;
  canAccessBidding: boolean;
  canCreateInvoices: boolean;
  hasAdvancedReporting: boolean;
  hasBudgetThresholdAlerts: boolean;
  hasApiAccess: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  features: PlanFeatures;
}

export interface SubscriptionStatus {
  isActive: boolean;
  plan: PlanId;
  status: string;
  startDate?: string;
  endDate?: string;
  daysRemaining?: number;
  canRenew: boolean;
  canUpgrade: boolean;
}

export interface Payment {
  _id: string;
  userId?: string;
  companyId?: string;
  planId: PlanId;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerReferenceId: string;
  providerTransactionId?: string;
  providerOrderTrackingId?: string; // Added for Pesapal
  status: PaymentStatus;
  phoneNumber?: string;
  failureReason?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiatePaymentRequest {
  planId: PlanId;
  phoneNumber?: string;
  companyId?: string;
  enableRecurring?: boolean;
}

export interface InitiatePaymentResponse {
  paymentId: string;
  referenceId: string;
  status: PaymentStatus;
  message: string;
  redirectUrl?: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: PaymentStatus;
  planId: PlanId;
  amount: number;
  paidAt?: string;
  failureReason?: string;
  message?: string;
}

export interface PesapalPaymentMethod {
  id: string;
  name: string;
  type: string;
  currencies: string[];
}

export interface PesapalPaymentMethodsResponse {
  payment_methods: PesapalPaymentMethod[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// API Functions
export const subscriptionApi = {
  // Get all available plans
  getPlans: async (): Promise<Plan[]> => {
    const response = await axiosInstance.get<ApiResponse<Plan[]>>('/subscriptions/plans');
    return response.data.data;
  },

  // Get current subscription status
  getSubscriptionStatus: async (companyId?: string): Promise<SubscriptionStatus> => {
    const params = companyId ? { companyId } : {};
    const response = await axiosInstance.get<ApiResponse<SubscriptionStatus>>(
      '/subscriptions/status',
      { params }
    );
    return response.data.data;
  },

  // Initiate payment via Pesapal
  initiatePayment: async (data: InitiatePaymentRequest): Promise<InitiatePaymentResponse> => {
    const response = await axiosInstance.post<ApiResponse<InitiatePaymentResponse>>(
      '/subscriptions/payment/initiate',
      data
    );
    return response.data.data;
  },

  // Check payment status
  checkPaymentStatus: async (paymentId: string): Promise<PaymentStatusResponse> => {
    const response = await axiosInstance.get<ApiResponse<PaymentStatusResponse>>(
      `/subscriptions/payment/${paymentId}/status`
    );
    return response.data.data;
  },

  // Get payment history
  getPaymentHistory: async (companyId?: string): Promise<Payment[]> => {
    const params = companyId ? { companyId } : {};
    const response = await axiosInstance.get<ApiResponse<Payment[]>>(
      '/subscriptions/payment/history',
      { params }
    );
    return response.data.data;
  },

  // Get Pesapal payment methods
  getPesapalPaymentMethods: async (): Promise<PesapalPaymentMethodsResponse> => {
    const response = await axiosInstance.get<ApiResponse<PesapalPaymentMethodsResponse>>(
      '/subscriptions/pesapal/payment-methods'
    );
    return response.data.data;
  },

  // Get Pesapal transaction status
  getPesapalTransactionStatus: async (orderTrackingId: string): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>(
      `/subscriptions/pesapal/transaction/${orderTrackingId}`
    );
    return response.data.data;
  },

  // Reconcile pending payments (admin only)
  reconcilePendingPayments: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.post<ApiResponse<{ message: string }>>(
      '/subscriptions/payments/reconcile'
    );
    return response.data.data;
  },

  // Cancel a pending payment (user cancelled or abandoned)
  cancelPayment: async (paymentId: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.post<ApiResponse<{ success: boolean; message: string }>>(
      `/subscriptions/payment/${paymentId}/cancel`
    );
    return response.data.data;
  },

  // Request pre-approval (maintained for backward compatibility)
  requestPreApproval: async (phoneNumber: string): Promise<{ referenceId: string }> => {
    const response = await axiosInstance.post<ApiResponse<{ referenceId: string }>>(
      '/subscriptions/pre-approval/request',
      { phoneNumber }
    );
    return response.data.data;
  },

  // Check pre-approval status (maintained for backward compatibility)
  checkPreApprovalStatus: async (referenceId: string): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>(
      `/subscriptions/pre-approval/${referenceId}/status`
    );
    return response.data.data;
  },

  // Dev only: manually set plan
  manuallySetPlan: async (
    planId: PlanId,
    options: { userId?: string; companyId?: string }
  ): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.post<ApiResponse<{ success: boolean; message: string }>>(
      '/subscriptions/set-plan-manually',
      { planId, ...options }
    );
    return response.data.data;
  },
};

// Helper: Poll payment status until complete
export const pollPaymentStatus = (
  paymentId: string,
  onUpdate: (status: PaymentStatusResponse) => void,
  onComplete?: (status: PaymentStatusResponse) => void,
  intervalMs = 3000,
  maxAttempts = 60
): { stop: () => void } => {
  let attempts = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped || attempts >= maxAttempts) {
      if (attempts >= maxAttempts && !stopped) {
        onUpdate({
          paymentId,
          status: PaymentStatus.FAILED,
          planId: PlanId.BASIC,
          amount: 0,
          failureReason: 'Payment status check timed out',
          message: 'Payment verification timed out. Please check your subscription status.',
        });
      }
      return;
    }

    attempts++;
    try {
      const status = await subscriptionApi.checkPaymentStatus(paymentId);
      onUpdate(status);

      if (status.status === PaymentStatus.PENDING || status.status === PaymentStatus.PROCESSING) {
        setTimeout(poll, intervalMs);
      } else if (onComplete) {
        onComplete(status);
      }
    } catch (error) {
      console.error('Payment status poll error:', error);
      if (!stopped && attempts < maxAttempts) {
        setTimeout(poll, intervalMs);
      } else if (onComplete) {
        onComplete({
          paymentId,
          status: PaymentStatus.FAILED,
          planId: PlanId.BASIC,
          amount: 0,
          failureReason: 'Failed to check payment status',
          message: 'Unable to verify payment status. Please contact support.',
        });
      }
    }
  };

  poll();

  return {
    stop: () => {
      stopped = true;
    },
  };
};

// Helper: Get plan display info
export const getPlanDisplayInfo = (planId: PlanId): { color: string; badge: string; icon: string } => {
  switch (planId) {
    case PlanId.ENTERPRISE:
      return { color: 'purple', badge: 'Enterprise', icon: '🏢' };
    case PlanId.PROFESSIONAL:
      return { color: 'blue', badge: 'Professional', icon: '💼' };
    case PlanId.BASIC:
    default:
      return { color: 'gray', badge: 'Basic', icon: '🚀' };
  }
};

// Helper: Get payment provider display name
export const getPaymentProviderName = (provider: PaymentProvider): string => {
  switch (provider) {
    case PaymentProvider.PESAPAL:
      return 'Pesapal';
    case PaymentProvider.MOMO:
      return 'Mobile Money';
    case PaymentProvider.STRIPE:
      return 'Stripe';
    case PaymentProvider.MANUAL:
      return 'Manual';
    default:
      return provider;
  }
};

// Helper: Format payment status for display
export const getPaymentStatusDisplay = (status: PaymentStatus): { label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'default' } => {
  switch (status) {
    case PaymentStatus.SUCCESSFUL:
      return { label: 'Successful', variant: 'success' };
    case PaymentStatus.FAILED:
      return { label: 'Failed', variant: 'danger' };
    case PaymentStatus.PENDING:
      return { label: 'Pending', variant: 'warning' };
    case PaymentStatus.PROCESSING:
      return { label: 'Processing', variant: 'info' };
    case PaymentStatus.CANCELLED:
      return { label: 'Cancelled', variant: 'default' };
    case PaymentStatus.REFUNDED:
      return { label: 'Refunded', variant: 'default' };
    default:
      return { label: status, variant: 'default' };
  }
};

// Helper: Check if payment is in a terminal state
export const isPaymentTerminal = (status: PaymentStatus): boolean => {
  return [
    PaymentStatus.SUCCESSFUL,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.REFUNDED,
  ].includes(status);
};

// Helper: Check if payment is in progress
export const isPaymentInProgress = (status: PaymentStatus): boolean => {
  return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(status);
};