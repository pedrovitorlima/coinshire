import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import type { Expense } from '../types';
import { computeBalance } from '../utils/balance';

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

    return json({ error: 'not found' }, 404);
  }));
});

describe('Default slider weight based on user defaults', () => {
  it('User 1 opens modal with 60% default for their share; switching payer sets slider to 40%', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?user=1');

    render(<App />);

    await user.click(await screen.findByRole('button', { name: /add expense/i }));

    const slider = await screen.findByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '60');

    const who = await screen.findByLabelText(/who is paying/i);
    await user.click(who);
    const option = await screen.findByRole('option', { name: /alex/i });
    await user.click(option);

    const sliderAfter = await screen.findByRole('slider');
    expect(sliderAfter).toHaveAttribute('aria-valuenow', '40');
  });

  it('User 2 opens modal with 40% default for their share; switching payer sets slider to 60%', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?user=2');

    render(<App />);

    await user.click(await screen.findByRole('button', { name: /add expense/i }));

    const slider = await screen.findByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '40');

    const who = await screen.findByLabelText(/who is paying/i);
    await user.click(who);
    const option = await screen.findByRole('option', { name: /you/i });
    await user.click(option);

    const sliderAfter = await screen.findByRole('slider');
    expect(sliderAfter).toHaveAttribute('aria-valuenow', '60');
  });
});
