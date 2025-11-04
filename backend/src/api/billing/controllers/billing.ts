import { Context } from "koa";
import { factories } from "@strapi/strapi";
import { YooCheckout, type Payment, type ICreatePayment } from "@a2seven/yoo-checkout";

const getCheckout = () => {
  const shopId = process.env.YK_SHOP_ID;
  const secretKey = process.env.YK_SECRET_KEY;
  if (!shopId || !secretKey) {
    throw new Error("YooKassa credentials are not configured");
  }
  return new YooCheckout({ shopId, secretKey });
};

const ensureBotAuth = (ctx: Context) => {
  const header = ctx.request.headers["authorization"] || "";
  const expected = `Bearer ${process.env.STRAPI_BOT_API_TOKEN ?? ""}`;
  if (!process.env.STRAPI_BOT_API_TOKEN || header !== expected) {
    ctx.throw(401, "Unauthorized");
  }
};

const moneyFromInt = (amount: number) => (amount / 100).toFixed(2);

export default factories.createCoreController("api::billing.billing", ({ strapi }) => ({
  async createPayment(ctx: Context) {
    ensureBotAuth(ctx);
    const { planId, telegramId, username, first_name, last_name } = ctx.request.body as any;
    if (!planId || !telegramId) {
      ctx.throw(400, "planId and telegramId are required");
    }

    const plan = await strapi.entityService.findOne("api::plan.plan", planId);
    if (!plan || !plan.active) {
      ctx.throw(404, "Plan not found or inactive");
    }
    const planAny: any = plan as any;

    const [customer] = (await strapi.entityService.findMany("api::customer.customer", {
      filters: { telegram_id: telegramId },
      limit: 1,
    })) as any[];

    let customerId = customer?.id;
    let ykCustomerId = customer?.yk_customer_id;
    let accepted = customer?.accepted_terms;
    if (!customerId) {
      const created = await strapi.entityService.create("api::customer.customer", {
        data: {
          telegram_id: telegramId,
          username,
          first_name,
          last_name,
          yk_customer_id: `tg_${telegramId}`,
          accepted_terms: false,
        } as any,
      });
      customerId = created.id;
      ykCustomerId = created.yk_customer_id;
      accepted = (created as any).accepted_terms;
    } else if (!ykCustomerId) {
      ykCustomerId = `tg_${telegramId}`;
      await strapi.entityService.update("api::customer.customer", customerId, { data: { yk_customer_id: ykCustomerId } as any });
    }

    if (!accepted) {
      ctx.throw(400, "accept_terms_required");
    }

    const existingSubs = (await strapi.entityService.findMany("api::subscription.subscription", {
      filters: { customer: { id: Number(customerId) }, plan: { id: Number(planId) } },
      limit: 1,
    })) as any[];
    const isFirstForPlan = !existingSubs?.length;

    const idempotenceKey = `${telegramId}-${planId}-${Date.now()}`;

    const checkout = getCheckout();

    const chargeAmount = isFirstForPlan && planAny.trial_days > 0 && planAny.trial_amount > 0 ? planAny.trial_amount : planAny.amount;

    const createPayload: ICreatePayment = {
      amount: { value: moneyFromInt(chargeAmount), currency: planAny.currency || "RUB" },
      capture: true,
      description: `Subscription for ${planAny.name}`,
      save_payment_method: true,
      confirmation: {
        type: "redirect",
        return_url: process.env.RETURN_URL || "https://t.me/" + (process.env.BOT_USERNAME || "")
      },
      metadata: {
        telegram_id: String(telegramId),
        plan_id: String(planId),
        customer_id: String(customerId),
        trial: String(isFirstForPlan && planAny.trial_days > 0 && planAny.trial_amount > 0),
      } as any,
    };

    const payment: Payment = await checkout.createPayment(createPayload, idempotenceKey);

    ctx.body = { confirmation_url: (payment.confirmation as any)?.confirmation_url, payment_id: payment.id };
  },

  async webhook(ctx: Context) {
    // Optional basic auth for webhook
    const user = process.env.YK_WEBHOOK_USER;
    const pass = process.env.YK_WEBHOOK_PASSWORD;
    if (user || pass) {
      const auth = ctx.request.headers["authorization"] || "";
      const expected = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
      if (auth !== expected) return ctx.throw(401, "Unauthorized");
    }

    const event = ctx.request.body?.event;
    const object = ctx.request.body?.object;
    if (!event || !object) return ctx.throw(400, "Invalid payload");

    if (event === "payment.succeeded") {
      const paymentId = object.id as string;
      const telegramId = object.metadata?.telegram_id;
      const planId = object.metadata?.plan_id;
      const customerId = object.metadata?.customer_id;

      const checkout = getCheckout();
      // Verify payment by fetching from YooKassa
      const payment = await checkout.getPayment(paymentId);
      if (payment.status !== "succeeded") {
        ctx.body = { ok: true };
        return;
      }

      // Ensure subscription exists and update
      const plan = await strapi.entityService.findOne("api::plan.plan", Number(planId));
      if (!plan) return (ctx.body = { ok: true });
      const planAny: any = plan as any;

      // Enforce single active subscription per customer
      const activeSubs = (await strapi.entityService.findMany("api::subscription.subscription", {
        filters: { customer: { id: Number(customerId) }, status: 'active' },
        sort: { id: 'desc' } as any,
        limit: 100,
      })) as any[];
      const subscription = activeSubs?.[0];

      const now = new Date();
      const next = new Date(now.getTime());
      const isTrialPayment = String(object?.metadata?.trial) === 'true';
      if (isTrialPayment && planAny.trial_days && planAny.trial_days > 0) {
        next.setDate(next.getDate() + Number(planAny.trial_days));
      } else {
        next.setMonth(next.getMonth() + 1);
      }

      let targetSubId: number | undefined;

      if (!subscription) {
        const created = await strapi.entityService.create("api::subscription.subscription", {
          data: {
            customer: Number(customerId),
            plan: Number(planId),
            status: "active",
            current_period_end: next.toISOString(),
            yk_payment_method_id: (payment.payment_method as any)?.id,
            yk_last_payment_id: payment.id,
            trial_ends_at: isTrialPayment ? next.toISOString() : null,
            trial_reminder_sent: false,
          } as any,
        });
        targetSubId = (created as any).id;
      } else {
        await strapi.entityService.update("api::subscription.subscription", subscription.id, {
          data: {
            status: "active",
            current_period_end: next.toISOString(),
            yk_payment_method_id: (payment.payment_method as any)?.id ?? subscription.yk_payment_method_id,
            yk_last_payment_id: payment.id,
            trial_ends_at: isTrialPayment ? next.toISOString() : subscription.trial_ends_at,
            trial_reminder_sent: isTrialPayment ? false : subscription.trial_reminder_sent,
            plan: Number(planId),
          } as any,
        });
        targetSubId = subscription.id;
      }

      // Cancel other active subs of this customer (if exist)
      try {
        await Promise.all(
          (activeSubs || [])
            .filter((s: any) => typeof targetSubId === 'number' ? s.id !== targetSubId : true)
            .map((s: any) => strapi.entityService.update('api::subscription.subscription', s.id, { data: { status: 'canceled' } as any }))
        );
      } catch (e) {
        strapi.log.warn('Failed to cancel extra active subscriptions', e);
      }

      // Send invite link and message via Telegram
      try {
        const channelId = process.env.CHANNEL_ID || planAny.channel_id;
        const botToken = process.env.BOT_TOKEN;
        if (botToken && channelId && telegramId) {
          const expire = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h
          const linkRes = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: channelId, expire_date: expire, member_limit: 1, creates_join_request: false })
          });
          const linkJson: any = await linkRes.json();
          const inviteLink = linkJson?.result?.invite_link;

          const text = inviteLink
            ? `Оплата прошла успешно! Ваша подписка активна. Вступайте в канал: ${inviteLink}`
            : `Оплата прошла успешно! Ваша подписка активна.`;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: Number(telegramId), text })
          });
        }
      } catch (e) {
        strapi.log.error("Failed to send Telegram invite", e);
      }
    }

    ctx.body = { ok: true };
  },

  async listPlans(ctx: Context) {
    const plans = await strapi.entityService.findMany("api::plan.plan", { filters: { active: true }, sort: { amount: "asc" } as any });
    ctx.body = (plans as any[]).map((p: any) => ({ id: p.id, name: p.name, amount: p.amount, currency: p.currency, interval: p.interval, description: p.description, trial_days: p.trial_days, trial_amount: p.trial_amount }));
  },

  async resendInvite(ctx: Context) {
    ensureBotAuth(ctx);
    const { telegramId } = ctx.request.body as any;
    if (!telegramId) return ctx.throw(400, 'telegramId required');

    const [customer] = (await strapi.entityService.findMany("api::customer.customer", {
      filters: { telegram_id: Number(telegramId) },
      limit: 1,
    })) as any[];
    if (!customer) return ctx.throw(404, 'Customer not found');

    const [sub] = (await strapi.entityService.findMany("api::subscription.subscription", {
      filters: { customer: { id: customer.id }, status: 'active' },
      sort: { id: 'desc' } as any,
      limit: 1,
      populate: { plan: true },
    })) as any[];
    if (!sub?.plan) return ctx.throw(404, 'Active subscription not found');

    const channelId = process.env.CHANNEL_ID || sub.plan.channel_id;
    const botToken = process.env.BOT_TOKEN;
    if (!botToken || !channelId) return ctx.throw(500, 'Bot not configured');

    const expire = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h
    const linkRes = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId, expire_date: expire, member_limit: 1, creates_join_request: false })
    });
    const linkJson: any = await linkRes.json();
    const inviteLink = linkJson?.result?.invite_link;

    ctx.body = { invite_link: inviteLink };
  }
}));

