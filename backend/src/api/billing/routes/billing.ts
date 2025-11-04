export default {
  routes: [
    {
      method: 'POST',
      path: '/billing/create-payment',
      handler: 'billing.createPayment',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/billing/webhook',
      handler: 'billing.webhook',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/billing/plans',
      handler: 'billing.listPlans',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/billing/resend-invite',
      handler: 'billing.resendInvite',
      config: { auth: false },
    },
  ],
};
