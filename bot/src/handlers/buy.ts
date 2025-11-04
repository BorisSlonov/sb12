import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { Strapi } from '../services/strapi';
import { HttpError } from '../lib/http';
import { showTerms } from './terms';
import { texts } from '../ui/texts';
import { formatMoney, pluralDays } from '../ui/format';

export const onBuy = async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match as RegExpExecArray | undefined;
  const planId = Number(match?.[1]);
  const plans = await Strapi.listPlans();
  const p = plans.find((x) => x.id === planId);
  if (!p) return ctx.reply('Тариф не найден.');

  const trialDays = Number(p.trial_days || 0);
  const hasTrial = !!p.trial_amount && p.trial_amount > 0 && trialDays > 0;
  const firstCharge = hasTrial ? `${formatMoney(p.trial_amount!, p.currency)}` : `${formatMoney(p.amount, p.currency)}`;
  const period = hasTrial ? `${pluralDays(trialDays)}` : 'сегодня';
  const nextCharge = `${formatMoney(p.amount, p.currency)}`;

  const msg = texts.confirmPlan(p.name, firstCharge, period, nextCharge);
  const kb = new InlineKeyboard().text('✅ Оплатить', `pay:${p.id}`).text('✖️ Отмена', 'cancel_buy');
  await ctx.reply(msg, { reply_markup: kb });
};

export const onPay = async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match as RegExpExecArray | undefined;
  const planId = Number(match?.[1]);
  const user = ctx.from!;
  try {
    const resp: any = await Strapi.createPayment({
      planId,
      telegramId: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
    });
    if (!resp?.confirmation_url) throw new Error('No confirmation_url');
    const url: string = resp.confirmation_url;
    const kb = new InlineKeyboard().url('Оплатить YooKassa', url);
    await ctx.reply(texts.paymentLink, { reply_markup: kb });
  } catch (e: any) {
    if (e instanceof HttpError && e.status === 400) {
      await ctx.reply(texts.needTerms);
      await showTerms(ctx);
    } else {
      console.error(e);
      await ctx.reply(texts.paymentCreateError);
    }
  }
};

export const onCancelBuy = async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('Выбор тарифа отменён.');
};
