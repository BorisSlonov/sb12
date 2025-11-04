export type PendingBuy = { planId: number; ts: number };

const pending = new Map<number, PendingBuy>();

export function setPendingBuy(userId: number, planId: number) {
  pending.set(userId, { planId, ts: Date.now() });
}

export function takePendingBuy(userId: number): PendingBuy | undefined {
  const v = pending.get(userId);
  if (v) pending.delete(userId);
  return v;
}

export function getPendingBuy(userId: number): PendingBuy | undefined {
  return pending.get(userId);
}

