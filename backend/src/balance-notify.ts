import { computeBalance } from './balance.js';
import { publishBalanceMessage } from './mqtt-client.js';
import type { Expense, User } from './types.js';

export type MqttRecentExpense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  paid_by: string;
  balance_impact: number;
};

export type MqttBalancePayload = {
  name: string;
  amount_owed: number;
  settled: boolean;
  recent_expenses: MqttRecentExpense[];
  updated_at: string;
};

function userName(users: User[], userId: string): string {
  return users.find((u) => u.id === userId)?.name ?? userId;
}

function sortExpensesNewestFirst(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function isInvolved(expense: Expense, userId: string): boolean {
  return expense.paidBy === userId || expense.participants.includes(userId);
}

export function buildBalanceMqttPayload(users: User[], expenses: Expense[]): MqttBalancePayload {
  const u1Net = computeBalance('u1', expenses).net;
  const u2Net = -u1Net;

  let debtorId: string;
  let amountOwed: number;

  if (u1Net < 0) {
    debtorId = 'u1';
    amountOwed = Math.abs(u1Net);
  } else if (u2Net < 0) {
    debtorId = 'u2';
    amountOwed = Math.abs(u2Net);
  } else {
    debtorId = 'u1';
    amountOwed = 0;
  }

  const debtorBalance = computeBalance(debtorId, expenses);
  const recentExpenses = sortExpensesNewestFirst(expenses)
    .filter((expense) => isInvolved(expense, debtorId))
    .slice(0, 5)
    .map((expense) => ({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      paid_by: userName(users, expense.paidBy),
      balance_impact: debtorBalance.byExpense[expense.id] ?? 0,
    }));

  return {
    name: userName(users, debtorId),
    amount_owed: amountOwed,
    settled: amountOwed === 0,
    recent_expenses: recentExpenses,
    updated_at: new Date().toISOString(),
  };
}

export async function notifyBalanceUpdate(users: User[], expenses: Expense[]): Promise<void> {
  const payload = buildBalanceMqttPayload(users, expenses);
  await publishBalanceMessage(payload);
}
