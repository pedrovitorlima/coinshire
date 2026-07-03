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
  expense: MqttUserExpense | null;
  updated_at: string;
};

function userName(users: User[], userId: string): string {
  return users.find((u) => u.id === userId)?.name ?? userId;
}

function sortExpensesNewestFirst(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function latestExpenseForUser(
  byExpense: Record<string, number>,
  expenses: Expense[],
): MqttUserExpense | null {
  const latest = sortExpensesNewestFirst(expenses)[0];
  if (!latest) return null;

  return {
    description: latest.description,
    date: latest.date,
    share: byExpense[latest.id] ?? 0,
  };
}

export function buildUserBalancePayload(userId: string, users: User[], expenses: Expense[]): MqttUserBalancePayload {
  const { net, byExpense } = computeBalance(userId, expenses);

  return {
    name: userName(users, userId),
    balance: net,
    settled: net === 0,
    expense: latestExpenseForUser(byExpense, expenses),
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
