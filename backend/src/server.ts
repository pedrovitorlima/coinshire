import express from 'express';
import cors from 'cors';
import { getUsers, getExpenses, insertExpense, currentUserId, deleteExpense, deleteAllExpenses } from './db.js';
import { computeBalance } from './balance.js';
import { notifyBalanceUpdate } from './balance-notify.js';
import { describeMqttConfig } from './mqtt-config.js';
import { getMqttRuntimeStatus, probeMqttConnection } from './mqtt-client.js';
import type { Expense } from './types.js';

const app = express();
app.use(cors());
app.use(express.json());

async function publishBalanceAfterUpdate(): Promise<void> {
  try {
    const [users, expenses] = await Promise.all([getUsers(), getExpenses(undefined, undefined)]);
    console.log('[mqtt] Publishing balance update for', users.map((u) => u.id).join(', '));
    await notifyBalanceUpdate(users, expenses);
    console.log('[mqtt] Balance update published');
  } catch (err) {
    console.error('[mqtt] Failed to publish balance update', err);
  }
}

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// MQTT diagnostics
app.get('/api/mqtt/status', async (_req, res) => {
  res.json({
    config: describeMqttConfig(),
    runtime: getMqttRuntimeStatus(),
  });
});

app.post('/api/mqtt/test', async (_req, res) => {
  try {
    const result = await probeMqttConnection();
    if (!result.ok) {
      return res.status(503).json(result);
    }
    await publishBalanceAfterUpdate();
    return res.json({
      ...result,
      runtime: getMqttRuntimeStatus(),
    });
  } catch (err: any) {
    console.error('[mqtt] Test publish failed', err);
    return res.status(503).json({
      ok: false,
      config: describeMqttConfig(),
      runtime: getMqttRuntimeStatus(),
      error: err?.message ?? 'MQTT test failed',
    });
  }
});

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
    const offset = Number(req.query.offset ?? 0);
    const data = await getExpenses(limit, offset);
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
    const items = await getExpenses(undefined, undefined); // all for balance
    const bal = computeBalance(userId, items);
    res.json(bal);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute balance' });
  }
});

// Recompute both users' net balances from all expenses (zero-sum: u2 = -u1)
app.post('/api/recalculate', async (_req, res) => {
  try {
    const items = await getExpenses(undefined, undefined);
    const u1Net = computeBalance('u1', items).net;
    const u2Net = -u1Net;
    void publishBalanceAfterUpdate();
    res.json({ balances: { u1: u1Net, u2: u2Net } });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to recalculate balances' });
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

    // Build participants and shares based on payer's share
    const round3 = (n: number) => Math.round(n * 1000) / 1000;
    const payerShare = round3((payerSharePct ?? 0) / 100);
    const otherShare = round3(1 - payerShare);

    const shares: Record<string, number> = {};
    if (payerShare > 0) shares[paidBy] = payerShare;
    if (otherShare > 0) shares[otherUserId] = otherShare;

    const participants = Object.keys(shares);
    if (participants.length === 0) {
      // Fallback: split equally if rounding produced 0 on both (shouldn't happen)
      shares[paidBy] = 0.5;
      shares[otherUserId] = 0.5;
      participants.push(paidBy, otherUserId);
    }

    const newExp: Expense = {
      id: `e_${Date.now()}`,
      description,
      amount: Number(total),
      date: new Date().toISOString().slice(0, 10),
      paidBy,
      participants,
      shares,
    };

    await insertExpense(newExp);
    void publishBalanceAfterUpdate();
    return res.status(201).json(newExp);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Delete expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const deleted = await deleteExpense(id);
    if (deleted === 0) return res.status(404).json({ error: 'Not found' });
    void publishBalanceAfterUpdate();
    return res.status(204).send();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Settle up: delete all expenses and reset balances to zero (derived from empty list)
app.post('/api/settle-up', async (_req, res) => {
  try {
    await deleteAllExpenses();
    // No content needed; balances are computed from expenses which are now empty
    return res.status(204).send();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to settle up' });
  }
});

export default app;
