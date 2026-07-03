import { computeBalance } from './balance.js';
import { topicForUser } from './mqtt-config.js';
import { publishMqttMessage } from './mqtt-client.js';
import type { Expense, User } from './types.js';

export type MqttUserExpense = {
  description: string;
  date: string;
  share: number;
};

export type MqttUserBalancePayload = {
  name: string;
  balance: number;
  settled: boolean;
  expenses: MqttUserExpense[];
  updated_at: string;
};

const RECENT_EXPENSE_LIMIT = 3;

function userName(users: User[], userId: string): string {
  return users.find((u) => u.id === userId)?.name ?? userId;
}

function sortExpensesNewestFirst(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function recentExpensesForUser(
  byExpense: Record<string, number>,
  expenses: Expense[],
): MqttUserExpense[] {
  return sortExpensesNewestFirst(expenses)
    .slice(0, RECENT_EXPENSE_LIMIT)
    .map((expense) => ({
      description: expense.description,
      date: expense.date,
      share: byExpense[expense.id] ?? 0,
    }));
}

export function buildUserBalancePayload(userId: string, users: User[], expenses: Expense[]): MqttUserBalancePayload {
  const { net, byExpense } = computeBalance(userId, expenses);

  return {
    name: userName(users, userId),
    balance: net,
    settled: net === 0,
    expenses: recentExpensesForUser(byExpense, expenses),
    updated_at: new Date().toISOString(),
  };
}

export async function notifyBalanceUpdate(users: User[], expenses: Expense[]): Promise<void> {
  await Promise.all(
    users.map(async (user) => {
      const payload = buildUserBalancePayload(user.id, users, expenses);
      await publishMqttMessage(topicForUser(user.id), payload);
    }),
  );
}
