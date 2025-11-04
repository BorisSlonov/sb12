import type { Context } from 'grammy';
import { env } from '../config/env';
import { texts } from '../ui/texts';

export const showSupport = async (ctx: Context) => {
  await ctx.reply(texts.support(env.SUPPORT_USERNAME));
};

