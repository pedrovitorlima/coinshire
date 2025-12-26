import { AppBar, Box, Chip, Button, Stack } from '@mui/material';
import { formatCurrency } from '../utils/money';
import UsageMode from './UsageMode';
import type { Mode } from '../config';

type BannerProps = {
  netBalance: number;
  onAddExpense?: () => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export default function Banner({ netBalance, onAddExpense, mode, onModeChange }: BannerProps) {
  const positive = netBalance > 0;
  const negative = netBalance < 0;
  const label = positive
    ? `You are owed ${formatCurrency(Math.abs(netBalance))}`
    : negative
    ? `You owe ${formatCurrency(Math.abs(netBalance))}`
    : 'All settled up!';

  return (
    <AppBar position="sticky" color="inherit" elevation={1} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ position: 'relative', px: 2, py: { xs: 3, sm: 4 }, display: 'flex', justifyContent: 'center' }}>
        {/* Top-left: small selector */}
        <Box sx={{ position: 'absolute', top: 8, left: 12 }}>
          <UsageMode selected={mode} onSelect={onModeChange} size="small" />
        </Box>

        {/* Center content */}
        <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center' }}>
          <UsageMode selected={mode} size="large" />
          <Button variant="contained" onClick={onAddExpense}>+ Add expense</Button>
          <Chip
            color={positive ? 'success' : negative ? 'error' : 'default'}
            label={label}
            variant={positive || negative ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </Box>
    </AppBar>
  );
}
