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
  (window as any).scrollTo = vi.fn();

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const { method = 'GET', body } = init || {};

    const u = new URL(url, 'http://localhost');
    const path = u.pathname + u.search;

    if (method === 'GET' && path.startsWith('/api/users')) {
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
      return json(computeBalance(userId, state.expenses));
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

describe('Reload list and scroll to top on create', () => {
  it('after creating an expense, it appears in the list and window scrolls to top', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?user=1');

    render(<App />);

    await user.click(await screen.findByRole('button', { name: /add expense/i }));
    await user.type(await screen.findByLabelText(/description/i), 'Created item');
    const total = await screen.findByLabelText(/total.*aud/i);
    await user.clear(total);
    await user.type(total, '12.34');

    // Save
    await user.click(await screen.findByRole('button', { name: /save/i }));

    // Item should be in the list (reloaded from start)
    expect(await screen.findByText('Created item')).toBeInTheDocument();

    // Scroll called to top
    expect(window.scrollTo).toHaveBeenCalled();
    const args = (window.scrollTo as any).mock.calls.at(-1);
    expect(args[0]).toBe(0);
    expect(args[1]).toBe(0);
  });
});

describe('Reload list and scroll to top on delete', () => {
  it('after deleting an expense, it disappears and window scrolls to top', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?user=1');

    // Seed an expense
    state.expenses.push({
      id: 'e_del',
      description: 'Delete me',
      amount: 20,
      date: new Date().toISOString().slice(0, 10),
      paidBy: 'u1',
      participants: ['u1', 'u2'],
      shares: { u1: 0.5, u2: 0.5 },
    });

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);

    expect(await screen.findByText('Delete me')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /delete delete me/i }));

    await waitFor(() => {
      expect(screen.queryByText('Delete me')).toBeNull();
    });

    // Scroll called to top
    expect(window.scrollTo).toHaveBeenCalled();
    const args = (window.scrollTo as any).mock.calls.at(-1);
    expect(args[0]).toBe(0);
    expect(args[1]).toBe(0);
  });
});
