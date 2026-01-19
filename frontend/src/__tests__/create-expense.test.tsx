import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('GIVEN I am logged with user A WHEN I create an expense with 60% set as quota AND the expense set as if I am paying THEN I should lent the remaining (40%) to the user B', () => {
  it('user A (u1) paying with 60% share results in lending 40%', async () => {
    const user = userEvent.setup();
    // Ensure we are in user A mode
    window.history.replaceState({}, '', '/?user=1');

    render(<App />);

    // Open modal
    const addBtn = await screen.findByRole('button', { name: /add expense/i });
    await user.click(addBtn);

    // Fill fields
    await user.type(await screen.findByLabelText(/description/i), 'Test 60% payer share');
    const total = await screen.findByLabelText(/total.*aud/i);
    await user.clear(total);
    await user.type(total, '100');

    // paidBy defaults to current user (you), slider defaults to 60%

    // Save
    await user.click(await screen.findByRole('button', { name: /save/i }));

    // Verify the banner reflects the correct total net balance for the current user
    const bannerChip = await screen.findByText(/you are owed/i);
    expect(bannerChip).toBeInTheDocument();
    expect(bannerChip.textContent).toMatch(/40\.00/);

    // Switch to the other user's perspective and verify they owe 40.00 and see the expense
    const alexAvatars = await screen.findAllByAltText(/alex/i);
    await user.click(alexAvatars[0]);

    const otherBanner = await screen.findByText(/you owe/i);
    expect(otherBanner.textContent).toMatch(/40\.00/);
    expect(await screen.findByText('Test 60% payer share')).toBeInTheDocument();
  });
});


describe('GIVEN I am logged with user B WHEN I create an expense with 60% set as quota AND the expense set as if I am paying THEN I should lent the remaining (40%) to the user A', () => {
  it('user B (u2) paying with 60% share results in lending 40%', async () => {
    const user = userEvent.setup();
    // Switch to user B
    window.history.replaceState({}, '', '/?user=2');

    render(<App />);

    // Open modal
    const addBtn = await screen.findByRole('button', { name: /add expense/i });
    await user.click(addBtn);

    // Fill fields
    await user.type(await screen.findByLabelText(/description/i), 'Test 60% payer share (u2)');
    const total = await screen.findByLabelText(/total.*aud/i);
    await user.clear(total);
    await user.type(total, '100');

    // paidBy defaults to current user (you), slider defaults to 60%

    // Save
    await user.click(await screen.findByRole('button', { name: /save/i }));

    // Verify the banner reflects the correct total net balance for the current user
    const bannerChip = await screen.findByText(/you are owed/i);
    expect(bannerChip).toBeInTheDocument();
    expect(bannerChip.textContent).toMatch(/40\.00/);

    // Switch to the other user's perspective and verify they owe 40.00 and see the expense
    const youAvatars = await screen.findAllByAltText(/^you$/i);
    await user.click(youAvatars[0]);

    const otherBanner = await screen.findByText(/you owe/i);
    expect(otherBanner.textContent).toMatch(/40\.00/);
    expect(await screen.findByText('Test 60% payer share (u2)')).toBeInTheDocument();
  });
});
