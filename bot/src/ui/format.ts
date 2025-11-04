export const formatMoney = (minor: number, currency = 'RUB') =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(minor / 100)
    .replace(/\u00A0/g, ' ');

export const pluralDays = (n: number) => {
  const d = Math.abs(n) % 100;
  const dd = d % 10;
  if (d > 10 && d < 20) return `${n} дней`;
  if (dd > 1 && dd < 5) return `${n} дня`;
  if (dd === 1) return `${n} день`;
  return `${n} дней`;
};

