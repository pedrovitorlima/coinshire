import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUserBalancePayload } from './balance-notify.js';
import { topicForUser } from './mqtt-config.js';
import type { Expense, User } from './types.js';

const users: User[] = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
];

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
  {
    id: 'e2',
    description: 'Taxi',
    amount: 20,
    date: '2025-06-02',
    paidBy: 'u2',
    participants: ['u1', 'u2'],
    shares: { u1: 0.5, u2: 0.5 },
  },
];

test('buildUserBalancePayload includes signed balance and only the latest expense', () => {
  const alice = buildUserBalancePayload('u1', users, expenses);
  const bob = buildUserBalancePayload('u2', users, expenses);

  assert.equal(alice.name, 'Alice');
  assert.equal(alice.balance, 30);
  assert.equal(alice.settled, false);
  assert.deepEqual(alice.expense, {
    description: 'Taxi',
    date: '2025-06-02',
    share: -10,
  });

  assert.equal(bob.name, 'Bob');
  assert.equal(bob.balance, -30);
  assert.deepEqual(bob.expense, {
    description: 'Taxi',
    date: '2025-06-02',
    share: 10,
  });
});

test('buildUserBalancePayload returns null expense when there are no expenses', () => {
  const alice = buildUserBalancePayload('u1', users, []);

  assert.equal(alice.balance, 0);
  assert.equal(alice.settled, true);
  assert.equal(alice.expense, null);
});

test('buildUserBalancePayload marks settled balances', () => {
  const solo: Expense[] = [
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

  const alice = buildUserBalancePayload('u1', users, solo);
  const bob = buildUserBalancePayload('u2', users, solo);

  assert.equal(alice.balance, 0);
  assert.equal(alice.settled, true);
  assert.equal(bob.balance, 0);
  assert.equal(bob.settled, true);
});

test('topicForUser appends user id to the configured prefix', () => {
  process.env.MQTT_TOPIC_PREFIX = 'coinshire/balance';

  assert.equal(topicForUser('u1'), 'coinshire/balance/u1');
  assert.equal(topicForUser('u2'), 'coinshire/balance/u2');
});
