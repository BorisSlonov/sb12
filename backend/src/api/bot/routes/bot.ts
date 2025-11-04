export default {
  routes: [
    { method: 'POST', path: '/bot/register', handler: 'bot.register', config: { auth: false } },
    { method: 'GET', path: '/bot/status', handler: 'bot.status', config: { auth: false } },
    { method: 'POST', path: '/bot/cancel', handler: 'bot.cancel', config: { auth: false } },
    { method: 'POST', path: '/bot/accept-terms', handler: 'bot.acceptTerms', config: { auth: false } },
  ],
};
