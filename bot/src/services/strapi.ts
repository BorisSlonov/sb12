import { fetchJSON } from '../lib/http';

export interface Plan {
  id: number;
  name: string;
  amount: number;
  currency: string;
  interval?: string;
  description?: string;
  trial_days?: number;
  trial_amount?: number;
}

export interface SubscriptionPlan { id: number; name: string; amount: number; currency: string; }
export interface SubscriptionData {
  id: number;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  current_period_end?: string;
  is_active?: boolean;
  plan?: SubscriptionPlan;
}

export interface StatusResponse {
  has_customer: boolean;
  has_subscription: boolean;
  subscription?: SubscriptionData;
}

export const Strapi = {
  listPlans: async (): Promise<Plan[]> => fetchJSON('/api/billing/plans'),

  createPayment: async (payload: {
    planId: number;
    telegramId: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  }): Promise<{ confirmation_url: string; payment_id: string } | { error?: string }> =>
    fetchJSON('/api/billing/create-payment', {
      method: 'POST', body: JSON.stringify(payload)
    }),

  resendInvite: async (telegramId: number): Promise<{ invite_link?: string }> =>
    fetchJSON('/api/billing/resend-invite', {
      method: 'POST', body: JSON.stringify({ telegramId })
    }),

  registerUser: async (payload: { telegramId: number; username?: string; first_name?: string; last_name?: string; }): Promise<{ ok: boolean }> =>
    fetchJSON('/api/bot/register', {
      method: 'POST', body: JSON.stringify(payload)
    }),

  status: async (telegramId: number): Promise<StatusResponse> =>
    fetchJSON(`/api/bot/status?telegramId=${telegramId}`),

  acceptTerms: async (telegramId: number): Promise<{ ok: boolean }> =>
    fetchJSON('/api/bot/accept-terms', {
      method: 'POST', body: JSON.stringify({ telegramId })
    }),

  cancel: async (telegramId: number): Promise<{ ok: boolean }> =>
    fetchJSON('/api/bot/cancel', {
      method: 'POST', body: JSON.stringify({ telegramId })
    }),
};
