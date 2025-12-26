export type User = {
  id: string;
  name: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number; // in dollars
  date: string; // ISO date string
  paidBy: string; // user id
  participants: string[]; // user ids who share this expense
  // Optional fractional shares per user (0..1) that sum to 1. If absent, split equally.
  shares?: Record<string, number>;
};
