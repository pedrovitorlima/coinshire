import type { Expense } from '../types';

export type UserBalance = {
  net: number; // positive => others owe you; negative => you owe
  byExpense: Record<string, number>; // expenseId => contribution to net
};

export function computeBalance(currentUserId: string, expenses: Expense[]): UserBalance {
  const result: UserBalance = { net: 0, byExpense: {} };

  for (const exp of expenses) {
    const isParticipant = exp.participants.includes(currentUserId);
    const isPayer = exp.paidBy === currentUserId;

    // Determine user's share fraction
    const participantCount = exp.participants.length || 1;
    const userShareFraction = exp.shares?.[currentUserId] ?? (isParticipant ? 1 / participantCount : 0);
    const userShareAmount = exp.amount * userShareFraction;

    let delta = 0;

    // Special rule: if a user's share is 100%, the full amount is their debit (owe), regardless of who paid
    const hasFullShare = Math.abs(userShareFraction - 1) < 1e-9;
    if (hasFullShare) {
      delta = -exp.amount;
    } else if (isPayer && isParticipant) {
      // You paid; your own share is userShareAmount; others collectively owe you the rest
      delta = exp.amount - userShareAmount;
    } else if (isPayer && !isParticipant) {
      // You paid for an expense you didn't participate in; everyone owes you the whole amount
      delta = exp.amount;
    } else if (!isPayer && isParticipant) {
      // Someone else paid; you owe your share
      delta = -userShareAmount;
    } else {
      delta = 0; // You neither paid nor participated
    }

    result.net += delta;
    result.byExpense[exp.id] = Math.round(delta * 100) / 100;
  }

  // Round minor floating errors
  result.net = Math.round(result.net * 100) / 100;

  return result;
}
