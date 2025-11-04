import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { Strapi } from '../services/strapi';
import { termsKeyboard } from '../ui/keyboards';
import { texts } from '../ui/texts';
import { takePendingBuy } from '../state/pending';

export const showTerms = async (ctx: Context) => {
  await ctx.reply(texts.terms, { reply_markup: termsKeyboard() });
};

export const onAcceptTerms = async (ctx: Context) => {
  const user = ctx.from!;
  try {
    await Strapi.acceptTerms(user.id);
    const pending = takePendingBuy(user.id);
    if (pending) {
      try {
        const resp: any = await Strapi.createPayment({
          planId: pending.planId,
          telegramId: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
        });
        const url: string | undefined = resp?.confirmation_url;
        if (url) {
          const kb = new InlineKeyboard().url('Оплатить YooKassa', url);
          await ctx.reply(texts.paymentLink, { reply_markup: kb });
        } else {
          await ctx.reply(texts.acceptOk);
        }
      } catch {
        await ctx.reply(texts.acceptOk);
      }
    } else {
      await ctx.reply(texts.acceptOk);
    }
  } catch {
    await ctx.reply(texts.acceptFail);
  }
  await ctx.answerCallbackQuery();
};

