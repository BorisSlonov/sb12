import { YooCheckout } from "@a2seven/yoo-checkout";

const moneyFromInt = (amount: number) => (amount / 100).toFixed(2);

export default {
  // Recurring charges: every hour at minute 5
  '5 * * * *': async ({ strapi }) => {
    try {
      const shopId = process.env.YK_SHOP_ID;
      const secretKey = process.env.YK_SECRET_KEY;
      if (!shopId || !secretKey) return;
      const checkout = new YooCheckout({ shopId, secretKey });

      const soon = new Date(Date.now() + 1000 * 60 * 60); // next hour
      const due = (await strapi.entityService.findMany('api::subscription.subscription', {
        filters: { status: 'active', current_period_end: { $lte: soon.toISOString() } },
        populate: { customer: true, plan: true },
        limit: 100,
      })) as any[];

      for (const sub of due) {
        const pmId = sub.yk_payment_method_id;
        const customer = sub.customer; const plan = sub.plan;
        if (!pmId || !plan) continue;
        const idempotenceKey = `${sub.id}-${Date.now()}`;
        try {
          const payment = await checkout.createPayment({
            amount: { value: moneyFromInt(plan.amount), currency: plan.currency || 'RUB' },
            capture: true,
            description: `Recurring charge for ${plan.name}`,
            payment_method_id: pmId,
            metadata: { subscription_id: String(sub.id) },
          } as any, idempotenceKey);

          if (payment.status === 'succeeded') {
            const next = new Date();
            next.setMonth(next.getMonth() + 1);
            await strapi.entityService.update('api::subscription.subscription', sub.id, {
              data: { current_period_end: next.toISOString(), yk_last_payment_id: payment.id } as any,
            });

            const botToken = process.env.BOT_TOKEN;
            if (botToken && customer?.telegram_id) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: Number(customer.telegram_id), text: 'Подписка успешно продлена на месяц.' })
              });
            }
          } else if (payment.status === 'canceled') {
            await strapi.entityService.update('api::subscription.subscription', sub.id, { data: { status: 'past_due' } as any });
            const botToken = process.env.BOT_TOKEN;
            if (botToken && customer?.telegram_id) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: Number(customer.telegram_id), text: 'Не удалось списать оплату. Пожалуйста, обновите способ оплаты.' })
              });
            }
          }
        } catch (err) {
          strapi.log.error('Recurring charge failed', err);
        }
      }
    } catch (e) { /* ignore */ }
  },

  // Trial reminder ~24h before first charge
  '10 * * * *': async ({ strapi }) => {
    try {
      const botToken = process.env.BOT_TOKEN;
      if (!botToken) return;
      const now = new Date();
      const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const subs = (await strapi.entityService.findMany('api::subscription.subscription', {
        filters: { status: 'active', trial_ends_at: { $lte: in24h.toISOString(), $gt: now.toISOString() }, trial_reminder_sent: false },
        populate: { customer: true, plan: true },
        limit: 100,
      })) as any[];
      for (const sub of subs) {
        const customer = sub.customer; const plan = sub.plan;
        if (!customer?.telegram_id || !plan) continue;
        const amount = (plan.amount/100).toFixed(2);
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: Number(customer.telegram_id), text: `Напоминаем: через 24 часа спишем ${amount} RUB за месяц доступа. Отменить можно командой /cancel.` })
        });
        await strapi.entityService.update('api::subscription.subscription', sub.id, { data: { trial_reminder_sent: true } as any });
      }
    } catch (e) { /* ignore */ }
  },
};
