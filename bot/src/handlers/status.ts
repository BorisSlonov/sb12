import type { Context } from 'grammy';
import { Strapi } from '../services/strapi';
import { mainKeyboard, reinviteKeyboard } from '../ui/keyboards';
import { texts } from '../ui/texts';

export const showStatus = async (ctx: Context) => {
  const user = ctx.from!;
  try {
    const data = await Strapi.status(user.id);
    if (!data.has_customer || !data.has_subscription || !data.subscription) {
      await ctx.reply(texts.statusNoSub, { reply_markup: mainKeyboard() });
      return;
    }
    const sub = data.subscription;
    const end = sub.current_period_end ? new Date(sub.current_period_end) : undefined;
    const endStr = end ? end.toLocaleDateString('ru-RU') : '—';
    if (sub.is_active) {
      await ctx.reply(texts.statusActive(endStr, sub.plan?.name), { reply_markup: reinviteKeyboard() });
    } else {
      await ctx.reply(texts.statusNoSub, { reply_markup: mainKeyboard() });
    }
  } catch (e) {
    console.error(e);
    await ctx.reply('Не удалось получить статус.');
  }
};

