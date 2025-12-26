export type AddExpenseBody = {
  description: string;
  total: number;
  paidBy: string;
  payerSharePct: number;
};

const base = import.meta.env.DEV ? 'http://localhost:3021/api' : (import.meta.env.VITE_API_BASE ?? '/api');

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  async users() {
    return get<{ users: Array<{ id: string; name: string }>; currentUserId: string }>(`/users`);
  },
  async expenses() {
    return get<{ expenses: any[] }>(`/expenses`);
  },
  async balance(userId?: string) {
    const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return get<{ net: number; byExpense: Record<string, number> }>(`/balance${q}`);
  },
  async createExpense(body: AddExpenseBody) {
    return post(`/expenses`, body);
  },
};
