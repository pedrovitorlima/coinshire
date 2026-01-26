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

describe('Create expense paid by someone else', () => {
  it('shows "Paid by Alex" after creation and renders date on the left, details in the middle', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Open modal
    const addBtn = await screen.findByRole('button', { name: /add expense/i });
    await user.click(addBtn);

    // Fill fields
    const label = 'Lunch with Alex';
    await user.type(await screen.findByLabelText(/description/i), label);
    const total = await screen.findByLabelText(/total.*aud/i);
    await user.clear(total);
    await user.type(total, '25');

    // Choose other person as payer (Alex)
    const who = await screen.findByLabelText(/who is paying/i);
    await user.click(who);
    const option = await screen.findByRole('option', { name: /alex/i });
    await user.click(option);

    // Save
    await user.click(await screen.findByRole('button', { name: /save/i }));

    // Expect list item shows "Paid by Alex"
    expect(await screen.findByText(/paid by alex/i)).toBeInTheDocument();

    // Check layout: date on the left, details (description + Paid by) in the middle
    const items = await screen.findAllByTestId('expense-item');
    expect(items.length).toBeGreaterThan(0);
    const first = items[0];

    const dateEl = within(first).getByTestId('expense-date');
    const detailsEl = within(first).getByTestId('expense-details');

    // Date is rendered on the left; allow timezone differences by matching a date-like pattern
    expect(within(dateEl).getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument();

    // Details contain description and "Paid by Alex"
    expect(within(detailsEl).getByText(label)).toBeInTheDocument();
    expect(within(detailsEl).getByText(/paid by alex/i)).toBeInTheDocument();
  });
});

describe('Refresh does not duplicate', () => {
  it('after creating a new expense and refreshing, the new expense appears only once', async () => {
    const user = userEvent.setup();

    // Seed one existing expense
    state.expenses.push({
      id: 'e_seed',
      description: 'Seed expense',
      amount: 10,
      date: new Date().toISOString().slice(0, 10),
      paidBy: 'u1',
      participants: ['u1', 'u2'],
      shares: { u1: 0.5, u2: 0.5 },
    });

    const rr = render(<App />);

    // Create a new expense paid by Alex
    const addBtn = await screen.findByRole('button', { name: /add expense/i });
    await user.click(addBtn);

    const label = 'New coffee';
    await user.type(await screen.findByLabelText(/description/i), label);

    const total = await screen.findByLabelText(/total.*aud/i);
    await user.clear(total);
    await user.type(total, '7.50');

    // Select Alex as payer
    const who = await screen.findByLabelText(/who is paying/i);
    await user.click(who);
    const option = await screen.findByRole('option', { name: /alex/i });
    await user.click(option);

    // Save
    await user.click(await screen.findByRole('button', { name: /save/i }));

    // The item should be visible at least once before refresh
    expect(await screen.findByText(label)).toBeInTheDocument();

    // Simulate refresh: unmount and render again
    rr.unmount();
    render(<App />);

    // The new expense should appear only once in the list
    const occurrences = await screen.findAllByText(label);
    expect(occurrences.length).toBe(1);
  });
});
