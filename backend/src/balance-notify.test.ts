import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBalanceMqttPayload } from './balance-notify.js';
import type { Expense, User } from './types.js';

const users: User[] = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
];

test('buildBalanceMqttPayload sends the debtor name and amount owed', () => {
  const expenses: Expense[] = [
    {
      id: 'e1',
      description: 'Dinner',
      amount: 100,
      date: '2025-06-01',
      paidBy: 'u1',
      participants: ['u1', 'u2'],
      shares: { u1: 0.6, u2: 0.4 },
    },
  ];

  const payload = buildBalanceMqttPayload(users, expenses);

  assert.equal(payload.name, 'Bob');
  assert.equal(payload.amount_owed, 40);
  assert.equal(payload.settled, false);
  assert.equal(payload.recent_expenses.length, 1);
  assert.equal(payload.recent_expenses[0]?.balance_impact, -40);
  assert.equal(payload.recent_expenses[0]?.paid_by, 'Alice');
});

test('buildBalanceMqttPayload marks settled balances with zero amount owed', () => {
  const expenses: Expense[] = [
    {
      id: 'e1',
      description: 'Solo',
      amount: 50,
      date: '2025-06-01',
      paidBy: 'u1',
      participants: ['u1'],
      shares: { u1: 1 },
    },
  ];

  const payload = buildBalanceMqttPayload(users, expenses);

  assert.equal(payload.amount_owed, 0);
  assert.equal(payload.settled, true);
});

test('buildBalanceMqttPayload includes up to five recent expenses for the debtor', () => {
  const expenses: Expense[] = Array.from({ length: 7 }, (_, index) => ({
    id: `e${index}`,
    description: `Expense ${index}`,
    amount: 10,
    date: `2025-06-${String(index + 1).padStart(2, '0')}`,
    paidBy: 'u2',
    participants: ['u1', 'u2'],
    shares: { u1: 0.5, u2: 0.5 },
  }));

  const payload = buildBalanceMqttPayload(users, expenses);

  assert.equal(payload.name, 'Alice');
  assert.equal(payload.amount_owed, 35);
  assert.equal(payload.recent_expenses.length, 5);
  assert.equal(payload.recent_expenses[0]?.description, 'Expense 6');
});
