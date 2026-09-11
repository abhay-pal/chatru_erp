import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  Bell,
  CalendarCheck2,
  CheckCircle2,
  Eye,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MoreVertical,
  NotebookTabs,
  PackageSearch,
  Pencil,
  Plus,
  Printer,
  ReceiptIndianRupee,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
  Truck,
  UserRound,
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
import {
  createBusinessRecord,
  listEmployees,
  listSalesBills,
  loadBusinessData,
  saveEmployee,
  saveSalesBill,
} from "./db";

const SESSION_KEY = "chatru-halwai-session";
const appAsset = (path) => `${import.meta.env.BASE_URL || "/"}${path.replace(/^\/+/, "")}`;
const CHATRU_LOGO_SRC = appAsset("chatru-logo.png");
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

function quantity(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
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

function normalizeMaterial(item, index = 0) {
  return {
    id: String(item.id || item.name || `MAT-${index + 1}`),
    name: item.name || "Raw material",
    category: item.category || "General",
    stock: Number(item.stock || 0),
    unit: item.unit || "kg",
    min: Number(item.min || 0),
    rate: Number(item.rate || 0),
    inToday: Number(item.inToday || 0),
    outToday: Number(item.outToday || 0),
    wastage: Number(item.wastage || 0),
  };
}

function normalizeProduct(item, index = 0) {
  return {
    id: String(item.id || item.sku || item.name || `PRD-${index + 1}`),
    sku: item.sku || `PRD-${String(index + 1).padStart(3, "0")}`,
    name: item.name || "Product",
    category: item.category || "Sweets",
    unit: item.unit || "kg",
    stock: Number(item.stock || 0),
    rate: Number(item.rate || 0),
    min: Number(item.min || 0),
    taxRate: Number(item.taxRate ?? item.gstPercent ?? 0),
  };
}

function normalizeVendor(item, index = 0) {
  return {
    id: String(item.id || item.name || `VEN-${index + 1}`),
    name: item.name || "Vendor",
    category: item.category || "General",
    contact: item.contact || "-",
    purchases: Number(item.purchases || 0),
    pending: Number(item.pending || 0),
    lastPaid: Number(item.lastPaid || 0),
    cycle: item.cycle || "Weekly",
  };
}

function normalizeExpense(item, index = 0) {
  return {
    id: String(item.id || `EXP-${index + 1}`),
    date: item.date || item.expenseDate || today(),
    expenseDate: item.expenseDate || item.date || today(),
    title: item.title || item.label || "Expense",
    label: item.label || item.title || "Expense",
    category: item.category || "General",
    mode: item.mode || "Cash",
    amount: Number(item.amount || 0),
  };
}

function normalizeCategory(item, index = 0) {
  const type = item.type || "Product";
  const name = item.name || "Category";
  return {
    id: String(item.id || `${type}-${name}` || `CAT-${index + 1}`),
    type,
    name,
    count: Number(item.count ?? item.items ?? 0),
    items: Number(item.items ?? item.count ?? 0),
    cadence: item.cadence || item.margin || "New",
    margin: item.margin || item.cadence || "New",
  };
}

function normalizeUser(item, index = 0) {
  return {
    id: String(item.id || item.username || `USR-${index + 1}`),
    username: item.username || "user",
    name: item.name || "User",
    role: item.role || "accountant",
    status: item.status || "Active",
    protected: item.protected ?? item.username === "admin",
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
  const [salesStatus, setSalesStatus] = useState("Ready");
  const [staff, setStaff] = useState(() => normalizeStaff(employees));
  const [employeeStatus, setEmployeeStatus] = useState("Ready");
  const [materialRows, setMaterialRows] = useState(() => materials.map(normalizeMaterial));
  const [productRows, setProductRows] = useState(() => products.map(normalizeProduct));
  const [vendorRows, setVendorRows] = useState(() => vendors.map(normalizeVendor));
  const [expenseRows, setExpenseRows] = useState(() => seededExpenses.map(normalizeExpense));
  const [categoryRows, setCategoryRows] = useState(() => categories.map(normalizeCategory));
  const [userRows, setUserRows] = useState(() => users.map(normalizeUser));

  useEffect(() => {
    listSalesBills().then((records) => {
      setSalesBills(records);
      setSalesStatus("Ready");
    });
    listEmployees(employees).then((records) => {
      setStaff(normalizeStaff(records));
      setEmployeeStatus("Ready");
    });
    loadBusinessData().then(applyBusinessData).catch(() => {});
  }, []);

  function applyBusinessData(data) {
    if (data.rawStock) setMaterialRows(data.rawStock.map(normalizeMaterial));
    if (data.products) setProductRows(data.products.map(normalizeProduct));
    if (data.vendors) setVendorRows(data.vendors.map(normalizeVendor));
    if (data.expenses) setExpenseRows(data.expenses.map(normalizeExpense));
    if (data.categories) setCategoryRows(data.categories.map(normalizeCategory));
    if (data.users) setUserRows(data.users.map(normalizeUser));
  }

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
    setSalesStatus("Saved");
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
    setEmployeeStatus("Employee saved");
    return result;
  }

  function updateEmployee(employee) {
    const record = normalizeEmployee(employee);
    setStaff((records) => normalizeStaff(records.map((item) => (item.id === record.id ? record : item))));
    setEmployeeStatus("Employee updated");
    return { record };
  }

  function deleteEmployee(employeeId) {
    setStaff((records) => normalizeStaff(records.filter((item) => item.id !== String(employeeId))));
    setEmployeeStatus("Employee removed");
    return { id: String(employeeId) };
  }

  async function persistMaterial(material) {
    const record = normalizeMaterial({ ...material, id: `MAT-${Date.now()}` });
    const payload = {
      name: record.name,
      category: record.category,
      stock: record.stock,
      unit: record.unit,
      min: record.min,
      rate: record.rate,
    };
    const result = await createBusinessRecord("/api/raw-stock", payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setMaterialRows((records) => [record, ...records]);
    }
    return result;
  }

  function updateMaterialStock(materialId, patch) {
    setMaterialRows((records) =>
      records.map((record) =>
        record.id === String(materialId)
          ? normalizeMaterial({
              ...record,
              ...patch,
              stock: Number(patch.stock ?? record.stock),
              inToday: Number(patch.inToday ?? record.inToday),
              outToday: Number(patch.outToday ?? record.outToday),
              wastage: Number(patch.wastage ?? record.wastage),
            })
          : record
      )
    );
    return { source: "local" };
  }

  async function persistProduct(product) {
    const record = normalizeProduct({ ...product, id: `PRD-${Date.now()}` });
    const payload = {
      sku: record.sku,
      name: record.name,
      category: record.category,
      unit: record.unit,
      rate: record.rate,
      taxRate: record.taxRate,
    };
    const result = await createBusinessRecord("/api/products", payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setProductRows((records) => [record, ...records]);
    }
    return result;
  }

  async function persistVendor(vendor) {
    const record = normalizeVendor({ ...vendor, id: `VEN-${Date.now()}` });
    const payload = {
      name: record.name,
      category: record.category,
      contact: record.contact === "-" ? "" : record.contact,
    };
    const result = await createBusinessRecord("/api/vendors", payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorRows((records) => [record, ...records]);
    }
    return result;
  }

  async function persistVendorPayment(payment) {
    const result = await createBusinessRecord("/api/vendor-payments", payment);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorRows((records) =>
        records.map((vendor) =>
          vendor.id === String(payment.vendorId)
            ? { ...vendor, pending: Math.max(0, vendor.pending - Number(payment.amount || 0)), lastPaid: Number(payment.amount || 0) }
            : vendor
        )
      );
    }
    return result;
  }

  async function persistExpense(expense) {
    const record = normalizeExpense({ ...expense, id: `EXP-${Date.now()}` });
    const payload = {
      expenseDate: record.expenseDate,
      label: record.label,
      category: record.category,
      amount: record.amount,
      mode: record.mode,
    };
    const result = await createBusinessRecord("/api/expenses", payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setExpenseRows((records) => [record, ...records]);
    }
    return result;
  }

  async function persistCategory(category) {
    const record = normalizeCategory({ ...category, id: `CAT-${Date.now()}` });
    const payload = {
      type: record.type,
      name: record.name,
      items: record.items,
      margin: record.margin,
    };
    const result = await createBusinessRecord("/api/categories", payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setCategoryRows((records) => [record, ...records]);
    }
    return result;
  }

  async function persistUser(user) {
    const record = normalizeUser({ ...user, id: `USR-${Date.now()}` });
    const payload = {
      username: record.username,
      password: user.password,
      name: record.name,
      role: record.role,
      status: record.status,
    };
    const result = await createBusinessRecord("/api/users", payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setUserRows((records) => [record, ...records]);
    }
    return result;
  }

  if (!session) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <Shell user={session} route={route} onRoute={setRoute} onLogout={logout}>
      <RouteView
        route={route}
        onRoute={setRoute}
        staff={staff}
        employeeStatus={employeeStatus}
        materialRows={materialRows}
        productRows={productRows}
        vendorRows={vendorRows}
        expenseRows={expenseRows}
        categoryRows={categoryRows}
        userRows={userRows}
        salesBills={salesBills}
        salesStatus={salesStatus}
        onSaveBill={persistBill}
        onSaveEmployee={persistEmployee}
        onUpdateEmployee={updateEmployee}
        onDeleteEmployee={deleteEmployee}
        onSaveMaterial={persistMaterial}
        onUpdateMaterialStock={updateMaterialStock}
        onSaveProduct={persistProduct}
        onSaveVendor={persistVendor}
        onSaveVendorPayment={persistVendorPayment}
        onSaveExpense={persistExpense}
        onSaveCategory={persistCategory}
        onSaveUser={persistUser}
      />
    </Shell>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    setForgotMessage("");
    setError(onLogin({ username, password }) ? "" : "Wrong username or password");
  }

  function forgotPassword() {
    setPassword("");
    setError("");
    setForgotMessage("Password reset ke liye admin/owner se contact karein.");
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <img className="brand-logo" src={CHATRU_LOGO_SRC} alt="Chatru Halwai logo" />
        <h1>CHATRU HALWAI ERP</h1>
        <h2>Login</h2>
        <label>
          USERNAME
          <input value={username} autoComplete="username" onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          PASSWORD
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            placeholder="Enter password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        {forgotMessage && <p className="forgot-note">{forgotMessage}</p>}
        <button className="action-button full" type="submit">
          Login
        </button>
        <button className="text-button" type="button" onClick={forgotPassword}>
          Forgot password?
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
          <img src={CHATRU_LOGO_SRC} alt="Chatru Halwai logo" />
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
          <span>Date & time</span>
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

function RouteView({
  route,
  onRoute,
  staff,
  employeeStatus,
  materialRows,
  productRows,
  vendorRows,
  expenseRows,
  categoryRows,
  userRows,
  salesBills,
  salesStatus,
  onSaveBill,
  onSaveEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onSaveMaterial,
  onUpdateMaterialStock,
  onSaveProduct,
  onSaveVendor,
  onSaveVendorPayment,
  onSaveExpense,
  onSaveCategory,
  onSaveUser,
}) {
  if (route === "operations") {
    return <OperationsDashboard salesBills={salesBills} staff={staff} materialRows={materialRows} vendorRows={vendorRows} onStartBill={() => onRoute("sales-slip")} />;
  }
  if (route === "finance") {
    return <FinanceDashboard salesBills={salesBills} staff={staff} expenseRows={expenseRows} vendorRows={vendorRows} />;
  }
  if (route === "sales-slip") {
    return <SalesSlipPage bills={salesBills} status={salesStatus} productRows={productRows} onSaveBill={onSaveBill} />;
  }
  if (route === "inventory") {
    return (
      <InventoryPage
        materialRows={materialRows}
        productRows={productRows}
        onSaveMaterial={onSaveMaterial}
        onUpdateMaterialStock={onUpdateMaterialStock}
        onSaveProduct={onSaveProduct}
      />
    );
  }
  if (route === "vendor-payment") {
    return <VendorPaymentPage vendorRows={vendorRows} onSaveVendorPayment={onSaveVendorPayment} />;
  }
  if (route === "daily-vendors") return <DailyVendorsPage vendorRows={vendorRows} materialRows={materialRows} />;
  if (route === "employees") {
    return (
      <EmployeesPage
        staff={staff}
        status={employeeStatus}
        onSaveEmployee={onSaveEmployee}
        onUpdateEmployee={onUpdateEmployee}
        onDeleteEmployee={onDeleteEmployee}
      />
    );
  }
  if (route === "attendance") return <AttendancePage staff={staff} />;
  if (route === "vendors") return <VendorsPage vendorRows={vendorRows} onSaveVendor={onSaveVendor} />;
  if (route === "expenses") return <ExpensesPage expenseRows={expenseRows} onSaveExpense={onSaveExpense} />;
  if (route === "categories") {
    return (
      <CategoriesPage
        categoryRows={categoryRows}
        materialRows={materialRows}
        onSaveCategory={onSaveCategory}
        onSaveMaterial={onSaveMaterial}
      />
    );
  }
  if (route === "users") return <UsersPage userRows={userRows} onSaveUser={onSaveUser} />;
  return null;
}

function OperationsDashboard({ salesBills, staff, materialRows, vendorRows, onStartBill }) {
  const todaysSales = totalForDate(salesBills, today());
  const totalExpenses = seededExpenses.reduce((sum, item) => sum + item.amount, 0);
  const vendorDues = vendorRows.reduce((sum, item) => sum + item.pending, 0);

  return (
    <Page>
      <Metrics
        items={[
          ["Today's sales", money(todaysSales), "Today"],
          ["Today's expenses", money(totalExpenses), "Today"],
          ["Staff present", `0 / ${staff.length}`, `${staff.length} absent`],
          ["Vendor dues", money(vendorDues), `${vendorRows.length} vendors`],
        ]}
      />
      <section className="grid two">
        <Panel title="Operations dashboard" subtitle="Today's shop pulse" action="New bill" onAction={onStartBill}>
          <div className="batch-card">
            <span>FRESH BATCH</span>
            <strong>82%</strong>
            <p>Sweets, breakfast and namkeen ready for counter sale.</p>
          </div>
          {["Milk and ghee quality check", "Fresh jalebi counter ready", "Gift box station stocked", "Thermal printer paper loaded"].map((item, index) => (
            <div className="check-row" key={item}>
              <CheckCircle2 size={17} />
              <span>{item}</span>
              <b>{index === 2 ? "Pending" : "Done"}</b>
            </div>
          ))}
        </Panel>
        <Panel title="Low stock" subtitle="Material alerts">
          <div className="stock-alerts">
            {materialRows
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

function FinanceDashboard({ salesBills, staff, expenseRows, vendorRows }) {
  const monthSales = salesBills.reduce((sum, bill) => sum + bill.total, 0);
  const totalExpenses = expenseRows.reduce((sum, item) => sum + item.amount, 0);
  const purchases = seededPurchases.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const salary = staff.reduce((sum, item) => sum + item.salary, 0);
  const vendorDues = vendorRows.reduce((sum, item) => sum + item.pending, 0);

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
          rows={expenseRows.map((expense) => [expense.date, expense.category, expense.mode, money(expense.amount)])}
        />
      </Panel>
    </Page>
  );
}

function SalesSlipPage({ bills, status, productRows, onSaveBill }) {
  const saleProducts = productRows.length ? productRows : products.map(normalizeProduct);
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
  const nextBillNo = useMemo(() => `${date}-${String(bills.length + 1).padStart(2, "0")}`, [bills.length, date]);
  const [message, setMessage] = useState(status);
  const [billNo, setBillNo] = useState("");
  const [savedBillKey, setSavedBillKey] = useState("");
  const [savingBill, setSavingBill] = useState(false);

  const rows = items.map((item) => {
    const product = saleProducts.find((entry) => entry.name === item.product) || saleProducts[0];
    const total = product.rate * Number(item.qty || 0);
    return { ...item, rate: product.rate, unit: product.unit, total };
  });
  const subtotal = rows.reduce((sum, item) => sum + item.total, 0);
  const tax = gst ? (subtotal - discount) * 0.05 : 0;
  const total = Math.max(0, subtotal - Number(discount || 0) + tax);
  const filteredBills = bills.filter((bill) => !historyDate || bill.date === historyDate);
  const dailySalesReport = useMemo(() => {
    const byDate = new Map();
    bills.forEach((bill) => {
      const saleDate = bill.date || "-";
      const record = byDate.get(saleDate) || { date: saleDate, bills: 0, qty: 0, total: 0 };
      record.bills += 1;
      record.qty += (bill.items || []).reduce((sum, item) => sum + Number(item.qty || 1), 0);
      record.total += Number(bill.total || 0);
      byDate.set(saleDate, record);
    });
    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [bills]);
  const itemSalesReport = useMemo(() => {
    const byItem = new Map();
    filteredBills.forEach((bill) => {
      (bill.items || []).forEach((item) => {
        const productName = item.product || "Item";
        const product = saleProducts.find((entry) => entry.name === productName);
        const qty = Number(item.qty || 1);
        const amount = Number(item.total || 0) || Number(item.rate || product?.rate || 0) * qty;
        const record = byItem.get(productName) || { product: productName, qty: 0, total: 0 };
        record.qty += qty;
        record.total += amount;
        byItem.set(productName, record);
      });
    });
    return Array.from(byItem.values()).sort((a, b) => b.total - a.total);
  }, [filteredBills, saleProducts]);
  const activeBillNo = billNo || nextBillNo;
  const receiptStamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const currentBillKey = JSON.stringify({
    billNo: activeBillNo,
    date,
    mode,
    discount: Number(discount || 0),
    tax,
    total,
    items: rows.map((item) => ({ product: item.product, qty: Number(item.qty || 0), total: item.total })),
  });

  useEffect(() => {
    if (!savedBillKey) {
      setBillNo(nextBillNo);
    }
  }, [nextBillNo, savedBillKey]);

  function updateItem(index, patch) {
    setItems(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function startNewBill() {
    const freshDate = today();
    setItems([{ product: saleProducts[0].name, qty: 1 }]);
    setDiscount(0);
    setGst(false);
    setMode("Cash");
    setDate(freshDate);
    setSavedBillKey("");
    setBillNo(`${freshDate}-${String(bills.length + 1).padStart(2, "0")}`);
    setMessage("Ready");
  }

  async function saveCurrentBill({ forPrint = false } = {}) {
    if (savingBill) {
      return null;
    }
    if (savedBillKey === currentBillKey) {
      setMessage(`Bill ${activeBillNo} saved`);
      return { alreadySaved: true };
    }

    setSavingBill(true);
    try {
      await onSaveBill({
        billNo: activeBillNo,
        date,
        mode,
        items: rows,
        subtotal,
        discount: Number(discount || 0),
        tax,
        total,
        createdAt: new Date().toISOString(),
      });
      setSavedBillKey(currentBillKey);
      setMessage(`Bill ${activeBillNo} saved${forPrint ? " - printing" : ""}`);
      return { alreadySaved: false };
    } catch {
      setMessage("Bill save failed. Please try again.");
      return null;
    } finally {
      setSavingBill(false);
    }
  }

  async function saveBill() {
    await saveCurrentBill();
  }

  async function printSlip() {
    const saved = await saveCurrentBill({ forPrint: true });
    if (!saved) return;
    setTimeout(() => window.print(), 80);
  }

  return (
    <Page>
      <section className="grid two sales-grid">
        <section className="panel sales-entry-panel">
          <div className="panel-header sales-entry-header">
            <div>
              <span>SALES WITH SLIP PRINT</span>
              <h2>Counter bill</h2>
            </div>
            <div className="button-row sales-header-actions">
              <button className="action-button" type="button" onClick={() => setItems([...items, { product: saleProducts[0].name, qty: 1 }])}>
                <PackageSearch size={18} />
                Add item
              </button>
              <button className="action-button dark" type="button" onClick={saveBill} disabled={savingBill}>
                <NotebookTabs size={18} />
                {savingBill ? "Saving..." : "Save bill"}
              </button>
              <button className="action-button" type="button" onClick={startNewBill}>
                <Plus size={18} />
                New bill
              </button>
            </div>
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
                  {saleProducts.map((product) => (
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
                <span className="sale-rate">{money(item.rate)} / {item.unit}</span>
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
          </div>
          <p className="db-message">{message}</p>
        </section>

        <section className="panel receipt-panel">
          <div className="panel-header receipt-header">
            <div>
              <span>THERMAL SLIP</span>
              <h2>Print preview</h2>
            </div>
            <button className="receipt-print-button" type="button" onClick={printSlip} disabled={savingBill} aria-label="Print slip">
              <Printer size={20} />
            </button>
          </div>
          <div className="thermal-slip">
            <img className="slip-logo" src={CHATRU_LOGO_SRC} alt="Chatru Halwai logo" />
            <h3>Chatru Halwai & Sons</h3>
            <p className="slip-subtitle">Sweets & Namkeen - Muzaffarnagar</p>
            <div className="slip-meta">
              <span>Bill: {activeBillNo}</span>
              <span>{receiptStamp}</span>
            </div>
            {rows.map((item, index) => (
              <div className="slip-row" key={`${item.product}-${item.qty}-${index}`}>
                <span>{item.product} x {item.qty}</span>
                <b>{money(item.total)}</b>
              </div>
            ))}
            <hr />
            <div className="slip-row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
            <div className="slip-row"><span>Discount</span><b>-{money(discount)}</b></div>
            <div className="slip-row"><span>Tax</span><b>{money(tax)}</b></div>
            <div className="slip-total"><span>Total</span><b>{money(total)}</b></div>
            <p className="slip-footer">Fresh daily - Pure ingredients - Thank you</p>
          </div>
        </section>
      </section>
      <section className="panel bill-history-panel">
        <div className="panel-header history-header">
          <div>
            <span>BILL HISTORY</span>
            <h2>Saved bills</h2>
          </div>
          <label className="history-date-control">
            DATE
            <input type="date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} />
          </label>
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
      </section>
      <section className="grid two sales-report-grid">
        <section className="panel sales-report-panel">
          <div className="panel-header">
            <div>
              <span>SALE REPORT</span>
              <h2>Per day sale</h2>
            </div>
          </div>
          <DataTable
            columns={["Date", "Bills", "Qty sold", "Sale total"]}
            rows={dailySalesReport.map((record) => [
              record.date,
              record.bills,
              quantity(record.qty),
              money(record.total),
            ])}
            empty="No sales report available"
          />
        </section>
        <section className="panel sales-report-panel">
          <div className="panel-header">
            <div>
              <span>ITEM WISE SALE</span>
              <h2>{historyDate ? `Items sold on ${historyDate}` : "Items sold"}</h2>
            </div>
          </div>
          <DataTable
            columns={["Item", "Qty sold", "Sale amount"]}
            rows={itemSalesReport.map((record) => [
              record.product,
              quantity(record.qty),
              money(record.total),
            ])}
            empty="No item sale for selected date"
          />
        </section>
      </section>
    </Page>
  );
}

function InventoryPage({ materialRows, productRows, onSaveMaterial, onUpdateMaterialStock, onSaveProduct }) {
  const [modalMode, setModalMode] = useState(null);
  const [materialForm, setMaterialForm] = useState({
    name: "",
    category: "Packaging",
    stock: 0,
    unit: "kg",
    min: 0,
    rate: 0,
  });
  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    category: "Sweets",
    unit: "kg",
    rate: 0,
    taxRate: 0,
  });
  const [stockForm, setStockForm] = useState({
    id: materialRows[0]?.id || "",
    stock: materialRows[0]?.stock || 0,
    inToday: 0,
    outToday: 0,
    wastage: 0,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const selected = materialRows.find((material) => material.id === stockForm.id) || materialRows[0];
    if (selected && !stockForm.id) {
      setStockForm((current) => ({ ...current, id: selected.id, stock: selected.stock }));
    }
  }, [materialRows, stockForm.id]);

  function openStockUpdate() {
    const first = materialRows[0];
    setStockForm({
      id: first?.id || "",
      stock: first?.stock || 0,
      inToday: first?.inToday || 0,
      outToday: first?.outToday || 0,
      wastage: first?.wastage || 0,
    });
    setModalMode("stock");
  }

  async function submitMaterial(event) {
    event.preventDefault();
    const result = await onSaveMaterial(materialForm);
    setMaterialForm({ name: "", category: "Packaging", stock: 0, unit: "kg", min: 0, rate: 0 });
    setMessage("Raw material saved");
    setModalMode(null);
  }

  async function submitProduct(event) {
    event.preventDefault();
    const result = await onSaveProduct(productForm);
    setProductForm({ sku: "", name: "", category: "Sweets", unit: "kg", rate: 0, taxRate: 0 });
    setMessage("Product saved");
    setModalMode(null);
  }

  function submitStock(event) {
    event.preventDefault();
    const selected = materialRows.find((material) => material.id === stockForm.id);
    const nextStock =
      Number(stockForm.stock || 0) +
      Number(stockForm.inToday || 0) -
      Number(stockForm.outToday || 0) -
      Number(stockForm.wastage || 0);
    onUpdateMaterialStock(stockForm.id, { ...stockForm, stock: Math.max(0, nextStock) });
    setMessage(`${selected?.name || "Stock"} updated`);
    setModalMode(null);
  }

  return (
    <Page>
      <Panel
        title="Inventory management"
        subtitle="Raw material stock"
        action="Add raw material"
        secondAction="Update stock"
        onAction={() => setModalMode("material")}
        onSecondAction={openStockUpdate}
      >
        {message && <p className="db-message">{message}</p>}
        <DataTable
          columns={["Material", "Category", "Stock", "In", "Out", "Wastage", "Action"]}
          rows={materialRows.map((material) => [
            material.name,
            material.category,
            `${material.stock} ${material.unit} / Min ${material.min}`,
            `${material.inToday} ${material.unit}`,
            `${material.outToday} ${material.unit}`,
            `${material.wastage} ${material.unit}`,
            "Edit",
          ])}
        />
      </Panel>
      <Panel title="Finished goods" subtitle="Ready stock" action="Add product" onAction={() => setModalMode("product")}>
        <div className="product-grid">
          {productRows.map((product) => (
            <article key={product.name}>
              <span>{product.category.toUpperCase()}</span>
              <strong>{product.name}</strong>
              <p>{product.stock ? `${product.stock} ${product.unit}` : product.unit} - {money(product.rate)}</p>
            </article>
          ))}
        </div>
      </Panel>
      {modalMode === "material" && (
        <Modal title="Add raw material" eyebrow="Inventory record" onClose={() => setModalMode(null)}>
          <form className="modal-form grid-form" onSubmit={submitMaterial}>
            <label className="field"><span>Name</span><input required value={materialForm.name} onChange={(event) => setMaterialForm({ ...materialForm, name: event.target.value })} /></label>
            <label className="field"><span>Category</span><input value={materialForm.category} onChange={(event) => setMaterialForm({ ...materialForm, category: event.target.value })} /></label>
            <label className="field"><span>Stock</span><input type="number" value={materialForm.stock} onChange={(event) => setMaterialForm({ ...materialForm, stock: event.target.value })} /></label>
            <label className="field"><span>Unit</span><input value={materialForm.unit} onChange={(event) => setMaterialForm({ ...materialForm, unit: event.target.value })} /></label>
            <label className="field"><span>Minimum</span><input type="number" value={materialForm.min} onChange={(event) => setMaterialForm({ ...materialForm, min: event.target.value })} /></label>
            <label className="field"><span>Rate</span><input type="number" value={materialForm.rate} onChange={(event) => setMaterialForm({ ...materialForm, rate: event.target.value })} /></label>
            <button className="action-button full" type="submit">Save raw material</button>
          </form>
        </Modal>
      )}
      {modalMode === "stock" && (
        <Modal title="Update stock" eyebrow="Inventory record" onClose={() => setModalMode(null)}>
          <form className="modal-form grid-form" onSubmit={submitStock}>
            <label className="field full">
              <span>Material</span>
              <select
                value={stockForm.id}
                onChange={(event) => {
                  const selected = materialRows.find((material) => material.id === event.target.value);
                  setStockForm({ id: event.target.value, stock: selected?.stock || 0, inToday: 0, outToday: 0, wastage: 0 });
                }}
              >
                {materialRows.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
              </select>
            </label>
            <label className="field"><span>Current stock</span><input type="number" value={stockForm.stock} onChange={(event) => setStockForm({ ...stockForm, stock: event.target.value })} /></label>
            <label className="field"><span>In today</span><input type="number" value={stockForm.inToday} onChange={(event) => setStockForm({ ...stockForm, inToday: event.target.value })} /></label>
            <label className="field"><span>Out today</span><input type="number" value={stockForm.outToday} onChange={(event) => setStockForm({ ...stockForm, outToday: event.target.value })} /></label>
            <label className="field"><span>Wastage</span><input type="number" value={stockForm.wastage} onChange={(event) => setStockForm({ ...stockForm, wastage: event.target.value })} /></label>
            <button className="action-button full" type="submit">Update stock</button>
          </form>
        </Modal>
      )}
      {modalMode === "product" && (
        <Modal title="Add product" eyebrow="Finished goods" onClose={() => setModalMode(null)}>
          <form className="modal-form grid-form" onSubmit={submitProduct}>
            <label className="field"><span>SKU</span><input value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} /></label>
            <label className="field"><span>Name</span><input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
            <label className="field"><span>Category</span><input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /></label>
            <label className="field"><span>Unit</span><input value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })} /></label>
            <label className="field"><span>Rate</span><input type="number" value={productForm.rate} onChange={(event) => setProductForm({ ...productForm, rate: event.target.value })} /></label>
            <label className="field"><span>GST %</span><input type="number" value={productForm.taxRate} onChange={(event) => setProductForm({ ...productForm, taxRate: event.target.value })} /></label>
            <button className="action-button full" type="submit">Save product</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function VendorPaymentPage({ vendorRows, onSaveVendorPayment }) {
  const [vendorId, setVendorId] = useState(vendorRows[3]?.id || vendorRows[0]?.id || "");
  const [amount, setAmount] = useState(25000);
  const [mode, setMode] = useState("UPI");
  const [paymentDate, setPaymentDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const selected = vendorRows.find((vendor) => vendor.id === vendorId) || vendorRows[0] || { id: "", name: "Vendor", pending: 0 };
  const balance = Math.max(0, selected.pending - Number(amount || 0));

  useEffect(() => {
    if (!vendorId && vendorRows[0]) {
      setVendorId(vendorRows[0].id);
    }
  }, [vendorId, vendorRows]);

  async function submitPayment() {
    if (!selected) return;
    const result = await onSaveVendorPayment({
      vendorId: selected.id,
      amount: Number(amount || 0),
      mode,
      paymentDate,
      notes,
    });
    setMessage("Vendor payment saved");
    setAmount(0);
    setNotes("");
  }

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
              <select value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
                {vendorRows.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
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
              <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            </label>
            <label>
              NOTES
              <input placeholder="Payment note" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
          </div>
          <div className="payment-summary">
            <span>Current pending <b>{money(selected.pending)}</b></span>
            <span>Payment mode <b>{mode}</b></span>
            <span>Balance after payment <b>{money(balance)}</b></span>
          </div>
          {message && <p className="db-message">{message}</p>}
          <button className="action-button full-action" type="button" onClick={submitPayment}>Save vendor payment</button>
        </Panel>
        <Panel title="Vendor ledger" subtitle="Pending balance">
          <DataTable
            columns={["Vendor", "Category", "Pending"]}
            rows={vendorRows.map((vendor) => [vendor.name, vendor.category, money(vendor.pending)])}
          />
        </Panel>
      </section>
    </Page>
  );
}

function DailyVendorsPage({ vendorRows, materialRows }) {
  const vendorOptions = useMemo(() => (vendorRows.length ? vendorRows : vendors.map(normalizeVendor)), [vendorRows]);
  const materialOptions = useMemo(() => (materialRows.length ? materialRows : materials.map(normalizeMaterial)), [materialRows]);
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...materialOptions.map((item) => item.category), ...vendorOptions.map((vendor) => vendor.category)].filter(Boolean)
        )
      ),
    [materialOptions, vendorOptions]
  );
  const [records, setRecords] = useState(seededPurchases);
  const [dateFilter, setDateFilter] = useState(today());
  const [form, setForm] = useState({
    date: today(),
    vendor: vendorOptions[0]?.name || "",
    material: materialOptions[0]?.name || "",
    category: materialOptions[0]?.category || "Packaging",
    qty: 1,
    unit: materialOptions[0]?.unit || "pcs",
    rate: materialOptions[0]?.rate || 0,
    paid: 0,
    mode: "Cash",
    notes: "",
  });

  useEffect(() => {
    const selected = materialOptions.find((item) => item.name === form.material);
    if (selected || !materialOptions[0]) return;
    const first = materialOptions[0];
    setForm((current) => ({
      ...current,
      material: first.name,
      category: first.category || current.category,
      unit: first.unit || current.unit,
      rate: first.rate || current.rate,
    }));
  }, [form.material, materialOptions]);

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
          <label>VENDOR<select value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })}>{vendorOptions.map((vendor) => <option key={vendor.id}>{vendor.name}</option>)}</select></label>
          <label>RAW MATERIAL<select value={form.material} onChange={(event) => {
            const selected = materialOptions.find((item) => item.name === event.target.value);
            setForm({ ...form, material: event.target.value, category: selected?.category || form.category, unit: selected?.unit || form.unit, rate: selected?.rate || form.rate });
          }}>{materialOptions.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
          <label>CATEGORY<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{Array.from(new Set([...categoryOptions, form.category].filter(Boolean))).map((item) => <option key={item}>{item}</option>)}</select></label>
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

function EmployeesPage({ staff, status, onSaveEmployee, onUpdateEmployee, onDeleteEmployee }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(staff[0]?.id || "");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => blankEmployeeForm());
  const [editingId, setEditingId] = useState("");
  const [salaryMonth, setSalaryMonth] = useState("2026-07");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(status);
  const selected = staff.find((employee) => employee.id === selectedId) || staff[0];
  const filtered = staff.filter((employee) =>
    `${employee.name} ${employee.role} ${employee.contact}`.toLowerCase().includes(query.toLowerCase())
  );
  const attendanceRows = [
    ["2026-05-02", "Present", "09:00:00", "-"],
    ["2026-05-01", "Present", "09:00:00", "-"],
  ];
  const salaryRows = [["-", money(0), "Cash", "0"]];

  useEffect(() => {
    if (!selectedId || !staff.some((employee) => employee.id === selectedId)) {
      setSelectedId(staff[0]?.id || "");
    }
  }, [selectedId, staff]);

  useEffect(() => {
    setMessage(status);
  }, [status]);

  function employeeToForm(employee) {
    return {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      contact: employee.contact === "-" ? "" : employee.contact,
      address: employee.address === "-" ? "" : employee.address,
      aadhaar: employee.aadhaar === "-" ? "" : employee.aadhaar,
      joining: employee.joining,
      salary: employee.salary,
      shiftStart: employee.shiftStart || "09:00:00",
      shiftEnd: employee.shiftEnd || "21:00:00",
    };
  }

  function openEmployeeForm(employee) {
    if (employee) {
      setEditingId(employee.id);
      setForm(employeeToForm(employee));
    } else {
      setEditingId("");
      setForm(blankEmployeeForm());
    }
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
      id: editingId || `EMP-${Date.now()}`,
      salary: Number(form.salary || 0),
      contact: form.contact || "-",
      aadhaar: form.aadhaar || "-",
      address: form.address || "-",
      joining: form.joining || today(),
    });
    try {
      const result = editingId ? await onUpdateEmployee(employee) : await onSaveEmployee(employee);
      const saved = normalizeEmployee(result.record, staff.length);
      setSelectedId(saved.id);
      setMessage(editingId ? "Employee updated" : "Employee saved");
      setShowForm(false);
      setEditingId("");
    } finally {
      setSaving(false);
    }
  }

  function deleteEmployee(employeeId) {
    const remaining = staff.filter((employee) => employee.id !== employeeId);
    onDeleteEmployee(employeeId);
    setSelectedId(remaining[0]?.id || "");
    setMessage("Employee removed");
  }

  return (
    <Page>
      <section className="grid employee-grid">
        <section className="panel employee-list-panel">
          <div className="panel-header">
            <div>
              <span>EMPLOYEE MANAGEMENT</span>
              <h2>Profiles and salary</h2>
            </div>
            <button className="action-button" type="button" onClick={() => openEmployeeForm()}>
              <Plus size={17} />
              Add employee
            </button>
          </div>
          <label className="inline-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name" />
          </label>
          <p className="db-message">{message}</p>
          <div className="employee-list">
            {filtered.map((employee) => (
              <article className={`employee-card ${employee.id === selectedId ? "selected" : ""}`} key={employee.id}>
                <button className="employee-card-main" type="button" onClick={() => setSelectedId(employee.id)}>
                  <span className="employee-avatar"><UserRound size={26} /></span>
                  <span>
                    <strong>{employee.name}</strong>
                    <small>{employee.contact === "-" ? "No contact" : employee.contact}</small>
                    <small>{employee.joining}</small>
                  </span>
                </button>
                <div className="employee-card-actions">
                  <button type="button" onClick={() => setSelectedId(employee.id)} aria-label={`View ${employee.name}`}>
                    <Eye size={18} />
                  </button>
                  <button type="button" onClick={() => openEmployeeForm(employee)} aria-label={`Edit ${employee.name}`}>
                    <Pencil size={18} />
                  </button>
                  <button className="danger" type="button" onClick={() => deleteEmployee(employee.id)} aria-label={`Delete ${employee.name}`}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
            {!filtered.length && <div className="empty-state">No employees found</div>}
          </div>
        </section>
        <section className="panel employee-detail-panel">
          {selected ? (
            <>
              <div className="employee-detail-top">
                <div>
                  <span>VIEW DETAILS</span>
                  <h2>{selected.name}</h2>
                </div>
                <button className="icon-button quiet" type="button" aria-label="Employee menu">
                  <MoreVertical size={20} />
                </button>
              </div>
              <dl className="employee-fields">
                <div><dt>Contact</dt><dd>{selected.contact}</dd></div>
                <div><dt>Address</dt><dd>{selected.address}</dd></div>
                <div><dt>Aadhaar</dt><dd>{selected.aadhaar}</dd></div>
                <div><dt>Joining date</dt><dd>{selected.joining}</dd></div>
                <div><dt>Role</dt><dd>{selected.role}</dd></div>
              </dl>
              <div className="employee-payroll-grid">
                <article>
                  <span>Attendance</span>
                  <strong>30 / 30</strong>
                  <small>P 0 | A 0 | L 0</small>
                </article>
                <article>
                  <span>Total salary</span>
                  <strong>{money(selected.salary)}</strong>
                  <small>Month {salaryMonth}</small>
                </article>
                <article>
                  <span>Earned salary</span>
                  <strong>{money(selected.salary)}</strong>
                  <small>After leave and absent</small>
                </article>
                <article>
                  <span>Advance / paid</span>
                  <strong>{money(0)}</strong>
                  <small>Balance ₹0</small>
                </article>
                <article>
                  <span>Payable</span>
                  <strong>{money(selected.salary)}</strong>
                  <small>Earned - paid</small>
                </article>
                <label className="salary-month-control">
                  SALARY MONTH
                  <input type="month" value={salaryMonth} onChange={(event) => setSalaryMonth(event.target.value)} />
                </label>
              </div>
              <section className="employee-report-section">
                <h3>Attendance history</h3>
                <table>
                  <thead><tr><th>Date</th><th>Status</th><th>In</th><th>Out</th></tr></thead>
                  <tbody>
                    {attendanceRows.map(([day, rowStatus, inTime, outTime]) => (
                      <tr key={day}>
                        <td>{day}</td>
                        <td><span className="status-badge">{rowStatus}</span></td>
                        <td>{inTime}</td>
                        <td>{outTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section className="employee-report-section">
                <h3>Salary payments</h3>
                <table>
                  <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Leave</th></tr></thead>
                  <tbody>
                    {salaryRows.map(([day, amount, rowMode, leave]) => (
                      <tr key={`${day}-${amount}`}>
                        <td>{day}</td>
                        <td>{amount}</td>
                        <td>{rowMode}</td>
                        <td>{leave}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          ) : (
            <div className="empty-state">Select or add an employee</div>
          )}
        </section>
      </section>
      {showForm && (
        <Modal title={editingId ? "Edit employee" : "Add employee"} onClose={() => setShowForm(false)}>
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSelectedIds(staff.map((employee) => employee.id));
  }, [staff]);

  function toggleEmployee(employeeId) {
    setSelectedIds((ids) =>
      ids.includes(employeeId) ? ids.filter((id) => id !== employeeId) : [...ids, employeeId]
    );
  }

  return (
    <Page>
      <Panel title="Attendance" subtitle="Batch update attendance" action="Clear all" onAction={() => setSelectedIds([])}>
        <div className="form-grid">
          <label>DATE<input type="date" defaultValue={today()} /></label>
          <label>STATUS<select><option>Present</option><option>Absent</option><option>Half Day</option><option>Leave</option></select></label>
          <label>CHECK IN<input type="time" defaultValue="09:00" /></label>
          <label>CHECK OUT<input type="time" /></label>
        </div>
        <div className="attendance-checks">
          {staff.map((employee) => (
            <label key={employee.id}>
              <input type="checkbox" checked={selectedIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} />
              <span>{employee.name}</span>
              <small>{employee.role}</small>
            </label>
          ))}
        </div>
        {message && <p className="db-message">{message}</p>}
        <button className="action-button full" type="button" onClick={() => setMessage(`Attendance updated for ${selectedIds.length} employee`)}>
          Update {selectedIds.length} employee
        </button>
      </Panel>
      <Panel title="Filter wise" subtitle="Attendance report">
        <DataTable columns={["Date", "Employee", "Status", "In", "Out"]} rows={[]} empty="No attendance for selected filter" />
      </Panel>
    </Page>
  );
}

function VendorsPage({ vendorRows, onSaveVendor }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Dairy", contact: "" });
  const [message, setMessage] = useState("");

  async function submitVendor(event) {
    event.preventDefault();
    const result = await onSaveVendor(form);
    setMessage("Vendor saved");
    setForm({ name: "", category: "Dairy", contact: "" });
    setShowForm(false);
  }

  return (
    <Page>
      <Panel title="Vendor management" subtitle="Vendor categories and contacts" action="Add vendor" onAction={() => setShowForm(true)}>
        {message && <p className="db-message">{message}</p>}
        <DataTable
          columns={["Vendor", "Category", "Contact", "Pending"]}
          rows={vendorRows.map((vendor) => [vendor.name, vendor.category, vendor.contact, money(vendor.pending)])}
        />
      </Panel>
      {showForm && (
        <Modal title="Add vendor" eyebrow="Vendor record" onClose={() => setShowForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitVendor}>
            <label className="field"><span>Vendor name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="field"><span>Category</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
            <label className="field full"><span>Contact</span><input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></label>
            <button className="action-button full" type="submit">Save vendor</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function ExpensesPage({ expenseRows, onSaveExpense }) {
  const [dateFilter, setDateFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ expenseDate: today(), label: "", category: "Staff Food", mode: "Cash", amount: 0 });
  const [message, setMessage] = useState("");
  const filtered = expenseRows.filter((expense) => !dateFilter || expense.date === dateFilter);
  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);

  async function submitExpense(event) {
    event.preventDefault();
    const result = await onSaveExpense(form);
    setMessage("Expense saved");
    setForm({ expenseDate: today(), label: "", category: "Staff Food", mode: "Cash", amount: 0 });
    setShowForm(false);
  }

  return (
    <Page>
      <Panel title="Expense management" subtitle="Daily shop expenses" action="Add expense" onAction={() => setShowForm(true)}>
        <div className="filter-row">
          <label>
            DATE SEARCH
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </label>
          <strong className="total-chip">{money(total)}</strong>
        </div>
        {message && <p className="db-message">{message}</p>}
        <DataTable
          columns={["Date", "Expense", "Category", "Mode", "Amount", "Action"]}
          rows={filtered.map((expense) => [expense.date, expense.title, expense.category, expense.mode, money(expense.amount), "Edit"])}
        />
      </Panel>
      {showForm && (
        <Modal title="Add expense" eyebrow="Expense record" onClose={() => setShowForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitExpense}>
            <label className="field"><span>Expense</span><input required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></label>
            <label className="field"><span>Date</span><input type="date" value={form.expenseDate} onChange={(event) => setForm({ ...form, expenseDate: event.target.value })} /></label>
            <label className="field"><span>Category</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
            <label className="field"><span>Mode</span><select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option>Cash</option><option>UPI</option><option>Bank</option></select></label>
            <label className="field full"><span>Amount</span><input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
            <button className="action-button full" type="submit">Save expense</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function CategoriesPage({ categoryRows, materialRows, onSaveCategory, onSaveMaterial }) {
  const rawMaterialCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...categoryRows
              .filter((category) => category.type.toLowerCase() === "raw material")
              .map((category) => category.name),
            ...materialRows.map((material) => material.category),
            "Dairy",
            "Grocery",
            "Packaging",
          ].filter(Boolean)
        )
      ),
    [categoryRows, materialRows]
  );
  const [activeTab, setActiveTab] = useState("categories");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ type: "Product", name: "", items: 0, margin: "New" });
  const [materialForm, setMaterialForm] = useState({
    name: "",
    category: "Dairy",
    stock: 0,
    unit: "kg",
    min: 0,
    rate: 0,
  });
  const [message, setMessage] = useState("");

  async function submitCategory(event) {
    event.preventDefault();
    const result = await onSaveCategory(categoryForm);
    setMessage("Category saved");
    setCategoryForm({ type: "Product", name: "", items: 0, margin: "New" });
    setShowCategoryForm(false);
  }

  async function submitMaterial(event) {
    event.preventDefault();
    const result = await onSaveMaterial(materialForm);
    setMessage("Raw material saved. It is now available in Daily Vendors.");
    setMaterialForm({
      name: "",
      category: rawMaterialCategoryOptions[0] || "Dairy",
      stock: 0,
      unit: "kg",
      min: 0,
      rate: 0,
    });
    setShowMaterialForm(false);
    setActiveTab("materials");
  }

  return (
    <Page>
      <Panel
        title="Category management"
        subtitle={activeTab === "materials" ? "Raw material master" : "Product, vendor, and expense categories"}
        action={activeTab === "materials" ? "Add raw material" : "Add category"}
        onAction={() => (activeTab === "materials" ? setShowMaterialForm(true) : setShowCategoryForm(true))}
      >
        <div className="tabs master-tabs" role="tablist" aria-label="Category master sections">
          <button
            className={activeTab === "categories" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("categories")}
          >
            Categories
          </button>
          <button
            className={activeTab === "materials" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("materials")}
          >
            Raw Material
          </button>
        </div>
        {message && <p className="db-message">{message}</p>}
        {activeTab === "categories" ? (
          <div className="category-grid">
            {categoryRows.map((category) => (
              <article key={`${category.type}-${category.name}`}>
                <span>{category.type.toUpperCase()}</span>
                <strong>{category.name}</strong>
                <p>{category.count} items - {category.cadence}</p>
              </article>
            ))}
          </div>
        ) : (
          <DataTable
            columns={["Raw material", "Category", "Unit", "Rate", "Stock"]}
            rows={materialRows.map((material) => [
              material.name,
              material.category,
              material.unit,
              money(material.rate),
              `${material.stock} ${material.unit}`,
            ])}
            empty="No raw materials found"
          />
        )}
      </Panel>
      {showCategoryForm && (
        <Modal title="Add category" eyebrow="Category record" onClose={() => setShowCategoryForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitCategory}>
            <label className="field"><span>Type</span><select value={categoryForm.type} onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value })}><option>Product</option><option>Vendor</option><option>Raw Material</option><option>Expense</option></select></label>
            <label className="field"><span>Name</span><input required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></label>
            <label className="field"><span>Items</span><input type="number" value={categoryForm.items} onChange={(event) => setCategoryForm({ ...categoryForm, items: event.target.value })} /></label>
            <label className="field"><span>Margin / note</span><input value={categoryForm.margin} onChange={(event) => setCategoryForm({ ...categoryForm, margin: event.target.value })} /></label>
            <button className="action-button full" type="submit">Save category</button>
          </form>
        </Modal>
      )}
      {showMaterialForm && (
        <Modal title="Add raw material" eyebrow="Raw material record" onClose={() => setShowMaterialForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitMaterial}>
            <label className="field"><span>Name</span><input required value={materialForm.name} onChange={(event) => setMaterialForm({ ...materialForm, name: event.target.value })} /></label>
            <label className="field">
              <span>Category</span>
              <select
                value={materialForm.category}
                onChange={(event) => setMaterialForm({ ...materialForm, category: event.target.value })}
              >
                {rawMaterialCategoryOptions.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="field"><span>Stock</span><input type="number" value={materialForm.stock} onChange={(event) => setMaterialForm({ ...materialForm, stock: event.target.value })} /></label>
            <label className="field"><span>Unit</span><input value={materialForm.unit} onChange={(event) => setMaterialForm({ ...materialForm, unit: event.target.value })} /></label>
            <label className="field"><span>Minimum</span><input type="number" value={materialForm.min} onChange={(event) => setMaterialForm({ ...materialForm, min: event.target.value })} /></label>
            <label className="field"><span>Rate</span><input type="number" value={materialForm.rate} onChange={(event) => setMaterialForm({ ...materialForm, rate: event.target.value })} /></label>
            <button className="action-button full" type="submit">Save raw material</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function UsersPage({ userRows, onSaveUser }) {
  const modules = navGroups.flatMap((group) => group.items.map((item) => item.label));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "accountant", status: "Active" });
  const [message, setMessage] = useState("");

  async function submitUser(event) {
    event.preventDefault();
    const result = await onSaveUser(form);
    setMessage("User saved");
    setForm({ username: "", password: "", name: "", role: "accountant", status: "Active" });
    setShowForm(false);
  }

  return (
    <Page>
      <Panel title="User management" subtitle="ERP users and roles" action="Create user" onAction={() => setShowForm(true)}>
        {message && <p className="db-message">{message}</p>}
        <DataTable
          columns={["User", "Name", "Role", "Status", "Action"]}
          rows={userRows.map((user) => [user.username, user.name, user.role, user.status, user.protected ? "Protected" : "Delete"])}
        />
      </Panel>
      <Panel title="Access control" subtitle="Role permissions">
        <DataTable
          columns={["Module", "View", "Add", "Edit", "Delete"]}
          rows={modules.map((module) => [module, "✓", "✓", "✓", module === "Users" ? "-" : "✓"])}
        />
      </Panel>
      {showForm && (
        <Modal title="Create user" eyebrow="User record" onClose={() => setShowForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitUser}>
            <label className="field"><span>Username</span><input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
            <label className="field"><span>Full name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="field"><span>Password</span><input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <label className="field"><span>Role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="admin">Admin</option><option value="accountant">Accountant</option></select></label>
            <label className="field full"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Active</option><option>Inactive</option></select></label>
            <button className="action-button full" type="submit">Save user</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function Page({ children }) {
  return <div className="page-stack">{children}</div>;
}

function Panel({ title, subtitle, action, secondAction, onAction, onSecondAction, children }) {
  const showPlusIcon = action && /^(Add|Create|New)/.test(action);

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
              {showPlusIcon && <Plus size={16} />}
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

function Modal({ title, eyebrow = "Record", onClose, children }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">{eyebrow}</span>
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
