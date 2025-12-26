import type { Expense, User } from '../types';
import ExpenseItem from './ExpenseItem';
import { Stack, Typography } from '@mui/material';

interface ExpensesListProps {
  expenses: Expense[];
  users: User[];
  currentUserId: string;
  deltas: Record<string, number>; // expenseId -> delta
}

export default function ExpensesList({ expenses, users, currentUserId, deltas }: ExpensesListProps) {
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="expenses">
      <Typography variant="overline" color="text.secondary">Recent expenses</Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {sorted.map((e) => (
          <ExpenseItem
            key={e.id}
            expense={e}
            users={users}
            currentUserId={currentUserId}
            deltaForCurrentUser={deltas[e.id] ?? 0}
          />
        ))}
      </Stack>
    </section>
  );
}
