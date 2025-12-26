import { useEffect, useMemo, useState } from 'react';
import type { User } from '../types';
import { USER1_NAME, USER2_NAME } from '../config';
import { formatCurrency } from '../utils/money';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Stack,
  Typography,
} from '@mui/material';

export type AddExpensePayload = {
  description: string;
  total: number;
  paidBy: string; // user id
  payerSharePct: number; // 0..100
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  defaultPayerId: string;
  onSubmit: (payload: AddExpensePayload) => void;
};

export default function AddExpenseModal({ isOpen, onClose, users, defaultPayerId, onSubmit }: Props) {
  const [description, setDescription] = useState<string>('');
  const [total, setTotal] = useState<string>('');
  const [paidBy, setPaidBy] = useState<string>(defaultPayerId);
  const [payerSharePct, setPayerSharePct] = useState<number>(60);

  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setTotal('');
      setPaidBy(defaultPayerId);
      setPayerSharePct(60);
    }
  }, [isOpen, defaultPayerId]);

  const totalNum = Number(total || 0);
  const otherSharePct = 100 - payerSharePct;

  const preview = useMemo(() => {
    const payerAmount = (totalNum * payerSharePct) / 100;
    const otherAmount = totalNum - payerAmount;
    return { payerAmount, otherAmount };
  }, [totalNum, payerSharePct]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = Number(total);
    if (!description.trim() || !isFinite(t) || t <= 0) return;
    // Interpret slider as "your share" percentage (for the currently selected user)
    // Convert to payerSharePct for the API: if you are the payer, payerSharePct = yourShare;
    // if the other is the payer, payerSharePct = 100 - yourShare.
    const yourSharePct = payerSharePct;
    const effectivePayerSharePct = paidBy === defaultPayerId ? yourSharePct : 100 - yourSharePct;
    onSubmit({ description: description.trim(), total: t, paidBy, payerSharePct: effectivePayerSharePct });
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={submit}>
      <DialogTitle>Add expense</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Dinner, Uber, Groceries"
            required
            autoFocus
          />
          <TextField
            label="Total (AUD)"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0.00"
            required
          />
          <FormControl fullWidth>
            <InputLabel id="paid-by-label">Who is paying</InputLabel>
            <Select
              labelId="paid-by-label"
              label="Who is paying"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              <MenuItem value={defaultPayerId}>{defaultPayerId === 'u1' ? USER1_NAME : USER2_NAME} (you)</MenuItem>
              {users.find((u) => u.id !== defaultPayerId) && (
                <MenuItem value={users.find((u) => u.id !== defaultPayerId)!.id}>{defaultPayerId === 'u1' ? USER2_NAME : USER1_NAME}</MenuItem>
              )}
            </Select>
          </FormControl>

          <div>
            <Typography variant="subtitle2" gutterBottom>
              Your share: {payerSharePct}%
            </Typography>
            <Slider
              value={payerSharePct}
              onChange={(_, v) => setPayerSharePct(v as number)}
              step={1}
              min={0}
              max={100}
              valueLabelDisplay="auto"
            />
            <Typography variant="body2" color="text.secondary">
              You: {payerSharePct}% {totalNum ? `(${formatCurrency(preview.payerAmount)})` : ''} · Other: {otherSharePct}% {totalNum ? `(${formatCurrency(preview.otherAmount)})` : ''}
            </Typography>
          </div>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={!description.trim() || !total || Number(total) <= 0}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
