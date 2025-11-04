import { Bot } from 'grammy';
import { env } from './config/env';
import { showPlans } from './handlers/plans';
import { showStatus } from './handlers/status';
import { showTerms, onAcceptTerms } from './handlers/terms';
import { showSupport } from './handlers/support';
import { onStart } from './handlers/start';
import { onBuy, onPay, onCancelBuy } from './handlers/buy';
import { onReinvite } from './handlers/reinvite';

export function createBot() {
  const bot = new Bot(env.BOT_TOKEN);

  // Global error handler
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error('Bot error while handling update', ctx.update, err.error);
  });

  // Commands and menu
  bot.command('start', onStart);
  bot.command('plans', showPlans);
  bot.command('status', showStatus);
  bot.command('terms', showTerms);
  bot.command('support', showSupport);
  bot.command('cancel', async (ctx) => {
    try {
      const res = await (await import('./services/strapi')).Strapi.cancel(ctx.from!.id);
      if (res?.ok) await ctx.reply('Подписка отменена.');
      else await ctx.reply('Не удалось отменить подписку.');
    } catch {
      await ctx.reply('Не удалось отменить подписку.');
    }
  });

  // Text menu
  bot.hears('🛍 Тарифы', showPlans);
  bot.hears('🎫 Статус', showStatus);
  bot.hears('📜 Условия', showTerms);
  bot.hears('🆘 Поддержка', showSupport);

  // Callback queries
  bot.callbackQuery(/^buy:(\d+)/, onBuy);
  bot.callbackQuery(/^pay:(\d+)/, onPay);
  bot.callbackQuery('cancel_buy', onCancelBuy);
  bot.callbackQuery('accept_terms', onAcceptTerms);
  bot.callbackQuery('reinvite', onReinvite);

  return bot;
}
