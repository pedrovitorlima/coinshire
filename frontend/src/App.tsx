import './App.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Banner from './components/Banner';
import ExpensesList from './components/ExpensesList';
import AddExpenseModal from './components/AddExpenseModal';
import type { AddExpensePayload } from './components/AddExpenseModal';
import type { Expense, User } from './types';
import { api } from './api';
import type { Mode } from './config';
import { computeBalance } from './utils/balance';

function parseModeFromUrl(): Mode | null {
  const params = new URLSearchParams(window.location.search);
  const user = params.get('user');
  if (!user) return null;
  const v = user.toLowerCase();
  if (v === '1' || v === 'u1' || v === 'user_1') return 'user_1';
  if (v === '2' || v === 'u2' || v === 'user_2') return 'user_2';
  return null;
}

function App() {
  const [items, setItems] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [net, setNet] = useState<number>(0);
  const [byExpense, setByExpense] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(() => parseModeFromUrl() ?? 'user_1');

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 50;

  const selectedUserId = useMemo(() => (mode === 'user_1' ? 'u1' : 'u2'), [mode]);

  async function loadUsers() {
    const u = await api.users();
    setUsers(u.users as any);
  }

  async function loadBalance(forUserId: string) {
    const b = await api.balance(forUserId);
    setNet(b.net);
  }

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await api.expenses({ limit: PAGE_SIZE, offset });
      const batch = res.expenses as Expense[];
      setItems((prev) => [...prev, ...batch]);
      const got = batch.length;
      setOffset((prev) => prev + got);
      if (got < PAGE_SIZE) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  // Reset when switching user
  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    Promise.all([loadUsers(), loadBalance(selectedUserId)])
      .then(() => loadMore())
      .catch(console.error);
  }, [selectedUserId]);

  // Sync URL ?user=1 or ?user=2 with selected mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const desired = mode === 'user_1' ? '1' : '2';
    if (params.get('user') !== desired) {
      params.set('user', desired);
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [mode]);

  // Listen to back/forward navigation and update mode from URL
  useEffect(() => {
    const handler = () => {
      const m = parseModeFromUrl();
      if (m) setMode(m);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          loadMore();
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [bottomRef.current, loading, hasMore]);

  const addExpense = async ({ description, total, paidBy, payerSharePct }: AddExpensePayload) => {
    await api.createExpense({ description, total, paidBy, payerSharePct });
    // Reset and load from start to reflect new item at the top
    setItems([]);
    setOffset(0);
    setHasMore(true);
    await loadBalance(selectedUserId);
    await loadMore();
  };

  const bg = mode === 'user_1' ? 'rgba(137, 207, 240, 0.18)' : 'rgba(255, 192, 203, 0.18)';

  // Recompute per-expense deltas on the client for the displayed page(s)
  useEffect(() => {
    const { byExpense } = computeBalance(selectedUserId, items);
    setByExpense(byExpense);
  }, [items, selectedUserId]);

  return (
    <div className="app" style={{ backgroundColor: bg, minHeight: '100vh' }}>
      <Banner netBalance={net} onAddExpense={() => setModalOpen(true)} mode={mode} onModeChange={setMode} />
      <main className="content">
        <ExpensesList
          expenses={items}
          users={users}
          currentUserId={selectedUserId}
          deltas={byExpense}
        />
        <div ref={bottomRef} style={{ height: 1 }} />
      </main>
      <AddExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        users={users}
        defaultPayerId={selectedUserId}
        onSubmit={addExpense}
      />
    </div>
  );
}

export default App;
