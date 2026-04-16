import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import type { Expense } from '../types';
import { computeBalance } from '../utils/balance';

// In-memory state + fetch mock
const state = {
  users: [
    { id: 'u1', name: 'You' },
    { id: 'u2', name: 'Alex' },
  ],
  expenses: [] as Expense[],
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  state.expenses = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const { method = 'GET', body } = init || {};

    const u = new URL(url, 'http://localhost');
    const path = u.pathname + u.search;

    if (method === 'GET' && (path.startsWith('/api/users') || path === '/api/users')) {
      return json({ users: state.users, currentUserId: 'u1' });
    }

    if (method === 'GET' && path.startsWith('/api/expenses')) {
      const qs = new URLSearchParams(u.search);
      const limit = Number(qs.get('limit') ?? 50);
      const offset = Number(qs.get('offset') ?? 0);
      const sorted = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      const slice = sorted.slice(offset, offset + limit);
      return json({ expenses: slice });
    }

    if (method === 'GET' && path.startsWith('/api/balance')) {
      const qs = new URLSearchParams(u.search);
      const userId = qs.get('userId') ?? 'u1';
      const bal = computeBalance(userId, state.expenses);
      return json(bal);
    }

    if (method === 'POST' && path === '/api/expenses') {
      const parsed = typeof body === 'string' ? JSON.parse(body) : (body as any);
      const { description, total, paidBy, payerSharePct } = parsed;
      const otherUserId = state.users.find((u) => u.id !== paidBy)!.id;
      const round3 = (n: number) => Math.round(n * 1000) / 1000;
      const payerShare = round3(Number(payerSharePct) / 100);
      const otherShare = round3(1 - payerShare);
      const shares: Record<string, number> = {};
      if (payerShare > 0) shares[paidBy] = payerShare;
      if (otherShare > 0) shares[otherUserId] = otherShare;
      const participants = Object.keys(shares);
      const newExp: Expense = {
        id: `e_${Date.now()}`,
        description,
        amount: Number(total),
        date: new Date().toISOString().slice(0, 10),
        paidBy,
        participants,
        shares,
      };
      state.expenses.unshift(newExp);
      return json(newExp, 201);
    }

    if (method === 'POST' && path === '/api/settle-up') {
      state.expenses = [];
      return new Response(null, { status: 204 });
    }

    if (method === 'DELETE' && path.startsWith('/api/expenses/')) {
      const id = path.split('/').pop()!;
      const before = state.expenses.length;
      state.expenses = state.expenses.filter((e) => e.id !== id);
      const removed = before !== state.expenses.length;
      return new Response(null, { status: removed ? 204 : 404 });
    }

    return json({ error: 'not found' }, 404);
  }));
});

describe('GIVEN existing expenses WHEN I settle up THEN all expenses are deleted and both users have 0 balance', () => {
  it('deletes all expenses and resets balances for both users', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?user=1');

    // Seed multiple expenses between the two users
    const today = new Date().toISOString().slice(0, 10);
    state.expenses.push(
      {
        id: 'e1',
        description: 'Dinner',
        amount: 50,
        date: today,
        paidBy: 'u1',
        participants: ['u1', 'u2'],
        shares: { u1: 0.5, u2: 0.5 },
      },
      {
        id: 'e2',
        description: 'Groceries',
        amount: 30,
        date: today,
        paidBy: 'u2',
        participants: ['u1', 'u2'],
        shares: { u1: 0.4, u2: 0.6 },
      },
      {
        id: 'e3',
        description: 'Taxi',
        amount: 20,
        date: today,
        paidBy: 'u1',
        participants: ['u1', 'u2'],
        shares: { u1: 0.7, u2: 0.3 },
      },
    );

    // Automatically confirm the settle-up dialog
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);

    // There should be multiple expenses visible
    const itemsBefore = await screen.findAllByTestId('expense-item');
    expect(itemsBefore.length).toBeGreaterThanOrEqual(3);

    // Current user should not be fully settled before
    const bannerBefore = await screen.findByText(/you (owe|are owed)/i);
    expect(bannerBefore).toBeInTheDocument();

    // Click Settle up
    const settleButton = await screen.findByRole('button', { name: /settle up/i });
    await user.click(settleButton);

    // All expenses should disappear after settling up
    await waitFor(() => {
      expect(screen.queryByTestId('expense-item')).toBeNull();
    });

    // For user A: balance should be 0 ("All settled up!")
    const bannerAfterA = await screen.findByText(/all settled up!/i);
    expect(bannerAfterA).toBeInTheDocument();

    // Switch to user B and verify also settled
    const alexAvatars = await screen.findAllByAltText(/alex/i);
    await user.click(alexAvatars[0]);

    const bannerAfterB = await screen.findByText(/all settled up!/i);
    expect(bannerAfterB).toBeInTheDocument();

    // And no expenses for user B either
    expect(screen.queryByTestId('expense-item')).toBeNull();
  });
});
