import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeIndianRupee,
  Bell,
  CheckCircle2,
  ChevronDown,
  Download,
  Factory,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Plus,
  ReceiptIndianRupee,
  Search,
  ShieldCheck,
  Tags,
  UserRoundCheck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { demoAccounts, initialData, modules, ROLE, tableMeta } from "./data";

const SESSION_KEY = "chatru-erp-session";
const DATA_KEY = "chatru-erp-data";

const iconMap = {
  BadgeIndianRupee,
  Factory,
  Handshake,
  PackageSearch,
  ReceiptIndianRupee,
  ShieldCheck,
  Tags,
  UsersRound,
  WalletCards,
};

function getAllowedRoles(routeKey) {
  return modules.find((item) => item.key === routeKey)?.roles ?? [];
}

function safeRouteFromHash() {
  const route = window.location.hash.replace("#/", "");
  return modules.some((item) => item.key === route) ? route : "finance-dashboard";
}

function canAccess(user, routeKey) {
  if (!user) return false;
  return getAllowedRoles(routeKey).includes(user.role);
}

function getDefaultRoute(user) {
  return modules.find((item) => item.roles.includes(user.role))?.key ?? "inventory";
}

function formatCurrencyNumber(value) {
  const raw = String(value).toLowerCase();
  const number = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(number)) return 0;
  if (raw.includes("k")) return number / 100;
  if (raw.includes("l")) return number;
  return number / 100000;
}

function usePersistedData() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(DATA_KEY);
      return saved ? JSON.parse(saved) : initialData;
    } catch {
      return initialData;
    }
  });

  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }, [data]);

  return [data, setData];
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [route, setRoute] = useState(() => safeRouteFromHash());
  const [data, setData] = usePersistedData();

  useEffect(() => {
    const onHashChange = () => setRoute(safeRouteFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      if (!canAccess(session, route)) {
        navigate(getDefaultRoute(session));
      }
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [session, route]);

  function navigate(nextRoute) {
    window.location.hash = `/${nextRoute}`;
    setRoute(nextRoute);
  }

  function handleLogin(credentials) {
    const match = demoAccounts.find(
      (account) =>
        account.email.toLowerCase() === credentials.email.toLowerCase().trim() &&
        account.password === credentials.password,
    );

    if (!match) {
      return { ok: false, message: "Email or password is incorrect." };
    }

    const user = {
      id: match.id,
      name: match.name,
      email: match.email,
      role: match.role,
      avatar: match.avatar,
    };
    setSession(user);
    navigate(getDefaultRoute(user));
    return { ok: true };
  }

  function handleLogout() {
    setSession(null);
    window.location.hash = "";
    setRoute("finance-dashboard");
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <ProtectedRoute user={session} routeKey={route}>
      <AppLayout
        user={session}
        activeRoute={route}
        onNavigate={navigate}
        onLogout={handleLogout}
      >
        <ErpModuleRoute
          routeKey={route}
          user={session}
          data={data}
          setData={setData}
          onNavigate={navigate}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}

function ProtectedRoute({ user, routeKey, children }) {
  if (!canAccess(user, routeKey)) {
    return (
      <div className="fallback-screen">
        <div className="fallback-card">
          <AlertTriangle size={34} />
          <h1>Access restricted</h1>
          <p>{user.role} does not have permission for this module.</p>
        </div>
      </div>
    );
  }

  return children;
}

function ErpModuleRoute({ routeKey, user, data, setData, onNavigate }) {
  if (routeKey === "finance-dashboard") {
    return <FinanceDashboard data={data} onNavigate={onNavigate} />;
  }

  if (routeKey === "operations-dashboard") {
    return <OperationsDashboard data={data} onNavigate={onNavigate} />;
  }

  const config = tableMeta[routeKey];
  if (!config) {
    return <EmptyState title="Module unavailable" description="This route is not registered." />;
  }

  return (
    <ModulePage
      routeKey={routeKey}
      user={user}
      config={config}
      records={data[routeKey] ?? []}
      setRecords={(records) => setData((current) => ({ ...current, [routeKey]: records }))}
    />
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("admin@chatru.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const result = onLogin({ email, password });
    setError(result.ok ? "" : result.message);
  }

  return (
    <main className="login-screen">
      <section className="login-brand">
        <div className="brand-mark">CE</div>
        <p>Chatru ERP</p>
        <h1>Control room for finance, operations, and access.</h1>
        <div className="login-metrics" aria-label="Business snapshot">
          <div>
            <strong>Rs 30.1L</strong>
            <span>July revenue</span>
          </div>
          <div>
            <strong>94%</strong>
            <span>Stock accuracy</span>
          </div>
          <div>
            <strong>18</strong>
            <span>Open approvals</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="panel-heading">
          <span className="eyebrow">Secure access</span>
          <h2>Sign in</h2>
        </div>
        <form onSubmit={submit} className="login-form">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-action" type="submit">
            <ShieldCheck size={18} />
            Login
          </button>
        </form>
        <div className="quick-logins">
          {demoAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
              }}
            >
              {account.role}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function AppLayout({ user, activeRoute, onNavigate, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const visibleModules = modules.filter((item) => item.roles.includes(user.role));
  const activeModule = modules.find((item) => item.key === activeRoute);

  function choose(routeKey) {
    onNavigate(routeKey);
    setOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-top">
          <button className="icon-button mobile-close" type="button" onClick={() => setOpen(false)}>
            <X size={19} />
          </button>
          <div className="brand-row">
            <div className="brand-mark small">CE</div>
            <div>
              <strong>Chatru ERP</strong>
              <span>Workspace</span>
            </div>
          </div>
        </div>

        <nav className="nav-list" aria-label="ERP modules">
          {visibleModules.map((item) => {
            const Icon = iconMap[item.icon] ?? LayoutDashboard;
            return (
              <button
                key={item.key}
                className={item.key === activeRoute ? "active" : ""}
                type="button"
                onClick={() => choose(item.key)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-profile">
          <div className="avatar">{user.avatar}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" type="button" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <span className="eyebrow">{user.role}</span>
              <h1>{activeModule?.label ?? "Dashboard"}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <button className="ghost-action" type="button" onClick={onLogout}>
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </header>
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}

function FinanceDashboard({ data, onNavigate }) {
  const paidSales = data.sales.filter((sale) => sale.status === "Paid");
  const pendingSales = data.sales.filter((sale) => sale.status !== "Paid");
  const totalSales = data.sales.reduce((sum, sale) => sum + formatCurrencyNumber(sale.amount), 0);
  const totalExpenses = data.expenses.reduce(
    (sum, expense) => sum + formatCurrencyNumber(expense.amount),
    0,
  );

  return (
    <div className="page-stack">
      <section className="dashboard-grid">
        <MetricCard
          label="Revenue"
          value="Rs 30.1L"
          trend="+12.5%"
          tone="emerald"
          icon={ArrowUpRight}
        />
        <MetricCard
          label="Receivables"
          value="Rs 16.3L"
          trend={`${pendingSales.length} pending`}
          tone="amber"
          icon={ChevronDown}
        />
        <MetricCard
          label="Expenses"
          value="Rs 3.84L"
          trend="-4.1%"
          tone="rose"
          icon={ArrowDownRight}
        />
        <MetricCard
          label="Net Movement"
          value={`Rs ${(totalSales - totalExpenses).toFixed(1)}L`}
          trend={`${paidSales.length} cleared`}
          tone="blue"
          icon={CheckCircle2}
        />
      </section>

      <section className="split-grid">
        <div className="surface">
          <div className="section-title">
            <div>
              <span className="eyebrow">Cash flow</span>
              <h2>Monthly movement</h2>
            </div>
          </div>
          <div className="bar-chart" aria-label="Revenue chart">
            {[
              ["Apr", 52],
              ["May", 66],
              ["Jun", 58],
              ["Jul", 82],
            ].map(([label, height]) => (
              <div className="bar-column" key={label}>
                <span style={{ height: `${height}%` }} />
                <small>{label}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="surface">
          <div className="section-title">
            <div>
              <span className="eyebrow">Approvals</span>
              <h2>Finance queue</h2>
            </div>
            <button className="text-action" type="button" onClick={() => onNavigate("expenses")}>
              Open
            </button>
          </div>
          <div className="timeline">
            {data.expenses.map((expense) => (
              <div className="timeline-row" key={expense.id}>
                <StatusDot status={expense.status} />
                <div>
                  <strong>{expense.category}</strong>
                  <span>{expense.owner}</span>
                </div>
                <b>{expense.amount}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ModulePreview
        title="Recent sales"
        rows={data.sales}
        columns={tableMeta.sales.columns}
        onOpen={() => onNavigate("sales")}
      />
    </div>
  );
}

function OperationsDashboard({ data, onNavigate }) {
  const critical = data.inventory.filter((item) => ["Low", "Critical"].includes(item.status));
  const activeEmployees = data.employees.filter((employee) => employee.status === "Active");

  return (
    <div className="page-stack">
      <section className="dashboard-grid">
        <MetricCard
          label="Inventory Health"
          value={`${data.inventory.length - critical.length}/${data.inventory.length}`}
          trend={`${critical.length} need action`}
          tone="amber"
          icon={PackageSearch}
        />
        <MetricCard
          label="Active People"
          value={activeEmployees.length}
          trend={`${data.employees.length} total`}
          tone="emerald"
          icon={UserRoundCheck}
        />
        <MetricCard label="Vendors" value={data.vendors.length} trend="2 preferred" tone="blue" icon={Handshake} />
        <MetricCard label="Open Tasks" value="18" trend="5 urgent" tone="rose" icon={AlertTriangle} />
      </section>

      <section className="split-grid">
        <ModulePreview
          title="Inventory risk"
          rows={critical}
          columns={tableMeta.inventory.columns}
          onOpen={() => onNavigate("inventory")}
        />
        <div className="surface">
          <div className="section-title">
            <div>
              <span className="eyebrow">Vendor pulse</span>
              <h2>Supplier performance</h2>
            </div>
            <button className="text-action" type="button" onClick={() => onNavigate("vendors")}>
              Open
            </button>
          </div>
          <div className="vendor-list">
            {data.vendors.map((vendor) => (
              <div key={vendor.id} className="vendor-row">
                <div>
                  <strong>{vendor.name}</strong>
                  <span>{vendor.category}</span>
                </div>
                <meter min="0" max="5" value={vendor.rating} />
                <b>{vendor.rating}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ModulePreview
        title="Team snapshot"
        rows={data.employees}
        columns={tableMeta.employees.columns}
        onOpen={() => onNavigate("employees")}
      />
    </div>
  );
}

function ModulePage({ routeKey, user, config, records, setRecords }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);

  const statuses = useMemo(
    () => ["All", ...Array.from(new Set(records.map((record) => record.status).filter(Boolean)))],
    [records],
  );

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const values = Object.values(record).join(" ").toLowerCase();
      const matchesQuery = values.includes(query.toLowerCase());
      const matchesStatus = status === "All" || record.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, records, status]);

  const totalAmount = useMemo(() => {
    return records.reduce((sum, record) => {
      const amount = record.amount ?? record.outstanding ?? record.budget ?? record.payroll;
      return sum + formatCurrencyNumber(amount);
    }, 0);
  }, [records]);

  function addRecord(values) {
    const idKey =
      config.columns.find((column) => ["id", "sku", "order"].includes(column.key))?.key ??
      config.columns[0].key;
    const newRecord = {
      [idKey]: makeId(routeKey, records.length + 1),
      ...values,
    };
    setRecords([newRecord, ...records]);
    setModalOpen(false);
  }

  function exportCsv() {
    const header = config.columns.map((column) => column.label).join(",");
    const body = filtered
      .map((record) =>
        config.columns
          .map((column) => `"${String(record[column.key] ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chatru-${routeKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-stack">
      <section className="module-hero">
        <div>
          <span className="eyebrow">{user.role}</span>
          <h2>{config.title}</h2>
          <p>{config.subtitle}</p>
        </div>
        <div className="hero-actions">
          <button className="ghost-action" type="button" onClick={exportCsv}>
            <Download size={17} />
            Export
          </button>
          <button className="primary-action compact" type="button" onClick={() => setModalOpen(true)}>
            <Plus size={18} />
            {config.addLabel}
          </button>
        </div>
      </section>

      <section className="dashboard-grid compact-grid">
        <MetricCard label="Records" value={records.length} trend={`${filtered.length} visible`} tone="blue" icon={LayoutDashboard} />
        <MetricCard label="Active" value={records.filter((record) => ["Active", "Paid", "Approved", "Healthy", "Preferred"].includes(record.status)).length} trend="Good state" tone="emerald" icon={CheckCircle2} />
        <MetricCard label="Attention" value={records.filter((record) => ["Pending", "Review", "Low", "Critical", "Overdue"].includes(record.status)).length} trend="Needs review" tone="amber" icon={AlertTriangle} />
        <MetricCard label="Value" value={totalAmount ? `Rs ${totalAmount.toFixed(1)}L` : "-"} trend="Tracked" tone="rose" icon={BadgeIndianRupee} />
      </section>

      <section className="surface table-surface">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}`}
            />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <DataTable columns={config.columns} rows={filtered} />
      </section>

      {modalOpen && (
        <RecordModal config={config} onClose={() => setModalOpen(false)} onSubmit={addRecord} />
      )}
    </div>
  );
}

function MetricCard({ label, value, trend, tone, icon: Icon }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">
        <Icon size={20} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </article>
  );
}

function ModulePreview({ title, rows, columns, onOpen }) {
  return (
    <div className="surface table-surface">
      <div className="section-title">
        <div>
          <span className="eyebrow">Live module</span>
          <h2>{title}</h2>
        </div>
        <button className="text-action" type="button" onClick={onOpen}>
          Open
        </button>
      </div>
      <DataTable columns={columns.slice(0, 5)} rows={rows.slice(0, 5)} compact />
    </div>
  );
}

function DataTable({ columns, rows, compact = false }) {
  if (!rows.length) {
    return <EmptyState title="No records" description="Try changing the filter." />;
  }

  return (
    <div className="table-wrap">
      <table className={compact ? "compact-table" : ""}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${Object.values(row).join("-")}-${index}`}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.key === "status" ? (
                    <StatusPill status={row[column.key]} />
                  ) : (
                    row[column.key] ?? "-"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordModal({ config, onClose, onSubmit }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      config.formFields.map((field) => [
        field,
        field === "status" ? "Active" : field === "date" ? new Date().toISOString().slice(0, 10) : "",
      ]),
    ),
  );

  function submit(event) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label={config.addLabel}>
        <div className="modal-header">
          <h2>{config.addLabel}</h2>
          <button className="icon-button" type="button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          {config.formFields.map((field) => (
            <label key={field}>
              {toTitle(field)}
              {field === "status" || field === "role" ? (
                <select
                  value={values[field]}
                  onChange={(event) => setValues({ ...values, [field]: event.target.value })}
                >
                  {(field === "role"
                    ? Object.values(ROLE)
                    : ["Active", "Pending", "Approved", "Review", "Healthy", "Low", "Critical", "Paid"]
                  ).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field === "date" ? "date" : "text"}
                  value={values[field]}
                  required
                  onChange={(event) => setValues({ ...values, [field]: event.target.value })}
                />
              )}
            </label>
          ))}
          <div className="modal-actions">
            <button className="ghost-action" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-action compact" type="submit">
              Save
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function StatusPill({ status }) {
  return <span className={`status-pill ${statusTone(status)}`}>{status}</span>;
}

function StatusDot({ status }) {
  return <span className={`status-dot ${statusTone(status)}`} aria-label={status} />;
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <AlertTriangle size={24} />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function statusTone(status = "") {
  const normalized = status.toLowerCase();
  if (["active", "paid", "approved", "healthy", "preferred"].includes(normalized)) {
    return "positive";
  }
  if (["pending", "review", "low", "on leave"].includes(normalized)) {
    return "warning";
  }
  if (["critical", "overdue", "limited"].includes(normalized)) {
    return "danger";
  }
  return "neutral";
}

function makeId(routeKey, index) {
  const prefix = {
    employees: "EMP",
    inventory: "SKU",
    vendors: "VEN",
    sales: "ORD",
    expenses: "EXP",
    categories: "CAT",
    users: "USR",
  }[routeKey];
  return `${prefix}-${String(900 + index).padStart(3, "0")}`;
}

function toTitle(value) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}
