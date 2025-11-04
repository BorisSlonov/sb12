import type { Context } from 'grammy';
import { Strapi } from '../services/strapi';
import { mainKeyboard } from '../ui/keyboards';
import { texts } from '../ui/texts';
import { showPlans } from './plans';

export const onStart = async (ctx: Context) => {
  const user = ctx.from!;
  try {
    await Strapi.registerUser({ telegramId: user.id, username: user.username, first_name: user.first_name, last_name: user.last_name });
  } catch {}
  await ctx.reply(texts.hero, { reply_markup: mainKeyboard() });
  await showPlans(ctx);
};

