import { describe, it, expect } from 'vitest';
import { computeBalance } from '../utils/balance';
import type { Expense } from '../types';

function netFor(userId: string, expenses: Expense[]) {
  return computeBalance(userId, expenses).net;
}

describe('computeBalance zero-sum invariant', () => {
  it('payer with 100% share leaves both users settled', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        description: 'Solo expense',
        amount: 100,
        date: '2025-01-01',
        paidBy: 'u1',
        participants: ['u1'],
        shares: { u1: 1 },
      },
    ];
    expect(netFor('u1', expenses)).toBe(0);
    expect(netFor('u2', expenses)).toBe(0);
  });

  it('payer with 0% share means other user owes the full amount', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        description: 'Gift',
        amount: 80,
        date: '2025-01-01',
        paidBy: 'u1',
        participants: ['u2'],
        shares: { u2: 1 },
      },
    ];
    expect(netFor('u1', expenses)).toBe(80);
    expect(netFor('u2', expenses)).toBe(-80);
  });

  it('balances always sum to zero across users', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        description: 'Dinner',
        amount: 100,
        date: '2025-01-01',
        paidBy: 'u1',
        participants: ['u1', 'u2'],
        shares: { u1: 0.6, u2: 0.4 },
      },
      {
        id: 'e2',
        description: 'Uber',
        amount: 30,
        date: '2025-01-02',
        paidBy: 'u2',
        participants: ['u1', 'u2'],
        shares: { u1: 0.5, u2: 0.5 },
      },
    ];
    expect(netFor('u1', expenses) + netFor('u2', expenses)).toBe(0);
  });
});
