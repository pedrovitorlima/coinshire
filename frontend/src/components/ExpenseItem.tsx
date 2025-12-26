import type { Expense, User } from '../types';
import { formatCurrency } from '../utils/money';
import { Paper, Box, Typography, Chip } from '@mui/material';

type ExpenseItemProps = {
  expense: Expense;
  users: User[];
  currentUserId: string;
  deltaForCurrentUser: number; // how this expense affects current user
};

export default function ExpenseItem({ expense, users, currentUserId, deltaForCurrentUser }: ExpenseItemProps) {
  const payer = users.find((u) => u.id === expense.paidBy)?.name ?? 'Unknown';

  const youPaid = expense.paidBy === currentUserId;
  const youParticipated = expense.participants.includes(currentUserId);

  let relation = '';
  let color: 'success' | 'error' | 'default' = 'default';
  if (deltaForCurrentUser > 0) { relation = `you lent ${formatCurrency(Math.abs(deltaForCurrentUser))}`; color = 'success'; }
  else if (deltaForCurrentUser < 0) { relation = `you owe ${formatCurrency(Math.abs(deltaForCurrentUser))}`; color = 'error'; }
  else relation = youPaid ? 'settled (you paid your share)' : youParticipated ? 'no balance impact' : 'not involved';

  const date = new Date(expense.date).toLocaleDateString();

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600}>{expense.description}</Typography>
        <Typography variant="body2" color="text.secondary">
          {date} • Paid by {youPaid ? 'you' : payer}
        </Typography>
      </Box>
      <Box textAlign="right" minWidth={220} display="flex" flexDirection="column" gap={1}>
        <Typography variant="subtitle1" fontWeight={700}>{formatCurrency(expense.amount)}</Typography>
        <Chip color={color} variant={color === 'default' ? 'outlined' : 'filled'} label={relation} sx={{ alignSelf: 'flex-end' }} />
      </Box>
    </Paper>
  );
}
