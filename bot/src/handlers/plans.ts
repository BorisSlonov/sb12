import type { Context } from 'grammy';
import { Strapi } from '../services/strapi';
import { plansKeyboard } from '../ui/keyboards';
import { texts } from '../ui/texts';

export const showPlans = async (ctx: Context) => {
  const plans = await Strapi.listPlans();
  if (!plans.length) return ctx.reply(texts.noPlans);
  await ctx.reply(texts.choosePlan, { reply_markup: plansKeyboard(plans) });
};

