import type { Expense, User } from '../types';
import { formatCurrency } from '../utils/money';
import { Paper, Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { USER1_NAME, USER2_NAME } from '../config';

type ExpenseItemProps = {
  expense: Expense;
  users: User[];
  currentUserId: string;
  deltaForCurrentUser: number; // how this expense affects current user
  onDelete?: (id: string) => void;
};

export default function ExpenseItem({ expense, users, currentUserId, deltaForCurrentUser, onDelete }: ExpenseItemProps) {
  // Use names from config (.env) to identify payer consistently
  const payer = expense.paidBy === 'u1' ? USER1_NAME : expense.paidBy === 'u2' ? USER2_NAME : (users.find((u) => u.id === expense.paidBy)?.name ?? 'Unknown');

  const youPaid = expense.paidBy === currentUserId;
  const youParticipated = expense.participants.includes(currentUserId);

  let relation = '';
  let color: 'success' | 'error' | 'default' = 'default';
  if (deltaForCurrentUser > 0) { relation = `lent ${formatCurrency(Math.abs(deltaForCurrentUser))}`; color = 'success'; }
  else if (deltaForCurrentUser < 0) { relation = `owe ${formatCurrency(Math.abs(deltaForCurrentUser))}`; color = 'error'; }
  else relation = youPaid ? 'settled (you paid your share)' : youParticipated ? 'no balance impact' : 'not involved';

  const date = new Date(expense.date).toLocaleDateString();

  const confirmAndDelete = () => {
    const ok = window.confirm(`Delete this expense?\n\n${expense.description} — ${formatCurrency(expense.amount)}\n${date}`);
    if (ok) onDelete?.(expense.id);
  };

  return (
    <Paper data-testid="expense-item" variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      {/* Left: date */}
      <Box data-testid="expense-date" sx={{ minWidth: 96, textAlign: 'left' }}>
        <Typography variant="body2" color="text.secondary">{date}</Typography>
      </Box>

      {/* Middle: description and payer */}
      <Box data-testid="expense-details" sx={{ flex: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>{expense.description}</Typography>
        <Typography variant="body2" color="text.secondary">Paid by {youPaid ? 'you' : payer}</Typography>
      </Box>

      {/* Right: amount, delete, balance chip */}
      <Box textAlign="right" minWidth={110} display="flex" flexDirection="column" gap={1}>
        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
          <Typography variant="subtitle1" fontWeight={700}>{formatCurrency(expense.amount)}</Typography>
          <Tooltip title="Delete">
            <IconButton size="small" color="default" onClick={confirmAndDelete} aria-label={`Delete ${expense.description}`}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Chip color={color} variant={color === 'default' ? 'outlined' : 'filled'} label={relation} sx={{ alignSelf: 'flex-end' }} />
      </Box>
    </Paper>
  );
}
