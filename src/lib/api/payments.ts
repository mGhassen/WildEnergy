import { apiRequest } from '@/lib/queryClient';

export interface Payment {
  id: number;
  subscription_id: number;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  status: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
  subscription?: {
    id: number;
    user: {
      full_name: string;
      email: string;
    };
    plan: {
      name: string;
    };
  };
}

export interface CreatePaymentData {
  subscription_id: number;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  status?: string;
  payment_date: string;
}

export interface UpdatePaymentData {
  amount?: number;
  payment_method?: string;
  payment_reference?: string;
  status?: string;
  payment_date?: string;
}

export const paymentApi = {
  async getPayments(): Promise<Payment[]> {
    return apiRequest('GET', '/api/admin/payments');
  },

  async getPayment(paymentId: number): Promise<Payment> {
    return apiRequest('GET', `/api/admin/payments/${paymentId}`);
  },

  async createPayment(data: CreatePaymentData): Promise<Payment> {
    return apiRequest('POST', '/api/admin/payments', data);
  },

  async updatePayment(paymentId: number, data: UpdatePaymentData): Promise<Payment> {
    return apiRequest('PUT', `/api/admin/payments/${paymentId}`, data);
  },

  async deletePayment(paymentId: number): Promise<void> {
    return apiRequest('DELETE', `/api/admin/payments/${paymentId}`);
  },

  async getMemberPayments(): Promise<Payment[]> {
    return apiRequest('GET', '/api/member/payments');
  }
};
