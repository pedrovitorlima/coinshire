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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function recalculatePayload() {
  const u1 = computeBalance('u1', state.expenses).net;
  return { balances: { u1, u2: -u1 } };
}

beforeEach(() => {
  state.expenses = [
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

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const { method = 'GET' } = init || {};
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
      return json({ expenses: sorted.slice(offset, offset + limit) });
    }

    if (method === 'GET' && path.startsWith('/api/balance')) {
      const qs = new URLSearchParams(u.search);
      const userId = qs.get('userId') ?? 'u1';
      return json(computeBalance(userId, state.expenses));
    }

    if (method === 'POST' && path === '/api/recalculate') {
      return json(recalculatePayload());
    }

    return json({ error: 'not found' }, 404);
  }));
});

describe('Re-calculate menu', () => {
  it('opens from the hamburger menu and refreshes balances so user 2 is the inverse of user 1', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?user=1');

    render(<App />);

    await screen.findByText(/you are owed/i);

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(await screen.findByRole('menuitem', { name: /re-calculate/i }));

    const banner = await screen.findByText(/you are owed/i);
    expect(banner.textContent).toMatch(/40\.00/);

    const alexAvatars = await screen.findAllByAltText(/alex/i);
    await user.click(alexAvatars[0]);

    const otherBanner = await screen.findByText(/you owe/i);
    expect(otherBanner.textContent).toMatch(/40\.00/);
  });
});
