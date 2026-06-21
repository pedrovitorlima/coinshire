import { useState } from 'react';
import {
  AppBar,
  Box,
  Chip,
  Button,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import { formatCurrency } from '../utils/money';
import UsageMode from './UsageMode';
import type { Mode } from '../config';

type BannerProps = {
  netBalance: number;
  onAddExpense?: () => void;
  onSettleUp?: () => void;
  onRecalculate?: () => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export default function Banner({
  netBalance,
  onAddExpense,
  onSettleUp,
  onRecalculate,
  mode,
  onModeChange,
}: BannerProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);

  const positive = netBalance > 0;
  const negative = netBalance < 0;
  const label = positive
    ? `You are owed ${formatCurrency(Math.abs(netBalance))}`
    : negative
    ? `You owe ${formatCurrency(Math.abs(netBalance))}`
    : 'All settled up!';

  const closeMenu = () => setMenuAnchor(null);

  const handleRecalculate = () => {
    closeMenu();
    onRecalculate?.();
  };

  return (
    <AppBar position="sticky" color="inherit" elevation={1} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ position: 'relative', px: 2, py: { xs: 3, sm: 4 }, display: 'flex', justifyContent: 'center' }}>
        {/* Top-left: small selector */}
        <Box sx={{ position: 'absolute', top: 8, left: 12 }}>
          <UsageMode selected={mode} onSelect={onModeChange} size="small" />
        </Box>

        {/* Top-right: menu */}
        <Box sx={{ position: 'absolute', top: 8, right: 12 }}>
          <IconButton
            aria-label="Open menu"
            aria-controls={menuOpen ? 'app-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? 'true' : undefined}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            size="large"
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <Menu
          id="app-menu"
          anchorEl={menuAnchor}
          open={menuOpen}
          onClose={closeMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={handleRecalculate}>
            <ListItemIcon>
              <CalculateOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Re-calculate</ListItemText>
          </MenuItem>
        </Menu>

        {/* Center content */}
        <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center' }}>
          <UsageMode selected={mode} size="large" />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={onAddExpense}>+ Add expense</Button>
            <Button variant="outlined" onClick={onSettleUp}>Settle up</Button>
          </Stack>
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
