import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRightLeft,
  Bell,
  BookOpen,
  Bus,
  CalendarDays,
  ChevronRight,
  Coffee,
  Home,
  IndianRupee,
  LogOut,
  Mail,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  Target,
  Utensils,
  Wallet,
  X
} from "lucide-react";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { useAuth } from "./hooks/useAuth";
import { useData } from "./hooks/useData";
import "./styles.css";

const categories = [
  { name: "Food", icon: Utensils, color: "#c8f0c0" },
  { name: "Transport", icon: Bus, color: "#d4c8f5" },
  { name: "Books", icon: BookOpen, color: "#f2d7a8" },
  { name: "Hangout", icon: Coffee, color: "#bfe8ff" },
  { name: "Other", icon: ReceiptText, color: "#f5c8d8" }
];

const currency = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  })}`;

const today = () => new Date().toISOString().slice(0, 10);

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <CashPilotApp />
      </DataProvider>
    </AuthProvider>
  );
}

function CashPilotApp() {
  const { user, loading, error: authError, signIn, signUp, signInGoogle, logOut } = useAuth();
  const {
    transactions,
    summary,
    accounts,
    goals,
    loadingData,
    error: dataError,
    addTransaction,
    deleteTransaction
  } = useData();
  const [screen, setScreen] = useState("home");
  const [aiOpen, setAiOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [settings, setSettings] = useState(() => {
    const saved = window.localStorage.getItem("cashpilot-student-settings");
    return saved ? JSON.parse(saved) : { allowance: 12000, savingsGoal: 2500 };
  });

  useEffect(() => {
    window.localStorage.setItem("cashpilot-student-settings", JSON.stringify(settings));
  }, [settings]);

  const expenses = useMemo(() => transactions.map(transactionToExpense), [transactions]);

  const totals = useMemo(() => {
    const spent = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const allowance = summary.totalIncome || settings.allowance;
    const left = allowance - spent;
    const todaySpent = expenses
      .filter((item) => item.date === today())
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const byCategory = categories.map((cat) => ({
      ...cat,
      total: expenses
        .filter((item) => item.category === cat.name)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    }));
    const byDate = expenses.reduce((map, item) => {
      map[item.date] = (map[item.date] || 0) + Number(item.amount || 0);
      return map;
    }, {});

    return {
      spent,
      left,
      todaySpent,
      byCategory,
      byDate,
      dailyLimit: Math.max(0, Math.floor(left / 28)),
      savingsProgress: Math.min(100, Math.max(0, ((left > 0 ? left : 0) / settings.savingsGoal) * 100))
    };
  }, [expenses, settings, summary]);

  const addExpense = async (expense) => {
    await addTransaction({
      amount: expense.amount,
      type: "expense",
      category: expense.category,
      accountId: accounts[0]?.id || "",
      note: [expense.title, expense.note].filter(Boolean).join(" · "),
      dateKey: expense.date
    });
    setScreen("records");
  };

  const deleteExpense = async (id) => {
    await deleteTransaction(id);
  };

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <AuthScreen
        authError={authError}
        onSignIn={signIn}
        onSignUp={signUp}
        onGoogle={signInGoogle}
      />
    );
  }

  return (
    <main className="stage">
      <section className="app-shell" aria-label="CashPilot student budget planner">
        <StatusBar />
        <Sidebar active={screen} setScreen={setScreen} totals={totals} />
        <div className="screen">
          <DesktopHeader screen={screen} setScreen={setScreen} onLogout={logOut} />
          {(dataError || loadingData) && (
            <div className={`app-notice ${dataError ? "error" : ""}`}>
              {dataError || "Syncing your budget..."}
            </div>
          )}
          {screen === "home" && (
            <HomeScreen
              expenses={expenses}
              totals={totals}
              settings={{ ...settings, allowance: summary.totalIncome || settings.allowance }}
              goals={goals}
              aiOpen={aiOpen}
              onDismissAi={() => setAiOpen(false)}
              onAdd={() => setScreen("add")}
              onRecords={() => setScreen("records")}
            />
          )}
          {screen === "add" && <AddExpenseScreen onAdd={addExpense} onOpenModal={() => setModalOpen(true)} />}
          {screen === "records" && (
            <RecordsScreen
              query={query}
              setQuery={setQuery}
              expenses={expenses}
              onDelete={deleteExpense}
              onAdd={() => setScreen("add")}
            />
          )}
          {screen === "budget" && <BudgetScreen settings={settings} setSettings={setSettings} totals={totals} />}
          {screen === "calendar" && <CalendarScreen expenses={expenses} totals={totals} onAdd={() => setScreen("add")} />}
          {screen === "inbox" && <InboxScreen totals={totals} onBudget={() => setScreen("budget")} />}
        </div>
        <BottomTabs active={screen} setScreen={setScreen} />
      </section>
      {modalOpen && <StudentModal onClose={() => setModalOpen(false)} />}
    </main>
  );
}

function transactionToExpense(tx) {
  const [title, note] = String(tx.note || tx.category || "Expense").split(" · ");
  return {
    id: tx.id,
    title: title || tx.category || "Expense",
    amount: Number(tx.amount || 0),
    category: tx.category || "Other",
    date: tx.dateKey || today(),
    note: note || "",
    type: tx.type
  };
}

const navItems = [
  { id: "home", icon: Home, label: "Dashboard" },
  { id: "records", icon: Search, label: "Records" },
  { id: "add", icon: Plus, label: "Add" },
  { id: "calendar", icon: CalendarDays, label: "Calendar" },
  { id: "budget", icon: ArrowRightLeft, label: "Budget" }
];

function Sidebar({ active, setScreen, totals }) {
  return (
    <aside className="sidebar">
      <div className="brand-mark">
        <Sparkles size={18} />
        <span>CashPilot</span>
      </div>
      <nav className="side-nav" aria-label="CashPilot sections">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`side-nav-item pressable ${active === item.id ? "active" : ""}`}
              onClick={() => setScreen(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-card">
        <p>Left this month</p>
        <strong>{currency(totals.left)}</strong>
        <span>{currency(totals.dailyLimit)} daily runway</span>
      </div>
    </aside>
  );
}

function DesktopHeader({ screen, setScreen, onLogout }) {
  const titleMap = {
    home: "Student dashboard",
    add: "Log expense",
    records: "Daily records",
    budget: "Monthly budget",
    calendar: "Expense calendar",
    inbox: "Smart nudges"
  };

  return (
    <header className="desktop-header">
      <div>
        <p>College budget planner</p>
        <h1>{titleMap[screen]}</h1>
      </div>
      <div className="desktop-actions">
        <button className="invite pressable" onClick={() => setScreen("calendar")}>
          <CalendarDays size={15} />
          May 2026
        </button>
        <button className="icon-ring pressable" aria-label="Notifications" onClick={() => setScreen("inbox")}>
          <Bell size={19} />
        </button>
        <button className="primary-button compact pressable" onClick={() => setScreen("add")}>
          <Plus size={17} />
          Add expense
        </button>
        <button className="icon-ring pressable" aria-label="Sign out" onClick={onLogout}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

function StatusBar() {
  return (
    <div className="status-bar">
      <span>11:31</span>
      <div className="dynamic-island" />
      <div className="status-icons">
        <span className="signal" />
        <span className="wifi" />
        <span className="battery" />
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="stage">
      <section className="auth-card">
        <div className="brand-mark">
          <Sparkles size={18} />
          <span>CashPilot</span>
        </div>
        <p className="auth-subtitle">Loading your student budget...</p>
      </section>
    </main>
  );
}

function AuthScreen({ authError, onSignIn, onSignUp, onGoogle }) {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [localError, setLocalError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setLocalError("");
    try {
      if (mode === "signup") {
        await onSignUp(form.email, form.password, form.name);
      } else {
        await onSignIn(form.email, form.password);
      }
    } catch (error) {
      setLocalError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setLocalError("");
    try {
      await onGoogle();
    } catch (error) {
      setLocalError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="stage auth-stage">
      <section className="auth-card">
        <div className="brand-mark">
          <Sparkles size={18} />
          <span>CashPilot</span>
        </div>
        <h1>{mode === "signup" ? "Create your student wallet" : "Welcome back"}</h1>
        <p className="auth-subtitle">Sign in to sync expenses, calendar marks, and budget records across devices.</p>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label>
              <span>Name</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" />
            </label>
          )}
          <label>
            <span>Email</span>
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@college.edu" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 6 characters" />
          </label>
          {(localError || authError) && <p className="form-error">{localError || authError}</p>}
          <button className="primary-button pressable" disabled={busy} type="submit">
            {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button className="google-button pressable" disabled={busy} onClick={google}>
          Continue with Google
        </button>
        <button className="auth-switch pressable" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </section>
    </main>
  );
}

function HomeScreen({ expenses, totals, settings, goals, aiOpen, onDismissAi, onAdd, onRecords }) {
  return (
    <div className="page home-page">
      <div className="home-actions">
        <button className="invite pressable">
          <CalendarDays size={15} />
          May
        </button>
        <div className="home-action-right">
          <button className="icon-ring pressable" aria-label="Notifications">
            <Bell size={19} />
          </button>
          <button className="avatar pressable" aria-label="Profile" />
        </div>
      </div>

      <section className="balance-block">
        <p className="eyebrow">Monthly money left <span>·</span> Student wallet</p>
        <h1>{currency(totals.left)}</h1>
        <AreaChart />
      </section>

      <div className="stat-row">
        <MiniStat title="Spent today" percent="live" value={currency(totals.todaySpent)} />
        <MiniStat title="Monthly spend" percent={`${expenses.length} logs`} value={currency(totals.spent)} />
      </div>

      {aiOpen && (
        <section className="ai-card pressable">
          <button className="close-button" aria-label="Dismiss forecast" onClick={onDismissAi}>
            <X size={15} />
          </button>
          <div className="ai-label">
            <Sparkles size={16} />
            <span>CashPilot student forecast</span>
          </div>
          <div className="ai-content">
            <h2>{totals.left >= settings.savingsGoal ? "You can hit this month's savings goal." : "Cut snacks by ₹80/day to stay on track."}</h2>
            <button className="dark-pill pressable" onClick={onAdd}>
              Log spend
            </button>
          </div>
        </section>
      )}

      <button className="goals-header pressable" onClick={onRecords}>
        <span>Records</span>
        <b>{expenses.length}</b>
      </button>

      <div className="desktop-home-grid">
        <BudgetCard icon={<Wallet size={20} />} title="Monthly allowance" value={currency(settings.allowance)} caption="Pocket money, UPI, cash" />
        <BudgetCard icon={<Target size={20} />} title="Savings target" value={currency(settings.savingsGoal)} caption={`${Math.round(totals.savingsProgress)}% reachable right now`} />
        <BudgetCard icon={<ReceiptText size={20} />} title="Daily runway" value={currency(totals.dailyLimit)} caption="Suggested spend per day" />
      </div>

      <CategoryBreakdown totals={totals} />
      <RecentExpenses expenses={expenses.slice(0, 4)} />
      <GoalPreview goals={goals} />
    </div>
  );
}

function AreaChart() {
  return (
    <svg className="area-chart" viewBox="0 0 340 165" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#a98df5" stopOpacity="0.58" />
          <stop offset="78%" stopColor="#7c5cbf" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#0d0d0d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="chart-line"
        d="M0 90 C22 80 28 102 48 92 C70 80 72 65 96 70 C122 76 122 42 150 52 C178 62 190 26 215 34 C240 44 246 82 270 74 C296 66 306 98 340 86"
      />
      <path
        d="M0 90 C22 80 28 102 48 92 C70 80 72 65 96 70 C122 76 122 42 150 52 C178 62 190 26 215 34 C240 44 246 82 270 74 C296 66 306 98 340 86 L340 165 L0 165 Z"
        fill="url(#chartFill)"
      />
    </svg>
  );
}

function MiniStat({ title, percent, value }) {
  return (
    <section className="mini-stat pressable">
      <p>{title}</p>
      <span>{percent}</span>
      <strong>{value}</strong>
    </section>
  );
}

function BudgetCard({ icon, title, value, caption }) {
  return (
    <section className="budget-card pressable">
      <span>{icon}</span>
      <p>{title}</p>
      <strong>{value}</strong>
      <small>{caption}</small>
    </section>
  );
}

function CategoryBreakdown({ totals }) {
  const max = Math.max(...totals.byCategory.map((item) => item.total), 1);

  return (
    <section className="student-panel category-panel">
      <div className="panel-heading">
        <h2>Category spend</h2>
        <span>This month</span>
      </div>
      {totals.byCategory.map((item) => {
        const Icon = item.icon;
        return (
          <div className="category-row" key={item.name}>
            <span className="category-icon" style={{ background: item.color }}>
              <Icon size={17} />
            </span>
            <div>
              <strong>{item.name}</strong>
              <div className="progress">
                <span style={{ width: `${(item.total / max) * 100}%` }} />
              </div>
            </div>
            <b>{currency(item.total)}</b>
          </div>
        );
      })}
    </section>
  );
}

function RecentExpenses({ expenses }) {
  return (
    <section className="student-panel recent-panel">
      <div className="panel-heading">
        <h2>Recent expenses</h2>
        <span>Latest logs</span>
      </div>
      <div className="expense-list">
        {expenses.map((item) => (
          <ExpenseRow key={item.id} expense={item} />
        ))}
      </div>
    </section>
  );
}

function GoalPreview({ goals }) {
  if (!goals.length) return null;

  return (
    <section className="student-panel goal-preview">
      <div className="panel-heading">
        <h2>Student goals</h2>
        <span>{goals.length} active</span>
      </div>
      {goals.slice(0, 3).map((goal) => {
        const progress = goal.targetAmount ? Math.min(100, (Number(goal.savedAmount || 0) / Number(goal.targetAmount)) * 100) : 0;
        return (
          <div className="category-row" key={goal.id}>
            <span className="category-icon" style={{ background: "#d4c8f5" }}>
              <Target size={17} />
            </span>
            <div>
              <strong>{goal.title}</strong>
              <div className="progress">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
            <b>{currency(goal.savedAmount)} / {currency(goal.targetAmount)}</b>
          </div>
        );
      })}
    </section>
  );
}

function AddExpenseScreen({ onAdd, onOpenModal }) {
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "Food",
    date: today(),
    note: ""
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !amount) {
      setError("Add a name and amount before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onAdd({ ...form, amount });
    } catch {
      setError("Could not save this expense. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page form-page">
      <section className="hero-copy utility-hero">
        <h1>Log today's<br /><span>expense</span></h1>
        <p>Add canteen meals, travel, books, subscriptions, hangouts, or any tiny UPI spend before it disappears from memory.</p>
      </section>

      <form className="expense-form" onSubmit={submit}>
        <label>
          <span>Expense name</span>
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Maggi at canteen" />
        </label>
        <label>
          <span>Amount in rupees</span>
          <input inputMode="numeric" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="₹ 0" />
        </label>
        <label>
          <span>Category</span>
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            {categories.map((item) => <option key={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        </label>
        <label className="wide-field">
          <span>Note</span>
          <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Optional note" />
        </label>
        <div className="form-actions">
          <button className="primary-button pressable" type="submit" disabled={saving}>{saving ? "Saving..." : "Save expense"}</button>
          <button className="outline-pill pressable" type="button" onClick={onOpenModal}>Split with friend</button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  );
}

function RecordsScreen({ query, setQuery, expenses, onDelete, onAdd }) {
  const filtered = expenses.filter((item) =>
    `${item.title} ${item.category} ${item.note}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="page utility-page">
      <section className="hero-copy utility-hero">
        <h1>Daily records</h1>
        <p>Search, review, and clean up every rupee you logged this month.</p>
      </section>
      <label className="search-field">
        <Search size={18} />
        <input placeholder="Search food, auto, books..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="record-toolbar">
        <span>{filtered.length} records</span>
        <button className="dark-pill pressable" onClick={onAdd}>Add new</button>
      </div>
      <div className="expense-list full">
        {filtered.map((item) => (
          <ExpenseRow key={item.id} expense={item} onDelete={onDelete} />
        ))}
      </div>
      {filtered.length === 0 && <p className="empty-state">No matching expense records yet.</p>}
    </div>
  );
}

function ExpenseRow({ expense, onDelete }) {
  const category = categories.find((item) => item.name === expense.category) || categories.at(-1);
  const Icon = category.icon;

  return (
    <article className="expense-row">
      <span className="category-icon" style={{ background: category.color }}>
        <Icon size={17} />
      </span>
      <div>
        <strong>{expense.title}</strong>
        <small>{expense.category} · {expense.date}{expense.note ? ` · ${expense.note}` : ""}</small>
      </div>
      <b>{currency(expense.amount)}</b>
      {onDelete && (
        <button className="delete-expense pressable" aria-label={`Delete ${expense.title}`} onClick={() => onDelete(expense.id)}>
          <X size={14} />
        </button>
      )}
    </article>
  );
}

function BudgetScreen({ settings, setSettings, totals }) {
  const update = (key, value) => {
    setSettings((current) => ({ ...current, [key]: Number(value.replace(/[^0-9]/g, "")) || 0 }));
  };

  return (
    <div className="page budget-page">
      <section className="hero-copy goals-hero">
        <h1>Your monthly<br />student budget</h1>
        <p>Tune your allowance and savings goal. CashPilot recalculates what you can spend each day.</p>
      </section>
      <div className="detail-grid">
        <section className="detail-card tint">
          <p>Monthly allowance</p>
          <label className="money-input">
            <span>₹</span>
            <input value={settings.allowance} inputMode="numeric" onChange={(event) => update("allowance", event.target.value)} />
          </label>
        </section>
        <section className="detail-card">
          <p>Savings goal</p>
          <label className="money-input">
            <span>₹</span>
            <input value={settings.savingsGoal} inputMode="numeric" onChange={(event) => update("savingsGoal", event.target.value)} />
          </label>
        </section>
        <section className="detail-card">
          <p>Spent so far</p>
          <strong>{currency(totals.spent)}</strong>
          <small>Across all logged records.</small>
        </section>
        <section className="detail-card">
          <p>Safe daily spend</p>
          <strong>{currency(totals.dailyLimit)}</strong>
          <small>Based on the money left this month.</small>
        </section>
      </div>
      <section className="milestone-card pressable">
        <div className="milestone-title">
          <Sparkles size={16} />
          <h2>{Math.round(totals.savingsProgress)}% of savings target covered</h2>
        </div>
        <p>Keep your remaining balance above {currency(settings.savingsGoal)} to finish the month with your planned savings.</p>
        <div className="progress big-progress">
          <span style={{ width: `${totals.savingsProgress}%` }} />
        </div>
      </section>
    </div>
  );
}

function CalendarScreen({ expenses, totals, onAdd }) {
  const [selectedDate, setSelectedDate] = useState(today());
  const monthDate = new Date(`${selectedDate.slice(0, 7)}-01T00:00:00`);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthName = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];
  const maxDaySpend = Math.max(...Object.values(totals.byDate), 1);
  const selectedExpenses = expenses.filter((item) => item.date === selectedDate);
  const selectedTotal = totals.byDate[selectedDate] || 0;

  return (
    <div className="page calendar-page">
      <section className="hero-copy utility-hero">
        <h1>Expense<br /><span>calendar</span></h1>
        <p>Each marked day shows how much you spent. Darker purple means heavier spending.</p>
      </section>

      <section className="calendar-shell">
        <div className="calendar-head">
          <div>
            <p>Viewing</p>
            <h2>{monthName}</h2>
          </div>
          <button className="dark-pill pressable" onClick={onAdd}>Add expense</button>
        </div>

        <div className="weekday-row">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
        </div>

        <div className="calendar-grid">
          {cells.map((day, index) => {
            if (!day) return <span className="calendar-cell empty" key={`empty-${index}`} />;
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const amount = totals.byDate[dateKey] || 0;
            const intensity = amount ? 0.22 + (amount / maxDaySpend) * 0.68 : 0;
            return (
              <button
                key={dateKey}
                className={`calendar-cell pressable ${dateKey === selectedDate ? "selected" : ""} ${amount ? "has-spend" : ""}`}
                onClick={() => setSelectedDate(dateKey)}
                style={{ "--spend-alpha": intensity }}
              >
                <span>{day}</span>
                {amount > 0 && <b>{currency(amount)}</b>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="student-panel calendar-detail">
        <div className="panel-heading">
          <h2>{selectedDate}</h2>
          <span>{currency(selectedTotal)}</span>
        </div>
        <div className="expense-list">
          {selectedExpenses.map((item) => <ExpenseRow key={item.id} expense={item} />)}
        </div>
        {selectedExpenses.length === 0 && <p className="empty-state">No expenses logged for this date.</p>}
      </section>
    </div>
  );
}

function InboxScreen({ totals, onBudget }) {
  const messages = [
    ["Daily limit", `You can spend about ${currency(totals.dailyLimit)} per day for the rest of the month.`],
    ["Food check", `${currency(totals.byCategory.find((item) => item.name === "Food")?.total)} spent on food so far.`],
    ["Savings goal", totals.left > 0 ? `${currency(totals.left)} left after all logged expenses.` : "You are over budget. Update allowance or reduce spends."]
  ];

  return (
    <div className="page utility-page">
      <section className="hero-copy utility-hero">
        <h1>Smart nudges</h1>
        <p>Small, practical reminders for surviving college spending without spreadsheet pain.</p>
      </section>
      <div className="message-list">
        {messages.map(([title, body]) => (
          <button className="message-card pressable" key={title} onClick={onBudget}>
            <span><Mail size={18} /></span>
            <div>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}

function BottomTabs({ active, setScreen }) {
  return (
    <nav className="bottom-tabs" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isAction = item.id === "add";
        return (
          <button
            key={item.id}
            className={`tab-button pressable ${active === item.id ? "active" : ""} ${isAction ? "action-tab" : ""}`}
            aria-label={item.label}
            onClick={() => setScreen(item.id)}
          >
            <Icon size={isAction ? 25 : 21} />
          </button>
        );
      })}
    </nav>
  );
}

function StudentModal({ onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Split expense">
      <section className="modal-card">
        <button className="close-button" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
        <div className="modal-icon">
          <IndianRupee size={22} />
        </div>
        <h2>Split with friend</h2>
        <p>Placeholder for splitting a canteen bill, cab fare, or group project purchase. For now, log your own share in rupees.</p>
        <button className="primary-button pressable" onClick={onClose}>
          Got it
        </button>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
