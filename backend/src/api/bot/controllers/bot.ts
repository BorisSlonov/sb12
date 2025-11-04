import { Context } from 'koa';
import { factories } from '@strapi/strapi';

const ensureBotAuth = (ctx: Context) => {
  const header = ctx.request.headers['authorization'] || '';
  const expected = `Bearer ${process.env.STRAPI_BOT_API_TOKEN ?? ''}`;
  if (!process.env.STRAPI_BOT_API_TOKEN || header !== expected) {
    ctx.throw(401, 'Unauthorized');
  }
};

export default factories.createCoreController('api::bot.bot', ({ strapi }) => ({
  async register(ctx: Context) {
    ensureBotAuth(ctx);
    const { telegramId, username, first_name, last_name } = ctx.request.body as any;
    if (!telegramId) return ctx.throw(400, 'telegramId required');

    const [existing] = (await strapi.entityService.findMany('api::customer.customer', {
      filters: { telegram_id: telegramId },
      limit: 1,
    })) as any[];

    if (!existing) {
      const created = await strapi.entityService.create('api::customer.customer', {
        data: {
          telegram_id: telegramId,
          username,
          first_name,
          last_name,
          yk_customer_id: `tg_${telegramId}`,
        } as any,
      });
      ctx.body = { ok: true, created: true, customer_id: created.id };
    } else {
      await strapi.entityService.update('api::customer.customer', existing.id, {
        data: { username, first_name, last_name } as any,
      });
      ctx.body = { ok: true, created: false, customer_id: existing.id };
    }
  },

  async status(ctx: Context) {
    ensureBotAuth(ctx);
    const telegramId = ctx.request.query.telegramId as string;
    if (!telegramId) return ctx.throw(400, 'telegramId required');

    const [customer] = (await strapi.entityService.findMany('api::customer.customer', {
      filters: { telegram_id: telegramId },
      limit: 1,
    })) as any[];

    if (!customer) {
      ctx.body = { has_customer: false, has_subscription: false };
      return;
    }

    const subs = (await strapi.entityService.findMany('api::subscription.subscription', {
      filters: { customer: { id: customer.id } },
      sort: { id: 'desc' } as any,
      limit: 1,
      populate: { plan: true },
    })) as any[];

    const sub = subs?.[0];
    if (!sub) {
      ctx.body = { has_customer: true, has_subscription: false };
      return;
    }

    const now = Date.now();
    const end = sub.current_period_end ? Date.parse(sub.current_period_end) : undefined;
    const isActive = sub.status === 'active' && !!end && end > now;

    ctx.body = {
      has_customer: true,
      has_subscription: true,
      subscription: {
        id: sub.id,
        status: sub.status,
        current_period_end: sub.current_period_end,
        is_active: isActive,
        plan: sub.plan ? { id: sub.plan.id, name: sub.plan.name, amount: sub.plan.amount, currency: sub.plan.currency } : undefined,
      },
    };
  },

  async cancel(ctx: Context) {
    ensureBotAuth(ctx);
    const { telegramId } = ctx.request.body as any;
    if (!telegramId) return ctx.throw(400, 'telegramId required');

    const [customer] = (await strapi.entityService.findMany('api::customer.customer', {
      filters: { telegram_id: telegramId },
      limit: 1,
    })) as any[];

    if (!customer) return (ctx.body = { ok: true });

    const subs = (await strapi.entityService.findMany('api::subscription.subscription', {
      filters: { customer: { id: customer.id }, status: 'active' },
      sort: { id: 'desc' } as any,
      limit: 1,
    })) as any[];

    const sub = subs?.[0];
    if (!sub) return (ctx.body = { ok: true });

    await strapi.entityService.update('api::subscription.subscription', sub.id, { data: { status: 'canceled' } as any });
    ctx.body = { ok: true };
  },

  async acceptTerms(ctx: Context) {
    ensureBotAuth(ctx);
    const { telegramId } = ctx.request.body as any;
    if (!telegramId) return ctx.throw(400, 'telegramId required');
    const [customer] = (await strapi.entityService.findMany('api::customer.customer', { filters: { telegram_id: Number(telegramId) }, limit: 1 })) as any[];
    if (!customer) return ctx.throw(404, 'Customer not found');
    await strapi.entityService.update('api::customer.customer', customer.id, { data: { accepted_terms: true, accepted_terms_at: new Date().toISOString() } as any });
    ctx.body = { ok: true };
  },
}));
