import type { Context } from 'grammy';
import { Strapi } from '../services/strapi';
import { texts } from '../ui/texts';

export const onReinvite = async (ctx: Context) => {
  const user = ctx.from!;
  try {
    const data = await Strapi.resendInvite(user.id);
    if (data?.invite_link) {
      await ctx.reply(texts.reinviteSent(data.invite_link));
    } else {
      await ctx.reply(texts.reinviteFail);
    }
  } catch (e) {
    console.error(e);
    await ctx.reply(texts.reinviteFail);
  }
  await ctx.answerCallbackQuery();
};

