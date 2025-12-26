export type User = {
  id: string;
  name: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number; // dollars
  date: string; // YYYY-MM-DD
  paidBy: string; // user id
  participants: string[]; // user ids
  shares?: Record<string, number>; // fractions that sum to 1
};

export type Balance = {
  net: number;
  byExpense: Record<string, number>;
};
