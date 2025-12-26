import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import type { Expense } from '../types';
import { computeBalance } from '../utils/balance';

// Mock network via fetch to hit our in-memory state
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

    // Normalize URL to path only
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
      const parsed = typeof body === 'string' ? JSON.parse(body) : body as any;
      const { description, total, paidBy, payerSharePct } = parsed;
      const otherUserId = state.users.find((u) => u.id !== paidBy)!.id;
      const shares = {
        [paidBy]: Math.round((Number(payerSharePct) / 100) * 1000) / 1000,
        [otherUserId]: Math.round(((100 - Number(payerSharePct)) / 100) * 1000) / 1000,
      } as Record<string, number>;
      const newExp: Expense = {
        id: `e_${Date.now()}`,
        description,
        amount: Number(total),
        date: new Date().toISOString().slice(0, 10),
        paidBy,
        participants: [paidBy, otherUserId],
        shares,
      };
      state.expenses.unshift(newExp);
      return json(newExp, 201);
    }

    return json({ error: 'not found' }, 404);
  }));
});

describe('Add expense - other payer 100%', () => {
  it('impacts balance and shows "you owe" (not "no balance impact")', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Open modal
    const addBtn = await screen.findByRole('button', { name: /add expense/i });
    await user.click(addBtn);

    // Fill fields
    const desc = await screen.findByLabelText(/description/i);
    await user.type(desc, 'Test dinner');

    const total = await screen.findByLabelText(/total.*aud/i);
    await user.clear(total);
    await user.type(total, '100');

    // Choose "Who is paying" = the other person (Alex)
    const who = await screen.findByLabelText(/who is paying/i);
    await user.click(who);
    const option = await screen.findByRole('option', { name: /alex/i });
    await user.click(option);

    // Set slider (payer share) to 100%
    const slider = await screen.findByRole('slider');
    fireEvent.keyDown(slider, { key: 'End', code: 'End' });

    // Save
    const save = await screen.findByRole('button', { name: /save/i });
    await user.click(save);

    // Expect the banner or list to reflect new balance
    expect(await screen.findByText(/you owe/i)).toBeInTheDocument();
    expect(screen.queryByText(/no balance impact/i)).toBeNull();
  });
});
