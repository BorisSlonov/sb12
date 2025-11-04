import type { Context } from 'grammy';
import { Strapi } from '../services/strapi';
import { termsKeyboard } from '../ui/keyboards';
import { texts } from '../ui/texts';

export const showTerms = async (ctx: Context) => {
  await ctx.reply(texts.terms, { reply_markup: termsKeyboard() });
};

export const onAcceptTerms = async (ctx: Context) => {
  const user = ctx.from!;
  try {
    await Strapi.acceptTerms(user.id);
    await ctx.reply(texts.acceptOk);
  } catch {
    await ctx.reply(texts.acceptFail);
  }
  await ctx.answerCallbackQuery();
};

