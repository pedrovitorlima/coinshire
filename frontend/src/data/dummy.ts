import type { Expense, User } from '../types';

export const users: User[] = [
  { id: 'u1', name: 'You' },
  { id: 'u2', name: 'Alex' },
];

export const currentUserId = 'u1';

export const expenses: Expense[] = [
  {
    id: 'e1',
    description: 'Dinner at Bella Italia',
    amount: 96.0,
    date: '2025-12-01',
    paidBy: 'u1',
    participants: ['u1', 'u2'],
  },
  {
    id: 'e2',
    description: 'Cab from airport',
    amount: 42.5,
    date: '2025-12-02',
    paidBy: 'u2',
    participants: ['u1', 'u2'],
    shares: { u2: 0.7, u1: 0.3 },
  },
  {
    id: 'e3',
    description: 'Groceries for weekend',
    amount: 78.99,
    date: '2025-12-03',
    paidBy: 'u2',
    participants: ['u1', 'u2'],
  },
  {
    id: 'e4',
    description: 'Coffee run',
    amount: 12.0,
    date: '2025-12-04',
    paidBy: 'u1',
    participants: ['u1', 'u2'],
    shares: { u1: 0.6, u2: 0.4 },
  },
];
