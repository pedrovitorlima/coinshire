import type { Expense } from './types.js';

export function computeBalance(currentUserId: string, expenses: Expense[]) {
  const result: { net: number; byExpense: Record<string, number> } = { net: 0, byExpense: {} };

  for (const exp of expenses) {
    const isParticipant = exp.participants.includes(currentUserId);
    const isPayer = exp.paidBy === currentUserId;

    const participantCount = exp.participants.length || 1;
    const userShareFraction = exp.shares?.[currentUserId] ?? (isParticipant ? 1 / participantCount : 0);
    const userShareAmount = exp.amount * userShareFraction;

    let delta = 0;

    // New rule: if a user's share is 100%, the full amount is their debit (owe), regardless of who paid
    const hasFullShare = Math.abs(userShareFraction - 1) < 1e-9;
    if (hasFullShare) {
      delta = -exp.amount;
    } else if (isPayer && isParticipant) {
      delta = exp.amount - userShareAmount;
    } else if (isPayer && !isParticipant) {
      delta = exp.amount;
    } else if (!isPayer && isParticipant) {
      delta = -userShareAmount;
    }

    result.net += delta;
    result.byExpense[exp.id] = Math.round(delta * 100) / 100;
  }

  result.net = Math.round(result.net * 100) / 100;
  return result;
}
