import { Pool } from 'pg';
import type { Expense, User } from './types.js';

export const currentUserId = 'u1';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:3022/coinshire';
export const pool = new Pool({ connectionString: DATABASE_URL });

async function waitForDb(maxAttempts = 30, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      console.log(`Waiting for database... (${attempt}/${maxAttempts})`);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

export async function initDb() {
  await waitForDb();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      date DATE NOT NULL,
      paid_by TEXT NOT NULL REFERENCES users(id),
      participants JSONB NOT NULL,
      shares JSONB
    );
  `);

  // Seed the two users if they don't exist
  await pool.query(
    `INSERT INTO users (id, name) VALUES
      ('u1','You'),
      ('u2','Alex')
     ON CONFLICT (id) DO NOTHING;`
  );
}

export async function getUsers(): Promise<User[]> {
  const { rows } = await pool.query<{ id: string; name: string }>('SELECT id, name FROM users ORDER BY id');
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export async function getExpenses(limit?: number, offset?: number): Promise<Expense[]> {
  let sql = `SELECT id, description, amount, date, paid_by, participants, shares FROM expenses ORDER BY date DESC, id DESC`;
  const params: any[] = [];
  if (typeof limit === 'number') {
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (typeof offset === 'number' && offset > 0) {
    params.push(offset);
    sql += ` OFFSET $${params.length}`;
  }
  const { rows } = await pool.query(sql, params);
  return rows.map((r: any) => ({
    id: r.id,
    description: r.description,
    amount: Number(r.amount),
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
    paidBy: r.paid_by,
    participants: r.participants ?? [],
    shares: r.shares ?? undefined,
  }));
}

export async function insertExpense(newExp: Expense): Promise<void> {
  await pool.query(
    `INSERT INTO expenses (id, description, amount, date, paid_by, participants, shares)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
    [
      newExp.id,
      newExp.description,
      newExp.amount,
      newExp.date,
      newExp.paidBy,
      JSON.stringify(newExp.participants ?? []),
      newExp.shares ? JSON.stringify(newExp.shares) : null,
    ]
  );
}

export async function deleteExpense(id: string): Promise<number> {
  const res = await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
  return res.rowCount ?? 0;
}
