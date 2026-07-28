import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  Bell,
  CalendarCheck2,
  CheckCircle2,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  NotebookTabs,
  PackageSearch,
  Plus,
  ReceiptIndianRupee,
  Search,
  ShieldCheck,
  Tags,
  Truck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  adminUser,
  categories,
  dailyPurchases as seededPurchases,
  employees,
  expenses as seededExpenses,
  materials,
  navGroups,
  products,
  users,
  vendors,
} from "./data";
import { listEmployees, listSalesBills, saveEmployee, saveSalesBill } from "./db";

const SESSION_KEY = "chatru-halwai-session";
const today = () => new Date().toISOString().slice(0, 10);

const iconMap = {
  BadgeIndianRupee,
  CalendarCheck2,
  Handshake,
  LayoutDashboard,
  NotebookTabs,
  PackageSearch,
  ReceiptIndianRupee,
  ShieldCheck,
  Tags,
  Truck,
  UsersRound,
  WalletCards,
};

function money(value) {
  return `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
}

function normalizeEmployee(employee, index = 0) {
  const id = employee.id || employee.employeeCode || `EMP-${String(index + 1).padStart(3, "0")}`;
  const contact = employee.contact ?? employee.phone ?? "-";
  const aadhaar = employee.aadhaar ?? employee.aadhaarCard ?? "-";
  const joining = employee.joining ?? employee.joiningDate ?? today();

  return {
    ...employee,
    id: String(id),
    employeeCode: employee.employeeCode || String(id),
    name: employee.name || "Unnamed employee",
    role: employee.role || "Staff",
    salary: Number(employee.salary || 0),
    contact: contact || "-",
    phone: employee.phone || (contact === "-" ? "" : contact),
    joining,
    joiningDate: employee.joiningDate || joining,
    address: employee.address || "-",
    aadhaar: aadhaar || "-",
    aadhaarCard: employee.aadhaarCard || (aadhaar === "-" ? "" : aadhaar),
    status: employee.status || "Absent",
  };
}

function normalizeStaff(records) {
  return records.map(normalizeEmployee).sort((a, b) => a.name.localeCompare(b.name));
}

function blankEmployeeForm() {
  return {
    name: "",
    role: "Karigar",
    contact: "",
    address: "",
    aadhaar: "",
    joining: today(),
    salary: "",
    shiftStart: "09:00:00",
    shiftEnd: "21:00:00",
  };
}

function useClock() {
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return clock;
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  });
  const [route, setRoute] = useState("operations");
  const [salesBills, setSalesBills] = useState([]);
  const [salesStatus, setSalesStatus] = useState("Loading DB");
  const [staff, setStaff] = useState(() => normalizeStaff(employees));
  const [employeeStatus, setEmployeeStatus] = useState("Loading DB");

  useEffect(() => {
    listSalesBills().then((records) => {
      setSalesBills(records);
      setSalesStatus("Live DB connected");
    });
    listEmployees(employees).then((records) => {
      setStaff(normalizeStaff(records));
      setEmployeeStatus("Live DB connected");
    });
  }, []);

  function login(credentials) {
    if (
      credentials.username.trim().toLowerCase() === adminUser.username &&
      credentials.password === adminUser.password
    ) {
      const user = { name: adminUser.name, role: adminUser.role, username: adminUser.username };
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      setSession(user);
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setRoute("operations");
  }

  async function persistBill(bill) {
    const result = await saveSalesBill(bill);
    if (result.source === "live") {
      const records = await listSalesBills();
      setSalesBills(records);
    } else {
      setSalesBills((records) => [bill, ...records.filter((record) => record.billNo !== bill.billNo)]);
    }
    setSalesStatus(result.source === "live" ? "Saved in live DB" : "Saved in local DB");
    return result;
  }

  async function persistEmployee(employee) {
    const result = await saveEmployee(employee);
    if (result.source === "live") {
      const records = await listEmployees([result.record, ...staff]);
      setStaff(normalizeStaff(records));
    } else {
      setStaff((records) =>
        normalizeStaff([result.record, ...records.filter((record) => record.id !== result.record.id)])
      );
    }
    setEmployeeStatus(result.source === "live" ? "Employee saved in live DB" : "Employee saved in local DB");
    return result;
  }

  if (!session) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <Shell user={session} route={route} onRoute={setRoute} onLogout={logout}>
      <RouteView
        route={route}
        staff={staff}
        employeeStatus={employeeStatus}
        salesBills={salesBills}
        salesStatus={salesStatus}
        onSaveBill={persistBill}
        onSaveEmployee={persistEmployee}
      />
    </Shell>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    setError(onLogin({ username, password }) ? "" : "Wrong username or password");
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <img className="brand-logo" src="/chatru-logo.png" alt="Chatru Halwai logo" />
        <h1>CHATRU HALWAI ERP</h1>
        <h2>Login</h2>
        <label>
          USERNAME
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          PASSWORD
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="action-button full" type="submit">
          Login
        </button>
      </form>
    </main>
  );
}

function Shell({ user, route, onRoute, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const clock = useClock();

  return (
    <div className="erp-shell">
      <aside className={`sidebar ${open ? "show" : ""}`}>
        <div className="brand-block">
          <button className="icon-button close-button" type="button" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
          <img src="/chatru-logo.png" alt="Chatru Halwai logo" />
          <div>
            <div className="brand-title">Chatru Halwai</div>
            <div className="brand-subtitle">SWEETS & NAMKEEN ERP</div>
          </div>
        </div>

        <nav className="nav-stack">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <span>{group.title.toUpperCase()}</span>
              {group.items.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                return (
                  <button
                    key={item.key}
                    className={`nav-item ${route === item.key ? "active" : ""}`}
                    type="button"
                    onClick={() => {
                      onRoute(item.key);
                      setOpen(false);
                    }}
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="live-card">
          <span>Live date & time</span>
          <strong>{clock.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong>
          <strong>{clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong>
          <p>Muzaffarnagar main shop</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button menu-button" type="button" onClick={() => setOpen(true)}>
            <Menu size={19} />
          </button>
          <div className="topbar-title">
            <span>Admin workspace</span>
            <h1>Chatru Halwai ERP</h1>
          </div>
          <div className="search-pill">
            <Search size={17} />
            <input type="search" placeholder="Search bills, vendors, stock" />
          </div>
          <div className="top-actions">
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="icon-button dark-icon" type="button" aria-label="Dark mode">
              <Moon size={18} />
            </button>
            <div className="user-chip">
              <strong>Chatru Halwai ERP</strong>
              <span>{user.name}</span>
            </div>
            <span className="db-badge">MySQL live</span>
            <button className="icon-button" type="button" onClick={onLogout} aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}

function RouteView({ route, staff, employeeStatus, salesBills, salesStatus, onSaveBill, onSaveEmployee }) {
  if (route === "operations") return <OperationsDashboard salesBills={salesBills} staff={staff} />;
  if (route === "finance") return <FinanceDashboard salesBills={salesBills} staff={staff} />;
  if (route === "sales-slip") {
    return <SalesSlipPage bills={salesBills} status={salesStatus} onSaveBill={onSaveBill} />;
  }
  if (route === "inventory") return <InventoryPage />;
  if (route === "vendor-payment") return <VendorPaymentPage />;
  if (route === "daily-vendors") return <DailyVendorsPage />;
  if (route === "employees") {
    return <EmployeesPage staff={staff} status={employeeStatus} onSaveEmployee={onSaveEmployee} />;
  }
  if (route === "attendance") return <AttendancePage staff={staff} />;
  if (route === "vendors") return <VendorsPage />;
  if (route === "expenses") return <ExpensesPage />;
  if (route === "categories") return <CategoriesPage />;
  if (route === "users") return <UsersPage />;
  return null;
}

function OperationsDashboard({ salesBills, staff }) {
  const todaysSales = totalForDate(salesBills, today());
  const totalExpenses = seededExpenses.reduce((sum, item) => sum + item.amount, 0);
  const vendorDues = vendors.reduce((sum, item) => sum + item.pending, 0);

  return (
    <Page>
      <Metrics
        items={[
          ["Today's sales", money(todaysSales), "Live"],
          ["Today's expenses", money(totalExpenses), "Live"],
          ["Staff present", `0 / ${staff.length}`, `${staff.length} absent`],
          ["Vendor dues", money(vendorDues), `${vendors.length} vendors`],
        ]}
      />
      <section className="grid two">
        <Panel title="Operations dashboard" subtitle="Today's shop pulse" action="New bill">
          <div className="batch-card">
            <span>FRESH BATCH</span>
            <strong>82%</strong>
            <p>Sweets, breakfast and namkeen ready for counter sale.</p>
          </div>
          {["Milk and ghee quality check", "Fresh jalebi counter live", "Gift box station stocked", "Thermal printer paper loaded"].map((item, index) => (
            <div className="check-row" key={item}>
              <CheckCircle2 size={17} />
              <span>{item}</span>
              <b>{index === 2 ? "Pending" : "Done"}</b>
            </div>
          ))}
        </Panel>
        <Panel title="Low stock" subtitle="Material alerts">
          <div className="stock-alerts">
            {materials
              .filter((material) => material.stock <= material.min)
              .map((material) => (
                <div key={material.name}>
                  <strong>{material.name}</strong>
                  <span>{material.category}</span>
                  <b>
                    {material.stock} {material.unit} left
                  </b>
                </div>
              ))}
          </div>
        </Panel>
      </section>
      <Panel title="Attendance" subtitle="Staff today">
        <DataTable
          columns={["Name", "Role", "Status"]}
          rows={staff.map((employee) => [employee.name, employee.role, employee.status || "Absent"])}
        />
      </Panel>
    </Page>
  );
}

function FinanceDashboard({ salesBills, staff }) {
  const monthSales = salesBills.reduce((sum, bill) => sum + bill.total, 0);
  const totalExpenses = seededExpenses.reduce((sum, item) => sum + item.amount, 0);
  const purchases = seededPurchases.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const salary = staff.reduce((sum, item) => sum + item.salary, 0);
  const vendorDues = vendors.reduce((sum, item) => sum + item.pending, 0);

  return (
    <Page>
      <div className="filter-row">
        <label>
          FROM DATE
          <input type="date" defaultValue="2026-07-01" />
        </label>
        <label>
          TO DATE
          <input type="date" defaultValue={today()} />
        </label>
      </div>
      <Metrics
        items={[
          ["Total sales", money(monthSales), "Date filtered"],
          ["Expenses", money(totalExpenses), "Shop running cost"],
          ["Purchases", money(purchases), "Raw material bought"],
          ["Salary paid", money(0), "Employee payments"],
        ]}
      />
      <Panel title="Finance dashboard" subtitle="Profit estimate">
        <div className="finance-ledger">
          {[
            ["Sales", money(monthSales)],
            ["Expenses", money(totalExpenses)],
            ["Purchases", money(purchases)],
            ["Salary paid", money(0)],
            ["Vendor outstanding", money(vendorDues)],
            ["Salary payable", money(salary)],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Expense summary" subtitle="Daily costs">
        <DataTable
          columns={["Date", "Category", "Mode", "Amount"]}
          rows={seededExpenses.map((expense) => [expense.date, expense.category, expense.mode, money(expense.amount)])}
        />
      </Panel>
    </Page>
  );
}

function SalesSlipPage({ bills, status, onSaveBill }) {
  const [items, setItems] = useState([
    { product: "Kaju Katli", qty: 1.25 },
    { product: "Assorted Gift Box", qty: 2 },
    { product: "Hot Samosa", qty: 12 },
  ]);
  const [discount, setDiscount] = useState(75);
  const [gst, setGst] = useState(false);
  const [mode, setMode] = useState("Cash");
  const [date, setDate] = useState(today());
  const [historyDate, setHistoryDate] = useState(today());
  const [message, setMessage] = useState(status);

  const rows = items.map((item) => {
    const product = products.find((entry) => entry.name === item.product) || products[0];
    const total = product.rate * Number(item.qty || 0);
    return { ...item, rate: product.rate, unit: product.unit, total };
  });
  const subtotal = rows.reduce((sum, item) => sum + item.total, 0);
  const tax = gst ? (subtotal - discount) * 0.05 : 0;
  const total = Math.max(0, subtotal - Number(discount || 0) + tax);
  const filteredBills = bills.filter((bill) => !historyDate || bill.date === historyDate);

  useEffect(() => {
    setMessage(status);
  }, [status]);

  function updateItem(index, patch) {
    setItems(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function saveBill() {
    const billNo = `${date}-${String(bills.length + 1).padStart(2, "0")}`;
    const result = await onSaveBill({
      billNo,
      date,
      mode,
      items: rows,
      subtotal,
      discount: Number(discount || 0),
      tax,
      total,
      createdAt: new Date().toISOString(),
    });
    setMessage(`Bill ${billNo} ${result.source === "live" ? "saved in live DB" : "saved in local DB"}`);
  }

  return (
    <Page>
      <section className="grid two sales-grid">
        <Panel title="Sales with slip print" subtitle="Counter bill">
          <div className="button-row">
            <button className="action-button" type="button" onClick={() => setItems([...items, { product: products[0].name, qty: 1 }])}>
              <Plus size={17} />
              Add item
            </button>
            <button className="action-button dark" type="button" onClick={saveBill}>
              Save bill
            </button>
            <button className="action-button" type="button" onClick={() => setItems([{ product: products[0].name, qty: 1 }])}>
              New bill
            </button>
          </div>
          <div className="sale-lines">
            <div className="sale-head">
              <span>PRODUCT</span>
              <span>QTY</span>
              <span>RATE</span>
              <span>TOTAL</span>
              <span />
            </div>
            {rows.map((item, index) => (
              <div className="sale-line" key={`${item.product}-${index}`}>
                <select value={item.product} onChange={(event) => updateItem(index, { product: event.target.value })}>
                  {products.map((product) => (
                    <option key={product.name}>{product.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={item.qty}
                  onChange={(event) => updateItem(index, { qty: event.target.value })}
                />
                <span>{money(item.rate)} / {item.unit}</span>
                <strong>{money(item.total)}</strong>
                <button className="icon-button quiet" type="button" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}>
                  x
                </button>
              </div>
            ))}
          </div>
          <div className="sale-options">
            <label>
              DISCOUNT
              <input type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} />
            </label>
            <label className="check-label">
              <input type="checkbox" checked={gst} onChange={(event) => setGst(event.target.checked)} />
              GST 5%
            </label>
            <label>
              MODE
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank</option>
              </select>
            </label>
            <label>
              DATE
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>
          <p className="db-message">{message}</p>
        </Panel>

        <Panel title="Thermal slip" subtitle="Print preview">
          <div className="thermal-slip">
            <img className="slip-logo" src="/chatru-logo.png" alt="Chatru Halwai logo" />
            <h3>Chatru Halwai & Sons</h3>
            <p>Sweets & Namkeen - Muzaffarnagar</p>
            <p>Bill: {date}-{String(bills.length + 1).padStart(2, "0")}</p>
            {rows.map((item) => (
              <div key={`${item.product}-${item.qty}`}>
                <span>{item.product} x {item.qty}</span>
                <b>{money(item.total)}</b>
              </div>
            ))}
            <hr />
            <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
            <div><span>Discount</span><b>-{money(discount)}</b></div>
            <div><span>Tax</span><b>{money(tax)}</b></div>
            <div className="slip-total"><span>Total</span><b>{money(total)}</b></div>
            <p>Fresh daily - Pure ingredients - Thank you</p>
          </div>
        </Panel>
      </section>
      <Panel title="Bill history" subtitle="Saved bills">
        <div className="filter-row">
          <label>
            DATE
            <input type="date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} />
          </label>
          <button className="ghost-button" type="button" onClick={() => setHistoryDate("")}>All bills</button>
        </div>
        <DataTable
          columns={["Bill No", "Date", "Items", "Mode", "Total"]}
          rows={filteredBills.map((bill) => [
            bill.billNo,
            bill.date,
            bill.items.map((item) => item.product).join(", "),
            bill.mode,
            money(bill.total),
          ])}
          empty="No saved bills for selected date"
        />
      </Panel>
    </Page>
  );
}

function InventoryPage() {
  return (
    <Page>
      <Panel title="Inventory management" subtitle="Raw material stock" action="Add raw material" secondAction="Update stock">
        <DataTable
          columns={["Material", "Category", "Stock", "In", "Out", "Wastage", "Action"]}
          rows={materials.map((material) => [
            material.name,
            material.category,
            `${material.stock} ${material.unit} / Min ${material.min}`,
            `0 ${material.unit}`,
            `0 ${material.unit}`,
            `0 ${material.unit}`,
            "Edit",
          ])}
        />
      </Panel>
      <Panel title="Finished goods" subtitle="Ready stock" action="Add product">
        <div className="product-grid">
          {products.slice(2).map((product) => (
            <article key={product.name}>
              <span>{product.category.toUpperCase()}</span>
              <strong>{product.name}</strong>
              <p>{product.unit === "pc" ? "38 pcs" : "18 tray"} - {money(product.rate)}</p>
            </article>
          ))}
        </div>
      </Panel>
    </Page>
  );
}

function VendorPaymentPage() {
  const [vendorName, setVendorName] = useState(vendors[3].name);
  const [amount, setAmount] = useState(25000);
  const [mode, setMode] = useState("UPI");
  const selected = vendors.find((vendor) => vendor.name === vendorName) || vendors[0];
  const balance = Math.max(0, selected.pending - Number(amount || 0));

  return (
    <Page>
      <section className="grid two">
        <Panel title="Daily vendor payment" subtitle="Record payment">
          <div className="form-grid">
            <label>
              PAYMENT TYPE
              <select>
                <option>Vendor payment</option>
                <option>Employee payment</option>
              </select>
            </label>
            <label>
              VENDOR
              <select value={vendorName} onChange={(event) => setVendorName(event.target.value)}>
                {vendors.map((vendor) => (
                  <option key={vendor.name}>{vendor.name}</option>
                ))}
              </select>
            </label>
            <div className="segmented" role="group" aria-label="Payment mode">
              {["Cash", "UPI", "Bank"].map((item) => (
                <button className={mode === item ? "active" : ""} type="button" key={item} onClick={() => setMode(item)}>
                  {item}
                </button>
              ))}
            </div>
            <label>
              PAYMENT AMOUNT
              <input value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <label>
              DATE
              <input type="date" defaultValue={today()} />
            </label>
            <label>
              NOTES
              <input placeholder="Payment note" />
            </label>
          </div>
          <div className="payment-summary">
            <span>Current pending <b>{money(selected.pending)}</b></span>
            <span>Payment mode <b>{mode}</b></span>
            <span>Balance after payment <b>{money(balance)}</b></span>
          </div>
          <button className="action-button full-action" type="button">Save vendor payment</button>
        </Panel>
        <Panel title="Vendor ledger" subtitle="Pending balance">
          <DataTable
            columns={["Vendor", "Category", "Pending"]}
            rows={vendors.map((vendor) => [vendor.name, vendor.category, money(vendor.pending)])}
          />
        </Panel>
      </section>
    </Page>
  );
}

function DailyVendorsPage() {
  const [records, setRecords] = useState(seededPurchases);
  const [dateFilter, setDateFilter] = useState(today());
  const [form, setForm] = useState({
    date: today(),
    vendor: vendors[0].name,
    material: materials[0].name,
    category: "Packaging",
    qty: 1,
    unit: "pcs",
    rate: 38,
    paid: 0,
    mode: "Cash",
    notes: "",
  });

  function savePurchase(event) {
    event.preventDefault();
    setRecords([{ ...form, id: `PUR-${Date.now()}` }, ...records]);
  }

  const filtered = records.filter((record) => !dateFilter || record.date === dateFilter);

  return (
    <Page>
      <Panel title="Daily vendor" subtitle="Date wise purchase and payment">
        <form className="form-grid purchase-form" onSubmit={savePurchase}>
          <label>DATE<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
          <label>VENDOR<select value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })}>{vendors.map((vendor) => <option key={vendor.name}>{vendor.name}</option>)}</select></label>
          <label>RAW MATERIAL<select value={form.material} onChange={(event) => setForm({ ...form, material: event.target.value })}>{materials.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
          <label>CATEGORY<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{Array.from(new Set(vendors.map((vendor) => vendor.category))).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>QTY<input type="number" value={form.qty} onChange={(event) => setForm({ ...form, qty: event.target.value })} /></label>
          <label>UNIT<input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label>
          <label>RATE<input type="number" value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value })} /></label>
          <label>PAID TODAY<input type="number" value={form.paid} onChange={(event) => setForm({ ...form, paid: event.target.value })} /></label>
          <label>MODE<select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option>Cash</option><option>UPI</option><option>Bank</option></select></label>
          <label>NOTES<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          <button className="action-button full" type="submit">Save purchase</button>
        </form>
      </Panel>
      <Panel title="Purchase history" subtitle="Daily vendor ledger">
        <div className="filter-row">
          <label>DATE<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
          <button className="ghost-button" type="button" onClick={() => setDateFilter("")}>All dates</button>
        </div>
        <DataTable
          columns={["Date", "Vendor", "Item", "Qty", "Amount", "Paid", "Pending"]}
          rows={filtered.map((record) => {
            const amount = Number(record.qty) * Number(record.rate);
            return [record.date, record.vendor, record.material, `${record.qty} ${record.unit}`, money(amount), money(record.paid), money(amount - record.paid)];
          })}
        />
      </Panel>
    </Page>
  );
}

function EmployeesPage({ staff, status, onSaveEmployee }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(staff[0]?.id || "");
  const [tab, setTab] = useState("Salary");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => blankEmployeeForm());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(status);
  const selected = staff.find((employee) => employee.id === selectedId) || staff[0];
  const filtered = staff.filter((employee) => employee.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!selectedId || !staff.some((employee) => employee.id === selectedId)) {
      setSelectedId(staff[0]?.id || "");
    }
  }, [selectedId, staff]);

  useEffect(() => {
    setMessage(status);
  }, [status]);

  function openEmployeeForm() {
    setForm(blankEmployeeForm());
    setShowForm(true);
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitEmployee(event) {
    event.preventDefault();
    setSaving(true);
    const employee = normalizeEmployee({
      ...form,
      id: `EMP-${Date.now()}`,
      salary: Number(form.salary || 0),
      contact: form.contact || "-",
      aadhaar: form.aadhaar || "-",
      address: form.address || "-",
      joining: form.joining || today(),
    });
    const result = await onSaveEmployee(employee);
    const saved = normalizeEmployee(result.record, staff.length);
    setSelectedId(saved.id);
    setMessage(result.source === "live" ? "Employee saved in live DB" : "Employee saved in local DB");
    setSaving(false);
    setShowForm(false);
  }

  if (!selected) {
    return (
      <Page>
        <Panel title="Employee management" subtitle="Profiles and salary" action="Add employee" onAction={openEmployeeForm}>
          <div className="empty-state">No employees found</div>
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <section className="grid employee-grid">
        <Panel title="Employee management" subtitle="Profiles and salary" action="Add employee" onAction={openEmployeeForm}>
          <label className="inline-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name" />
          </label>
          <p className="db-message">{message}</p>
          <div className="employee-list">
            {filtered.map((employee) => (
              <button className={employee.id === selectedId ? "selected" : ""} type="button" key={employee.id} onClick={() => setSelectedId(employee.id)}>
                <strong>{employee.name}</strong>
                <span>{employee.contact === "-" ? "No contact" : employee.contact}</span>
                <small>{employee.joining}</small>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={selected.name} subtitle="View details">
          <div className="detail-grid">
            {[
              ["Contact", selected.contact],
              ["Address", selected.address],
              ["Aadhaar", selected.aadhaar],
              ["Joining date", selected.joining],
              ["Role", selected.role],
              ["Attendance", "30 / 30"],
            ].map(([label, value]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
          <div className="tabs">
            {["Salary", "Attendance", "Payroll"].map((item) => (
              <button className={tab === item ? "active" : ""} type="button" key={item} onClick={() => setTab(item)}>{item}</button>
            ))}
          </div>
          {tab === "Salary" && (
            <Metrics
              compact
              items={[
                ["Total salary", money(selected.salary), "Month 2026-07"],
                ["Earned salary", money(selected.salary), "After leave and absent"],
                ["Advance / paid", money(0), "Balance ₹0"],
                ["Payable", money(selected.salary), "Earned - paid"],
              ]}
            />
          )}
          {tab === "Attendance" && (
            <DataTable columns={["Date", "Status", "In", "Out"]} rows={[["2026-05-02", "Present", "09:00:00", "-"], ["2026-05-01", "Present", "09:00:00", "-"]]} />
          )}
          {tab === "Payroll" && (
            <DataTable columns={["Date", "Amount", "Mode", "Leave"]} rows={[["2026-07-01", money(0), "Cash", "0"], ["2026-06-01", money(12000), "UPI", "1"]]} />
          )}
        </Panel>
      </section>
      {showForm && (
        <Modal title="Add employee" onClose={() => setShowForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitEmployee}>
            <label className="field">
              <span>Name</span>
              <input required value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
            </label>
            <label className="field">
              <span>Role</span>
              <input value={form.role} onChange={(event) => updateForm("role", event.target.value)} />
            </label>
            <label className="field">
              <span>Contact</span>
              <input value={form.contact} onChange={(event) => updateForm("contact", event.target.value)} />
            </label>
            <label className="field">
              <span>Aadhaar</span>
              <input value={form.aadhaar} onChange={(event) => updateForm("aadhaar", event.target.value)} />
            </label>
            <label className="field">
              <span>Joining date</span>
              <input type="date" value={form.joining} onChange={(event) => updateForm("joining", event.target.value)} />
            </label>
            <label className="field">
              <span>Monthly salary</span>
              <input min="0" type="number" value={form.salary} onChange={(event) => updateForm("salary", event.target.value)} />
            </label>
            <label className="field full">
              <span>Address</span>
              <input value={form.address} onChange={(event) => updateForm("address", event.target.value)} />
            </label>
            <button className="action-button full" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save employee"}
            </button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function AttendancePage({ staff }) {
  return (
    <Page>
      <Panel title="Attendance" subtitle="Batch update attendance" action="Clear all">
        <div className="form-grid">
          <label>DATE<input type="date" defaultValue={today()} /></label>
          <label>STATUS<select><option>Present</option><option>Absent</option><option>Half Day</option><option>Leave</option></select></label>
          <label>CHECK IN<input type="time" defaultValue="09:00" /></label>
          <label>CHECK OUT<input type="time" /></label>
        </div>
        <div className="attendance-checks">
          {staff.map((employee) => (
            <label key={employee.id}><input type="checkbox" /> <span>{employee.name}</span><small>{employee.role}</small></label>
          ))}
        </div>
        <button className="action-button full" type="button">Update {staff.length} employee</button>
      </Panel>
      <Panel title="Filter wise" subtitle="Attendance report">
        <DataTable columns={["Date", "Employee", "Status", "In", "Out"]} rows={[]} empty="No attendance for selected filter" />
      </Panel>
    </Page>
  );
}

function VendorsPage() {
  return (
    <Page>
      <Panel title="Vendor management" subtitle="Vendor categories and contacts" action="Add vendor">
        <DataTable
          columns={["Vendor", "Category", "Payment cycle", "Pending"]}
          rows={vendors.map((vendor) => [vendor.name, vendor.category, vendor.cycle, money(vendor.pending)])}
        />
      </Panel>
    </Page>
  );
}

function ExpensesPage() {
  const [dateFilter, setDateFilter] = useState("");
  const filtered = seededExpenses.filter((expense) => !dateFilter || expense.date === dateFilter);
  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <Page>
      <Panel title="Expense management" subtitle="Daily shop expenses" action="Add expense">
        <div className="filter-row">
          <label>
            DATE SEARCH
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </label>
          <strong className="total-chip">{money(total)}</strong>
        </div>
        <DataTable
          columns={["Date", "Expense", "Category", "Mode", "Amount", "Action"]}
          rows={filtered.map((expense) => [expense.date, expense.title, expense.category, expense.mode, money(expense.amount), "Edit"])}
        />
      </Panel>
    </Page>
  );
}

function CategoriesPage() {
  return (
    <Page>
      <Panel title="Category management" subtitle="Product and vendor categories" action="Add category">
        <div className="category-grid">
          {categories.map((category) => (
            <article key={`${category.type}-${category.name}`}>
              <span>{category.type.toUpperCase()}</span>
              <strong>{category.name}</strong>
              <p>{category.count} items - {category.cadence}</p>
            </article>
          ))}
        </div>
      </Panel>
    </Page>
  );
}

function UsersPage() {
  const modules = navGroups.flatMap((group) => group.items.map((item) => item.label));

  return (
    <Page>
      <Panel title="User management" subtitle="ERP users and roles" action="Create user">
        <DataTable
          columns={["User", "Name", "Role", "Status", "Action"]}
          rows={users.map((user) => [user.username, user.name, user.role, user.status, user.protected ? "Protected" : "Delete"])}
        />
      </Panel>
      <Panel title="Access control" subtitle="Role permissions">
        <DataTable
          columns={["Module", "View", "Add", "Edit", "Delete"]}
          rows={modules.map((module) => [module, "✓", "✓", "✓", module === "Users" ? "-" : "✓"])}
        />
      </Panel>
    </Page>
  );
}

function Page({ children }) {
  return <div className="page-stack">{children}</div>;
}

function Panel({ title, subtitle, action, secondAction, onAction, onSecondAction, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span>{title.toUpperCase()}</span>
          <h2>{subtitle}</h2>
        </div>
        <div className="panel-actions">
          {action && (
            <button className="action-button" type="button" onClick={onAction}>
              <Plus size={16} />
              {action}
            </button>
          )}
          {secondAction && (
            <button className="action-button dark" type="button" onClick={onSecondAction}>
              {secondAction}
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Employee record</span>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button className="icon-button quiet" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Metrics({ items, compact = false }) {
  return (
    <section className={`metrics ${compact ? "compact" : ""}`}>
      {items.map(([label, value, help]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{help}</small>
        </article>
      ))}
    </section>
  );
}

function DataTable({ columns, rows, empty = "No records" }) {
  if (!rows.length) {
    return <div className="empty-state">{empty}</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function totalForDate(bills, date) {
  return bills.filter((bill) => bill.date === date).reduce((sum, bill) => sum + bill.total, 0);
}
