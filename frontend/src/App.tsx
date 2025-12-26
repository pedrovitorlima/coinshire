import './App.css';
import { useEffect, useMemo, useState } from 'react';
import Banner from './components/Banner';
import ExpensesList from './components/ExpensesList';
import AddExpenseModal from './components/AddExpenseModal';
import type { AddExpensePayload } from './components/AddExpenseModal';
import type { Expense, User } from './types';
import { api } from './api';
import type { Mode } from './config';

function App() {
  const [items, setItems] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [net, setNet] = useState<number>(0);
  const [byExpense, setByExpense] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('user_1');

  const selectedUserId = useMemo(() => (mode === 'user_1' ? 'u1' : 'u2'), [mode]);

  async function refresh(forUserId: string) {
    const u = await api.users();
    setUsers(u.users as any);
    const ex = await api.expenses();
    setItems(ex.expenses as any);
    const b = await api.balance(forUserId);
    setNet(b.net);
    setByExpense(b.byExpense);
  }

  useEffect(() => {
    refresh(selectedUserId).catch(console.error);
  }, [selectedUserId]);

  const addExpense = async ({ description, total, paidBy, payerSharePct }: AddExpensePayload) => {
    await api.createExpense({ description, total, paidBy, payerSharePct });
    await refresh(selectedUserId);
  };

  const bg = mode === 'user_1' ? 'rgba(137, 207, 240, 0.18)' : 'rgba(255, 192, 203, 0.18)';

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
