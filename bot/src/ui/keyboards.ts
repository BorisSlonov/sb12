import { InlineKeyboard, Keyboard } from 'grammy';
import type { Plan } from '../services/strapi';
import { formatMoney, pluralDays } from './format';

export const mainKeyboard = () =>
  new Keyboard()
    .text('🛍 Тарифы').text('🎫 Статус')
    .row()
    .text('📜 Условия').text('🆘 Поддержка')
    .resized()
    .persistent();

export const plansKeyboard = (plans: Plan[]) => {
  const kb = new InlineKeyboard();
  for (const p of plans) {
    const trialDays = Number(p.trial_days || 0);
    const hasTrial = !!p.trial_amount && p.trial_amount > 0 && trialDays > 0;
    const label = hasTrial
      ? `${p.name} — пробный ${formatMoney(p.trial_amount!, p.currency)} на ${pluralDays(trialDays)} → затем ${formatMoney(p.amount, p.currency)}/мес`
      : `${p.name} — ${formatMoney(p.amount, p.currency)}/мес`;
    kb.text(label, `buy:${p.id}`).row();
  }
  return kb;
};

export const termsKeyboard = () => new InlineKeyboard().text('✅ Согласен с условиями', 'accept_terms');
export const reinviteKeyboard = () => new InlineKeyboard().text('🔗 Пригласить снова', 'reinvite');

