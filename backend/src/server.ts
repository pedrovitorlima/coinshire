import express from 'express';
import cors from 'cors';
import { getUsers, getExpenses, insertExpense, currentUserId } from './db.js';
import { computeBalance } from './balance.js';
import type { Expense } from './types.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Users
app.get('/api/users', async (_req, res) => {
  try {
    const users = await getUsers();
    res.json({ users, currentUserId });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Recent expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 50);
    const data = await getExpenses(limit);
    res.json({ expenses: data });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load expenses' });
  }
});

// Balance for current (or specific) user
app.get('/api/balance', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || currentUserId;
    const items = await getExpenses();
    const bal = computeBalance(userId, items);
    res.json(bal);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute balance' });
  }
});

// Create expense
app.post('/api/expenses', async (req, res) => {
  try {
    const { description, total, paidBy, payerSharePct } = req.body as {
      description: string;
      total: number;
      paidBy: string;
      payerSharePct: number; // 0..100
    };

    if (!description || !isFinite(total) || total <= 0 || !paidBy) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const users = await getUsers();
    const otherUserId = users.find((u) => u.id !== paidBy)?.id;
    if (!otherUserId) return res.status(400).json({ error: 'Invalid payer' });

    const shares = {
      [paidBy]: Math.round((payerSharePct / 100) * 1000) / 1000,
      [otherUserId]: Math.round(((100 - payerSharePct) / 100) * 1000) / 1000,
    };

    const newExp: Expense = {
      id: `e_${Date.now()}`,
      description,
      amount: Number(total),
      date: new Date().toISOString().slice(0, 10),
      paidBy,
      participants: [paidBy, otherUserId],
      shares,
    };

    await insertExpense(newExp);
    return res.status(201).json(newExp);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

export default app;
