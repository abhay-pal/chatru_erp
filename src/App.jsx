import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeIndianRupee,
  Bell,
  CalendarCheck2,
  CheckCircle2,
  Download,
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
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  adminUser,
  navGroups,
} from "./data";
import {
  createBusinessRecord,
  deleteBusinessRecord,
  listEmployees,
  listSalesBills,
  loadBusinessData,
  deleteEmployeeRecord,
  saveEmployee,
  saveSalesBill,
  loginUser,
  updateEmployeeRecord,
  updateBusinessRecord,
} from "./db";

const SESSION_KEY = "chatru-halwai-session";
const appAsset = (path) => `${import.meta.env.BASE_URL || "/"}${path.replace(/^\/+/, "")}`;
const CHATRU_LOGO_SRC = appAsset("chatru-logo.png");
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

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

const UNIT_OPTIONS = ["kg", "gm", "ltr", "ml", "pcs", "box", "packet", "dozen", "bag"];
const INVENTORY_CSV_COLUMNS = ["name", "category", "stock", "unit", "min", "rate"];
const INVENTORY_DEMO_CSV = `${INVENTORY_CSV_COLUMNS.join(",")}
Maida,Flour,50,kg,10,38
Sugar,Sweetener,80,kg,20,44
Ghee,Dairy,25,kg,5,620
`;
const EMPLOYEE_CSV_COLUMNS = ["name", "role", "contact", "address", "aadhaar", "joining", "salary", "shiftStart", "shiftEnd"];
const EMPLOYEE_DEMO_CSV = `${EMPLOYEE_CSV_COLUMNS.join(",")}
Ramesh,Karigar,+91 98765 43210,Muzaffarnagar,1234 5678 9012,2026-09-01,18000,09:00:00,21:00:00
Suresh,Counter,+91 98765 43211,Muzaffarnagar,2234 5678 9012,2026-09-05,15000,09:00:00,21:00:00
`;
const PRODUCT_CSV_COLUMNS = ["sku", "name", "category", "unit", "rate", "taxRate"];
const PRODUCT_DEMO_CSV = `${PRODUCT_CSV_COLUMNS.join(",")}
SAM-001,Samosa,Namkeen,piece,12,5
KAL-001,Kalakand,Sweets,kg,420,5
`;
const VENDOR_CSV_COLUMNS = ["name", "category", "contact"];
const VENDOR_DEMO_CSV = `${VENDOR_CSV_COLUMNS.join(",")}
Anshul,Dairy,+91 98765 43210
Bharat Gas,Gas,+91 98765 43211
`;
const EXPENSE_CSV_COLUMNS = ["expenseDate", "label", "category", "mode", "amount"];
const EXPENSE_DEMO_CSV = `${EXPENSE_CSV_COLUMNS.join(",")}
${today()},Shop rent,Rent,Bank,25000
${today()},Cleaning,Housekeeping,Cash,500
`;
const CATEGORY_CSV_COLUMNS = ["type", "name"];
const CATEGORY_DEMO_CSV = `${CATEGORY_CSV_COLUMNS.join(",")}
Raw Material,Dairy
Raw Material,Flour
Vendor,Dairy
Expense,Rent
Product,Namkeen
`;
const USER_CSV_COLUMNS = ["username", "password", "name", "role", "status"];
const USER_DEMO_CSV = `${USER_CSV_COLUMNS.join(",")}
counter1,ChangeMe123,Counter Staff,cashier,Active
inventory1,ChangeMe123,Inventory Staff,inventory,Active
`;
const INVENTORY_USAGE_CSV_COLUMNS = ["usageDate", "materialName", "category", "usedQty", "unusedQty", "wastageQty", "unit", "notes"];
const INVENTORY_USAGE_DEMO_CSV = `${INVENTORY_USAGE_CSV_COLUMNS.join(",")}
${today()},Ghee,Dairy,2,23,0,kg,Morning production
${today()},Maida,Flour,5,45,0,kg,Samosa batch
`;
const DAILY_VENDOR_CSV_COLUMNS = ["date", "vendor", "category", "material", "qty", "unit", "rate", "paid", "mode", "notes"];
const DAILY_VENDOR_DEMO_CSV = `${DAILY_VENDOR_CSV_COLUMNS.join(",")}
${today()},Anshul,Dairy,Ghee,1,kg,620,0,Cash,Milk sweets stock
${today()},Bharat Gas,Gas,Cylinder,1,pcs,2500,2500,UPI,Gas refill
`;
const CATEGORY_TYPE_OPTIONS = ["Product", "Vendor", "Raw Material", "Expense"];
const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "cashier", label: "Cashier" },
  { value: "inventory", label: "Inventory" },
  { value: "sales", label: "Sales" },
  { value: "staff", label: "Staff" },
];
const ERP_MODULES = navGroups.flatMap((group) =>
  group.items.map((item) => ({ key: item.key, label: item.label }))
);

function money(value) {
  return `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
}

function quantity(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function numberInputValue(value, digits = 3) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "";
  return Number(numberValue.toFixed(digits)).toString();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function csvToRecords(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/\s+/g, "_"));

  return rows
    .slice(1)
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, (row[index] || "").trim()]))
    )
    .filter((record) => Object.values(record).some(Boolean));
}

function downloadTextFile(filename, content, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const textValue = String(value ?? "");
  return /[",\n]/.test(textValue) ? `"${textValue.replace(/"/g, '""')}"` : textValue;
}

function recordsToCsv(columns, records) {
  const header = columns.join(",");
  const body = records
    .map((record) => columns.map((column) => escapeCsvValue(record[column])).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

function matchesSearch(searchTerm, values) {
  const query = String(searchTerm || "").trim().toLowerCase();
  if (!query) return true;
  return values
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase()
    .includes(query);
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
    shiftStart: employee.shiftStart || "09:00:00",
    shiftEnd: employee.shiftEnd || "21:00:00",
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
    category: item.category || "",
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
    category: item.category || "",
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
    category: item.category || "",
    contact: item.contact || "-",
    purchases: Number(item.purchases || 0),
    pending: Number(item.pending || 0),
    lastPaid: Number(item.lastPaid || 0),
    cycle: item.cycle || "Weekly",
  };
}

function normalizeVendorPurchase(item, index = 0) {
  const qty = Number(item.qty || 0);
  const rate = Number(item.rate || 0);
  const paid = Number(item.paid || 0);
  const amount = Number(item.amount ?? qty * rate);

  return {
    id: String(item.id || `PUR-${index + 1}`),
    vendorId: item.vendorId ? String(item.vendorId) : "",
    vendor: item.vendor || item.vendorName || "",
    material: item.material || item.itemName || "",
    category: item.category || "",
    date: item.date || item.purchaseDate || today(),
    purchaseDate: item.purchaseDate || item.date || today(),
    qty,
    unit: item.unit || "kg",
    rate,
    amount,
    paid,
    pending: Number(item.pending ?? Math.max(0, amount - paid)),
    mode: item.mode || "Cash",
    notes: item.notes || "",
  };
}

function normalizeInventoryUsage(item, index = 0) {
  return {
    id: String(item.id || `USG-${index + 1}`),
    materialId: item.materialId ? String(item.materialId) : "",
    materialName: item.materialName || item.material || item.name || "",
    category: item.category || "",
    usageDate: item.usageDate || item.date || today(),
    usedQty: Number(item.usedQty || item.used || 0),
    unusedQty: Number(item.unusedQty || item.unused || 0),
    wastageQty: Number(item.wastageQty || item.wastage || 0),
    unit: item.unit || "kg",
    notes: item.notes || "",
  };
}

function normalizeEmployeeAttendance(item, index = 0) {
  return {
    id: String(item.id || `ATT-${index + 1}`),
    employeeId: item.employeeId ? String(item.employeeId) : "",
    employeeName: item.employeeName || item.name || "Employee",
    attendanceDate: item.attendanceDate || item.date || today(),
    status: item.status || "Absent",
    checkIn: item.checkIn || "",
    checkOut: item.checkOut || "",
    notes: item.notes || "",
  };
}

function normalizeVendorPayment(item, index = 0) {
  return {
    id: String(item.id || `PAY-${index + 1}`),
    vendorId: item.vendorId ? String(item.vendorId) : "",
    vendorName: item.vendorName || item.vendor || "",
    paymentDate: item.paymentDate || item.date || today(),
    amount: Number(item.amount || 0),
    mode: item.mode || "Cash",
    notes: item.notes || "",
  };
}

function normalizeExpense(item, index = 0) {
  return {
    id: String(item.id || `EXP-${index + 1}`),
    date: item.date || item.expenseDate || today(),
    expenseDate: item.expenseDate || item.date || today(),
    title: item.title || item.label || "Expense",
    label: item.label || item.title || "Expense",
    category: item.category || "",
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
    role: String(item.role || "accountant").toLowerCase(),
    status: item.status || "Active",
    protected: item.protected ?? item.username === "admin",
  };
}

function normalizePermission(item, index = 0) {
  const moduleKey = item.moduleKey || item.module_key || "operations";
  const role = String(item.role || item.roleName || item.role_name || "accountant").toLowerCase();
  return {
    id: String(item.id || `${role}-${moduleKey}` || `PERM-${index + 1}`),
    role,
    moduleKey,
    moduleLabel: item.moduleLabel || item.module_label || ERP_MODULES.find((module) => module.key === moduleKey)?.label || moduleKey,
    canView: Boolean(item.canView ?? item.can_view ?? true),
    canAdd: Boolean(item.canAdd ?? item.can_add ?? true),
    canEdit: Boolean(item.canEdit ?? item.can_edit ?? true),
    canDelete: Boolean(item.canDelete ?? item.can_delete ?? true),
  };
}

function defaultPermission(role, module) {
  const normalizedRole = String(role || "accountant").toLowerCase();
  return {
    role: normalizedRole,
    moduleKey: module.key,
    moduleLabel: module.label,
    canView: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
  };
}

function permissionFor(permissionRows, role, module) {
  const normalizedRole = String(role || "accountant").toLowerCase();
  if (normalizedRole === "admin") {
    return defaultPermission("admin", module);
  }
  return (
    permissionRows.find(
      (permission) => permission.role === normalizedRole && permission.moduleKey === module.key
    ) || defaultPermission(normalizedRole, module)
  );
}

function canViewRoute(permissionRows, role, routeKey) {
  const module = ERP_MODULES.find((item) => item.key === routeKey);
  if (!module) return true;
  return permissionFor(permissionRows, role, module).canView;
}

function firstAccessibleRoute(permissionRows, role) {
  return ERP_MODULES.find((module) => permissionFor(permissionRows, role, module).canView)?.key || "operations";
}

function roleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || String(role || "").replace(/\b\w/g, (match) => match.toUpperCase());
}

function lookupKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function optionLabelScore(value) {
  const label = String(value || "").trim();
  if (!label) return -1;
  const hasUpper = /[A-Z]/.test(label);
  const hasLower = /[a-z]/.test(label);
  if (hasUpper && hasLower) return 3;
  if (hasUpper) return 2;
  if (hasLower) return 1;
  return 0;
}

function uniqueValues(values) {
  const unique = new Map();
  values.forEach((value) => {
    const label = String(value || "").trim();
    if (!label) return;
    const key = lookupKey(label);
    const existing = unique.get(key);
    if (!existing || optionLabelScore(label) > optionLabelScore(existing)) {
      unique.set(key, label);
    }
  });
  return Array.from(unique.values());
}

function sameText(a, b) {
  return lookupKey(a) === lookupKey(b);
}

function categoryNames(categoryRows, type, fallbackValues = []) {
  return uniqueValues([
    ...categoryRows
      .filter((category) => sameText(category.type, type))
      .map((category) => category.name),
    ...fallbackValues,
  ]);
}

function byName(records, name, field = "name") {
  const key = lookupKey(name);
  return records.find((record) => lookupKey(record[field]) === key);
}

function uniqueBy(records, keyFn) {
  const unique = new Map();
  records.forEach((record) => {
    const key = keyFn(record);
    if (key) unique.set(key, record);
  });
  return Array.from(unique.values());
}

function vendorKey(record) {
  const id = record.vendorId || record.id;
  const name = record.vendorName || record.vendor || record.name || "";
  return id ? `id:${String(id)}` : `name:${name.trim().toLowerCase()}`;
}

function purchaseAmount(purchase) {
  return Number(purchase.amount || Number(purchase.qty || 0) * Number(purchase.rate || 0));
}

function purchasePending(purchase) {
  const amount = purchaseAmount(purchase);
  const paid = Number(purchase.paid || 0);
  return Math.max(0, Number(purchase.pending ?? amount - paid));
}

function paymentPurchaseIds(payment) {
  const match = String(payment.notes || "").match(/purchases?:\s*([a-z0-9,\s-]+)/i);
  return match ? match[1].split(/[\s,]+/).filter(Boolean).map(String) : [];
}

function applyPaymentAmountToPurchase(purchase, paymentAmount) {
  const applied = Math.min(purchase.pending, Number(paymentAmount || 0));
  return {
    ...purchase,
    paid: Number(purchase.paid || 0) + applied,
    pending: Math.max(0, Number(purchase.pending || 0) - applied),
  };
}

function resolvePurchaseBalances(purchases) {
  return purchases.map((purchase) => ({
    ...purchase,
    amount: purchaseAmount(purchase),
    paid: Number(purchase.paid || 0),
    pending: purchasePending(purchase),
  }));
}

function applyDynamicVendorBalances(vendors, purchases, payments) {
  const purchaseTotals = new Map();
  purchases.forEach((purchase) => {
    const key = vendorKey(purchase);
    const current = purchaseTotals.get(key) || { purchases: 0, pending: 0 };
    current.purchases += purchaseAmount(purchase);
    current.pending += purchasePending(purchase);
    purchaseTotals.set(key, current);
  });

  const lastPayments = new Map();
  payments.forEach((payment) => {
    const key = vendorKey(payment);
    const existing = lastPayments.get(key);
    if (!existing || `${payment.paymentDate}${payment.id}`.localeCompare(`${existing.paymentDate}${existing.id}`) > 0) {
      lastPayments.set(key, payment);
    }
  });

  return vendors.map((vendor) => {
    const key = vendorKey(vendor);
    const totals = purchaseTotals.get(key) || { purchases: 0, pending: 0 };
    const lastPayment = lastPayments.get(key);
    return {
      ...vendor,
      purchases: totals.purchases,
      pending: totals.pending,
      lastPaid: Number(lastPayment?.amount || 0),
    };
  });
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
  const [staff, setStaff] = useState([]);
  const [employeeStatus, setEmployeeStatus] = useState("Ready");
  const [materialRows, setMaterialRows] = useState([]);
  const [productRows, setProductRows] = useState([]);
  const [vendorRows, setVendorRows] = useState([]);
  const [vendorPurchaseRows, setVendorPurchaseRows] = useState([]);
  const [inventoryUsageRows, setInventoryUsageRows] = useState([]);
  const [employeeAttendanceRows, setEmployeeAttendanceRows] = useState([]);
  const [vendorPaymentRows, setVendorPaymentRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
  const [userRows, setUserRows] = useState([]);
  const [permissionRows, setPermissionRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    listSalesBills().then((records) => {
      setSalesBills(records);
      setSalesStatus("Ready");
    });
    listEmployees().then((records) => {
      setStaff(normalizeStaff(records));
      setEmployeeStatus("Ready");
    });
    loadBusinessData().then(applyBusinessData).catch(() => {});
  }, []);

  function applyBusinessData(data) {
    if (data.employees) setStaff(normalizeStaff(data.employees));
    if (data.rawStock) setMaterialRows(data.rawStock.map(normalizeMaterial));
    if (data.products) setProductRows(data.products.map(normalizeProduct));
    if (data.vendors) setVendorRows(data.vendors.map(normalizeVendor));
    if (data.vendorPurchases) setVendorPurchaseRows(data.vendorPurchases.map(normalizeVendorPurchase));
    if (data.inventoryUsage || data.stockHistory) setInventoryUsageRows((data.inventoryUsage || data.stockHistory).map(normalizeInventoryUsage));
    if (data.employeeAttendance) setEmployeeAttendanceRows(data.employeeAttendance.map(normalizeEmployeeAttendance));
    if (data.vendorPayments) setVendorPaymentRows(data.vendorPayments.map(normalizeVendorPayment));
    if (data.expenses) setExpenseRows(data.expenses.map(normalizeExpense));
    if (data.categories) setCategoryRows(data.categories.map(normalizeCategory));
    if (data.users) setUserRows(data.users.map(normalizeUser));
    if (data.permissions) setPermissionRows(data.permissions.map(normalizePermission));
  }

  async function login(credentials) {
    try {
      const result = await loginUser(credentials);
      const user = normalizeUser(result.user);
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      setSession(user);
      return true;
    } catch {
      if (
        credentials.username.trim().toLowerCase() === adminUser.username &&
        credentials.password === adminUser.password
      ) {
        const user = { name: adminUser.name, role: adminUser.role.toLowerCase(), username: adminUser.username };
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        setSession(user);
        return true;
      }
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

  async function updateEmployee(employee) {
    const record = normalizeEmployee(employee);
    const result = await updateEmployeeRecord(record);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setStaff((records) => normalizeStaff(records.map((item) => (item.id === record.id ? record : item))));
    }
    setEmployeeStatus("Employee updated");
    return { ...result, record: result.record || record };
  }

  async function deleteEmployee(employeeId) {
    const result = await deleteEmployeeRecord(employeeId);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setStaff((records) => normalizeStaff(records.filter((item) => item.id !== String(employeeId))));
    }
    setEmployeeStatus("Employee removed");
    return { ...result, id: String(employeeId) };
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
    return { ...result, record };
  }

  async function updateMaterial(material) {
    const record = normalizeMaterial(material);
    const payload = {
      name: record.name,
      category: record.category,
      stock: record.stock,
      unit: record.unit,
      min: record.min,
      rate: record.rate,
    };
    const result = await updateBusinessRecord(`/api/raw-stock/${record.id}`, payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setMaterialRows((records) => records.map((item) => (item.id === record.id ? record : item)));
    }
    return result;
  }

  async function deleteMaterial(materialId) {
    const result = await deleteBusinessRecord(`/api/raw-stock/${materialId}`);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setMaterialRows((records) => records.filter((item) => item.id !== String(materialId)));
    }
    return { ...result, id: String(materialId) };
  }

  async function updateMaterialStock(materialId, patch) {
    const current = materialRows.find((record) => record.id === String(materialId));
    if (!current) return { source: "local" };
    const record = normalizeMaterial({
      ...current,
      ...patch,
      stock: Number(patch.stock ?? current.stock),
      inToday: Number(patch.inToday ?? current.inToday),
      outToday: Number(patch.outToday ?? current.outToday),
      wastage: Number(patch.wastage ?? current.wastage),
    });
    const payload = {
      name: record.name,
      category: record.category,
      stock: record.stock,
      unit: record.unit,
      min: record.min,
      rate: record.rate,
      inToday: record.inToday,
      outToday: record.outToday,
      wastage: record.wastage,
    };
    const result = await updateBusinessRecord(`/api/raw-stock/${record.id}`, payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setMaterialRows((records) => records.map((item) => (item.id === record.id ? record : item)));
    }
    return { ...result, record };
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

  async function updateProduct(product) {
    const record = normalizeProduct(product);
    const payload = {
      sku: record.sku,
      name: record.name,
      category: record.category,
      unit: record.unit,
      rate: record.rate,
      taxRate: record.taxRate,
    };
    const result = await updateBusinessRecord(`/api/products/${record.id}`, payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setProductRows((records) => records.map((item) => (item.id === record.id ? record : item)));
    }
    return result;
  }

  async function deleteProduct(productId) {
    const result = await deleteBusinessRecord(`/api/products/${productId}`);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setProductRows((records) => records.filter((item) => item.id !== String(productId)));
    }
    return { ...result, id: String(productId) };
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

  async function updateVendor(vendor) {
    const record = normalizeVendor(vendor);
    const payload = {
      name: record.name,
      category: record.category,
      contact: record.contact === "-" ? "" : record.contact,
    };
    const result = await updateBusinessRecord(`/api/vendors/${record.id}`, payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorRows((records) => records.map((item) => (item.id === record.id ? record : item)));
    }
    return result;
  }

  async function deleteVendor(vendorId) {
    const result = await deleteBusinessRecord(`/api/vendors/${vendorId}`);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorRows((records) => records.filter((item) => item.id !== String(vendorId)));
    }
    return { ...result, id: String(vendorId) };
  }

  async function persistVendorPayment(payment) {
    const record = normalizeVendorPayment({ ...payment, id: `PAY-${Date.now()}` });
    const result = await createBusinessRecord("/api/vendor-payments", toVendorPaymentPayload(record));
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorPaymentRows((records) => [record, ...records]);
      setVendorRows((records) =>
        records.map((vendor) =>
          vendor.id === String(payment.vendorId)
            ? { ...vendor, pending: Math.max(0, vendor.pending - Number(payment.amount || 0)), lastPaid: Number(payment.amount || 0) }
            : vendor
        )
      );
    }
    return { ...result, record };
  }

  function toVendorPaymentPayload(payment) {
    const record = normalizeVendorPayment(payment);
    const selectedVendor =
      vendorRows.find((vendor) => vendor.id === record.vendorId) ||
      vendorRows.find((vendor) => vendor.name === record.vendorName);

    return {
      vendorId: selectedVendor?.id ? Number(selectedVendor.id) : undefined,
      vendorName: selectedVendor?.name || record.vendorName,
      amount: record.amount,
      mode: record.mode,
      paymentDate: record.paymentDate,
      notes: record.notes,
    };
  }

  async function recordPurchasePayment(purchase, paidAmount = Number(purchase.paid || 0)) {
    if (Number(paidAmount || 0) <= 0) return null;
    const selectedVendor =
      vendorRows.find((vendor) => vendor.id === purchase.vendorId) ||
      vendorRows.find((vendor) => vendor.name === purchase.vendor);
    const paymentRecord = normalizeVendorPayment({
      id: `PAY-${Date.now()}`,
      vendorId: selectedVendor?.id || purchase.vendorId,
      vendorName: purchase.vendor,
      paymentDate: purchase.date,
      amount: paidAmount,
      mode: purchase.mode,
      notes: `Paid with daily vendor entry - ${purchase.material}`,
    });
    const result = await createBusinessRecord("/api/vendor-payments", toVendorPaymentPayload(paymentRecord));
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorPaymentRows((records) => [paymentRecord, ...records]);
    }
    return { ...result, record: paymentRecord };
  }

  async function updateVendorPayment(payment) {
    const record = normalizeVendorPayment(payment);
    const result = await updateBusinessRecord(`/api/vendor-payments/${record.id}`, toVendorPaymentPayload(record));
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorPaymentRows((records) => records.map((item) => (item.id === record.id ? record : item)));
    }
    return { ...result, record };
  }

  async function deleteVendorPayment(paymentId) {
    const result = await deleteBusinessRecord(`/api/vendor-payments/${paymentId}`);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorPaymentRows((records) => records.filter((item) => item.id !== String(paymentId)));
    }
    return { ...result, id: String(paymentId) };
  }

  function toVendorPurchasePayload(purchase) {
    const record = normalizeVendorPurchase(purchase);
    const selectedVendor =
      vendorRows.find((vendor) => vendor.id === record.vendorId) ||
      vendorRows.find((vendor) => vendor.name === record.vendor);

    return {
      vendorId: selectedVendor?.id ? Number(selectedVendor.id) : record.vendorId ? Number(record.vendorId) : undefined,
      vendorName: record.vendor,
      purchaseDate: record.date,
      itemName: record.material,
      category: record.category,
      qty: record.qty,
      unit: record.unit,
      rate: record.rate,
      paid: record.paid,
      mode: record.mode,
      notes: record.notes,
    };
  }

  async function persistVendorPurchase(purchase) {
    const record = normalizeVendorPurchase({ ...purchase, id: `PUR-${Date.now()}` });
    const result = await createBusinessRecord("/api/vendor-purchases", toVendorPurchasePayload(record));
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorPurchaseRows((records) => [record, ...records]);
    }
    await recordPurchasePayment(record);
    return { ...result, record };
  }

  async function updateVendorPurchase(purchase, options = {}) {
    const existing = vendorPurchaseRows.find((item) => item.id === String(purchase.id));
    const previousPaid = existing ? Number(existing.paid || 0) : 0;
    const record = normalizeVendorPurchase(purchase);
    const result = await updateBusinessRecord(`/api/vendor-purchases/${record.id}`, toVendorPurchasePayload(record));
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorPurchaseRows((records) => records.map((item) => (item.id === record.id ? record : item)));
    }
    const paidDelta = Math.max(0, Number(record.paid || 0) - previousPaid);
    if (!options.skipPaymentRecord) {
      await recordPurchasePayment(record, paidDelta);
    }
    return { ...result, record };
  }

  async function deleteVendorPurchase(purchaseId) {
    const result = await deleteBusinessRecord(`/api/vendor-purchases/${purchaseId}`);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorPurchaseRows((records) => records.filter((item) => item.id !== String(purchaseId)));
    }
    return { ...result, id: String(purchaseId) };
  }

  function toInventoryUsagePayload(usage) {
    const record = normalizeInventoryUsage(usage);
    const selectedMaterial =
      materialRows.find((material) => material.id === record.materialId) ||
      materialRows.find((material) => material.name === record.materialName);

    return {
      materialId: selectedMaterial?.id ? Number(selectedMaterial.id) : undefined,
      materialName: selectedMaterial?.name || record.materialName,
      category: record.category || selectedMaterial?.category || "",
      usageDate: record.usageDate,
      usedQty: record.usedQty,
      unusedQty: record.unusedQty,
      wastageQty: record.wastageQty,
      unit: record.unit || selectedMaterial?.unit || "kg",
      notes: record.notes,
    };
  }

  async function persistInventoryUsage(usage) {
    const record = normalizeInventoryUsage({ ...usage, id: `USG-${Date.now()}` });
    const result = await createBusinessRecord("/api/inventory-usage", toInventoryUsagePayload(record));
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setInventoryUsageRows((records) => [record, ...records]);
    }
    return { ...result, record };
  }

  async function updateInventoryUsage(usage) {
    const record = normalizeInventoryUsage(usage);
    const result = await updateBusinessRecord(`/api/inventory-usage/${record.id}`, toInventoryUsagePayload(record));
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setInventoryUsageRows((records) => records.map((item) => (item.id === record.id ? record : item)));
    }
    return { ...result, record };
  }

  async function deleteInventoryUsage(usageId) {
    const result = await deleteBusinessRecord(`/api/inventory-usage/${usageId}`);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setInventoryUsageRows((records) => records.filter((item) => item.id !== String(usageId)));
    }
    return { ...result, id: String(usageId) };
  }

  async function saveAttendanceBatch(attendance) {
    const payload = {
      date: attendance.date || attendance.attendanceDate || today(),
      status: attendance.status || "Present",
      checkIn: attendance.checkIn || "",
      checkOut: attendance.checkOut || "",
      notes: attendance.notes || "",
      employeeIds: attendance.employeeIds || [],
    };
    const result = await createBusinessRecord("/api/attendance", payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      const selectedIds = new Set(payload.employeeIds.map(String));
      const localRows = staff
        .filter((employee) => selectedIds.has(employee.id))
        .map((employee, index) =>
          normalizeEmployeeAttendance({
            id: `ATT-${payload.date}-${employee.id}`,
            employeeId: employee.id,
            employeeName: employee.name,
            attendanceDate: payload.date,
            status: payload.status,
            checkIn: payload.checkIn,
            checkOut: payload.checkOut,
            notes: payload.notes,
          }, index)
        );
      setEmployeeAttendanceRows((records) => [
        ...localRows,
        ...records.filter(
          (record) => !(record.attendanceDate === payload.date && selectedIds.has(record.employeeId))
        ),
      ]);
      if (payload.date === today()) {
        setStaff((records) =>
          records.map((employee) => (selectedIds.has(employee.id) ? { ...employee, status: payload.status } : employee))
        );
      }
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

  async function updateExpense(expense) {
    const record = normalizeExpense(expense);
    const payload = {
      expenseDate: record.expenseDate,
      label: record.label,
      category: record.category,
      amount: record.amount,
      mode: record.mode,
    };
    const result = await updateBusinessRecord(`/api/expenses/${record.id}`, payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setExpenseRows((records) => records.map((item) => (item.id === record.id ? record : item)));
    }
    return result;
  }

  async function deleteExpense(expenseId) {
    const result = await deleteBusinessRecord(`/api/expenses/${expenseId}`);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setExpenseRows((records) => records.filter((item) => item.id !== String(expenseId)));
    }
    return { ...result, id: String(expenseId) };
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

  async function updateCategory(category) {
    const record = normalizeCategory(category);
    const payload = {
      type: record.type,
      name: record.name,
      items: record.items,
      margin: record.margin,
    };
    const result = await updateBusinessRecord(`/api/categories/${record.id}`, payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setCategoryRows((records) => records.map((item) => (item.id === record.id ? record : item)));
    }
    return result;
  }

  async function deleteCategory(categoryId) {
    const result = await deleteBusinessRecord(`/api/categories/${categoryId}`);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setCategoryRows((records) => records.filter((item) => item.id !== String(categoryId)));
    }
    return { ...result, id: String(categoryId) };
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

  async function updateUser(user) {
    const record = normalizeUser(user);
    const payload = {
      username: record.username,
      password: user.password,
      name: record.name,
      role: record.role,
      status: record.status,
    };
    const result = await updateBusinessRecord(`/api/users/${record.id}`, payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setUserRows((records) => records.map((item) => (item.id === record.id ? record : item)));
    }
    return result;
  }

  async function savePermission(permission) {
    const record = normalizePermission(permission);
    const payload = {
      role: record.role,
      moduleKey: record.moduleKey,
      moduleLabel: record.moduleLabel,
      canView: record.canView,
      canAdd: record.canAdd,
      canEdit: record.canEdit,
      canDelete: record.canDelete,
    };
    const result = await createBusinessRecord("/api/permissions", payload);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setPermissionRows((records) => [
        record,
        ...records.filter((item) => !(item.role === record.role && item.moduleKey === record.moduleKey)),
      ]);
    }
    return { ...result, record };
  }

  async function deleteUser(userId) {
    const result = await deleteBusinessRecord(`/api/users/${userId}`);
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setUserRows((records) => records.filter((item) => item.id !== String(userId)));
    }
    return { ...result, id: String(userId) };
  }

  const dynamicVendorPurchaseRows = useMemo(
    () => resolvePurchaseBalances(vendorPurchaseRows),
    [vendorPurchaseRows]
  );
  const dynamicVendorRows = useMemo(
    () => applyDynamicVendorBalances(vendorRows, dynamicVendorPurchaseRows, vendorPaymentRows),
    [vendorRows, dynamicVendorPurchaseRows, vendorPaymentRows]
  );
  const visibleRoute = canViewRoute(permissionRows, session?.role, route)
    ? route
    : firstAccessibleRoute(permissionRows, session?.role);

  if (!session) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <Shell
      user={session}
      route={visibleRoute}
      onRoute={setRoute}
      onLogout={logout}
      permissionRows={permissionRows}
      searchTerm={searchTerm}
      onSearch={setSearchTerm}
    >
      <RouteView
        route={visibleRoute}
        onRoute={setRoute}
        searchTerm={searchTerm}
        session={session}
        permissionRows={permissionRows}
        staff={staff}
        employeeStatus={employeeStatus}
        materialRows={materialRows}
        productRows={productRows}
        vendorRows={dynamicVendorRows}
        vendorPurchaseRows={dynamicVendorPurchaseRows}
        inventoryUsageRows={inventoryUsageRows}
        employeeAttendanceRows={employeeAttendanceRows}
        vendorPaymentRows={vendorPaymentRows}
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
        onUpdateMaterial={updateMaterial}
        onDeleteMaterial={deleteMaterial}
        onUpdateMaterialStock={updateMaterialStock}
        onSaveProduct={persistProduct}
        onUpdateProduct={updateProduct}
        onDeleteProduct={deleteProduct}
        onSaveVendor={persistVendor}
        onUpdateVendor={updateVendor}
        onDeleteVendor={deleteVendor}
        onSaveVendorPayment={persistVendorPayment}
        onUpdateVendorPayment={updateVendorPayment}
        onDeleteVendorPayment={deleteVendorPayment}
        onSaveVendorPurchase={persistVendorPurchase}
        onUpdateVendorPurchase={updateVendorPurchase}
        onDeleteVendorPurchase={deleteVendorPurchase}
        onSaveInventoryUsage={persistInventoryUsage}
        onUpdateInventoryUsage={updateInventoryUsage}
        onDeleteInventoryUsage={deleteInventoryUsage}
        onSaveAttendance={saveAttendanceBatch}
        onSaveExpense={persistExpense}
        onUpdateExpense={updateExpense}
        onDeleteExpense={deleteExpense}
        onSaveCategory={persistCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onSaveUser={persistUser}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
        onSavePermission={savePermission}
      />
    </Shell>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setForgotMessage("");
    setError("");
    setLoading(true);
    const ok = await onLogin({ username, password });
    setLoading(false);
    setError(ok ? "" : "Wrong username or password");
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
        <button className="action-button full" type="submit" disabled={loading}>
          {loading ? "Checking..." : "Login"}
        </button>
        <button className="text-button" type="button" onClick={forgotPassword}>
          Forgot password?
        </button>
      </form>
    </main>
  );
}

function Shell({ user, route, onRoute, onLogout, permissionRows, searchTerm, onSearch, children }) {
  const [open, setOpen] = useState(false);
  const clock = useClock();
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canViewRoute(permissionRows, user.role, item.key)),
    }))
    .filter((group) => group.items.length);

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
          {visibleGroups.map((group) => (
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
            <input
              type="search"
              value={searchTerm}
              placeholder="Search bills, vendors, stock"
              onChange={(event) => onSearch(event.target.value)}
            />
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
  searchTerm,
  staff,
  employeeStatus,
  materialRows,
  productRows,
  vendorRows,
  vendorPurchaseRows,
  inventoryUsageRows,
  employeeAttendanceRows,
  vendorPaymentRows,
  expenseRows,
  categoryRows,
  userRows,
  permissionRows,
  salesBills,
  salesStatus,
  onSaveBill,
  onSaveEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onSaveMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onUpdateMaterialStock,
  onSaveProduct,
  onUpdateProduct,
  onDeleteProduct,
  onSaveVendor,
  onUpdateVendor,
  onDeleteVendor,
  onSaveVendorPayment,
  onUpdateVendorPayment,
  onDeleteVendorPayment,
  onSaveVendorPurchase,
  onUpdateVendorPurchase,
  onDeleteVendorPurchase,
  onSaveInventoryUsage,
  onUpdateInventoryUsage,
  onDeleteInventoryUsage,
  onSaveAttendance,
  onSaveExpense,
  onUpdateExpense,
  onDeleteExpense,
  onSaveCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSaveUser,
  onUpdateUser,
  onDeleteUser,
  onSavePermission,
}) {
  if (route === "operations") {
    return (
      <OperationsDashboard
        salesBills={salesBills}
        staff={staff}
        materialRows={materialRows}
        vendorRows={vendorRows}
        expenseRows={expenseRows}
        attendanceRows={employeeAttendanceRows}
        onStartBill={() => onRoute("sales-slip")}
      />
    );
  }
  if (route === "finance") {
    return (
      <FinanceDashboard
        salesBills={salesBills}
        staff={staff}
        expenseRows={expenseRows}
        vendorRows={vendorRows}
        vendorPurchaseRows={vendorPurchaseRows}
      />
    );
  }
  if (route === "sales-slip") {
    return <SalesSlipPage bills={salesBills} status={salesStatus} productRows={productRows} onSaveBill={onSaveBill} globalSearch={searchTerm} />;
  }
  if (route === "inventory") {
    return (
      <InventoryPage
        materialRows={materialRows}
        productRows={productRows}
        categoryRows={categoryRows}
        onSaveMaterial={onSaveMaterial}
        onUpdateMaterial={onUpdateMaterial}
        onDeleteMaterial={onDeleteMaterial}
        onUpdateMaterialStock={onUpdateMaterialStock}
        onSaveCategory={onSaveCategory}
        onSaveProduct={onSaveProduct}
        onUpdateProduct={onUpdateProduct}
        onDeleteProduct={onDeleteProduct}
        globalSearch={searchTerm}
      />
    );
  }
  if (route === "inventory-usage") {
    return (
      <InventoryUsagePage
        materialRows={materialRows}
        usageRows={inventoryUsageRows}
        categoryRows={categoryRows}
        onSaveUsage={onSaveInventoryUsage}
        onUpdateUsage={onUpdateInventoryUsage}
        onDeleteUsage={onDeleteInventoryUsage}
        globalSearch={searchTerm}
      />
    );
  }
  if (route === "vendor-payment") {
    return (
      <VendorPaymentPage
        vendorRows={vendorRows}
        purchaseRows={vendorPurchaseRows}
        paymentRows={vendorPaymentRows}
        onSaveVendorPayment={onSaveVendorPayment}
        onUpdateVendorPayment={onUpdateVendorPayment}
        onDeleteVendorPayment={onDeleteVendorPayment}
        onUpdatePurchase={onUpdateVendorPurchase}
        globalSearch={searchTerm}
      />
    );
  }
  if (route === "daily-vendors") {
    return (
      <DailyVendorsPage
        vendorRows={vendorRows}
        materialRows={materialRows}
        purchaseRows={vendorPurchaseRows}
        categoryRows={categoryRows}
        onSaveVendor={onSaveVendor}
        onSaveCategory={onSaveCategory}
        onSaveMaterial={onSaveMaterial}
        onSavePurchase={onSaveVendorPurchase}
        onUpdatePurchase={onUpdateVendorPurchase}
        onDeletePurchase={onDeleteVendorPurchase}
        globalSearch={searchTerm}
      />
    );
  }
  if (route === "employees") {
    return (
      <EmployeesPage
        staff={staff}
        status={employeeStatus}
        attendanceRows={employeeAttendanceRows}
        onSaveEmployee={onSaveEmployee}
        onUpdateEmployee={onUpdateEmployee}
        onDeleteEmployee={onDeleteEmployee}
        globalSearch={searchTerm}
      />
    );
  }
  if (route === "attendance") return <AttendancePage staff={staff} attendanceRows={employeeAttendanceRows} onSaveAttendance={onSaveAttendance} globalSearch={searchTerm} />;
  if (route === "vendors") {
    return (
      <VendorsPage
        vendorRows={vendorRows}
        categoryRows={categoryRows}
        onSaveVendor={onSaveVendor}
        onUpdateVendor={onUpdateVendor}
        onDeleteVendor={onDeleteVendor}
        globalSearch={searchTerm}
      />
    );
  }
  if (route === "expenses") {
    return (
      <ExpensesPage
        expenseRows={expenseRows}
        categoryRows={categoryRows}
        onSaveExpense={onSaveExpense}
        onUpdateExpense={onUpdateExpense}
        onDeleteExpense={onDeleteExpense}
        globalSearch={searchTerm}
      />
    );
  }
  if (route === "categories") {
    return (
      <CategoriesPage
        categoryRows={categoryRows}
        materialRows={materialRows}
        onSaveCategory={onSaveCategory}
        onUpdateCategory={onUpdateCategory}
        onDeleteCategory={onDeleteCategory}
        onSaveMaterial={onSaveMaterial}
        onUpdateMaterial={onUpdateMaterial}
        onDeleteMaterial={onDeleteMaterial}
        globalSearch={searchTerm}
      />
    );
  }
  if (route === "users") {
    return (
      <UsersPage
        userRows={userRows}
        permissionRows={permissionRows}
        onSaveUser={onSaveUser}
        onUpdateUser={onUpdateUser}
        onDeleteUser={onDeleteUser}
        onSavePermission={onSavePermission}
        globalSearch={searchTerm}
      />
    );
  }
  return null;
}

function OperationsDashboard({ salesBills, staff, materialRows, vendorRows, expenseRows, attendanceRows, onStartBill }) {
  const todaysSales = totalForDate(salesBills, today());
  const totalExpenses = expenseRows.reduce((sum, item) => sum + item.amount, 0);
  const vendorDues = vendorRows.reduce((sum, item) => sum + item.pending, 0);
  const lowStockRows = materialRows.filter((material) => material.stock <= material.min);
  const todayAttendance = attendanceRows.filter((record) => record.attendanceDate === today());
  const todayAttendanceByEmployee = new Map(todayAttendance.map((record) => [record.employeeId, record]));
  const presentCount = todayAttendance.length
    ? todayAttendance.filter((record) => record.status === "Present").length
    : staff.filter((employee) => employee.status === "Present").length;
  const absentCount = Math.max(0, staff.length - presentCount);
  const inventoryReady = materialRows.length
    ? Math.round(((materialRows.length - lowStockRows.length) / materialRows.length) * 100)
    : 0;

  return (
    <Page>
      <Metrics
        items={[
          ["Today's sales", money(todaysSales), "Today"],
          ["Today's expenses", money(totalExpenses), "Today"],
          ["Staff present", `${presentCount} / ${staff.length}`, `${absentCount} absent`],
          ["Vendor dues", money(vendorDues), `${vendorRows.length} vendors`],
        ]}
      />
      <section className="grid two">
        <Panel title="Operations dashboard" subtitle="Today's shop pulse" action="New bill" onAction={onStartBill}>
          <div className="batch-card">
            <span>STOCK STATUS</span>
            <strong>{inventoryReady}%</strong>
            <p>{materialRows.length ? `${lowStockRows.length} low-stock item${lowStockRows.length === 1 ? "" : "s"} found.` : "Connect inventory data to see stock status."}</p>
          </div>
          {materialRows.slice(0, 4).map((material) => (
            <div className="check-row" key={material.id}>
              <CheckCircle2 size={17} />
              <span>{material.name}</span>
              <b>{material.stock <= material.min ? "Low" : "Ready"}</b>
            </div>
          ))}
          {!materialRows.length && <div className="empty-state">No stock records found</div>}
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
          rows={staff.map((employee) => [
            employee.name,
            employee.role,
            todayAttendanceByEmployee.get(employee.id)?.status || employee.status || "Absent",
          ])}
        />
      </Panel>
    </Page>
  );
}

function FinanceDashboard({ salesBills, staff, expenseRows, vendorRows, vendorPurchaseRows }) {
  const monthSales = salesBills.reduce((sum, bill) => sum + bill.total, 0);
  const totalExpenses = expenseRows.reduce((sum, item) => sum + item.amount, 0);
  const purchases = vendorPurchaseRows.reduce((sum, item) => sum + Number(item.amount || item.qty * item.rate || 0), 0);
  const salary = staff.reduce((sum, item) => sum + item.salary, 0);
  const vendorDues = vendorRows.reduce((sum, item) => sum + item.pending, 0);

  return (
    <Page>
      <div className="filter-row">
        <label>
          FROM DATE
          <input type="date" defaultValue={monthStart()} />
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

function SalesSlipPage({ bills, status, productRows, onSaveBill, globalSearch = "" }) {
  const saleProducts = productRows;
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [shouldSeedItem, setShouldSeedItem] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [gst, setGst] = useState(false);
  const [mode, setMode] = useState("Cash");
  const [date, setDate] = useState(today());
  const [historyDate, setHistoryDate] = useState(today());
  const nextBillNo = useMemo(() => `${date}-${String(bills.length + 1).padStart(2, "0")}`, [bills.length, date]);
  const [message, setMessage] = useState(status);
  const [billNo, setBillNo] = useState("");
  const [savedBillKey, setSavedBillKey] = useState("");
  const [savingBill, setSavingBill] = useState(false);
  const productOptionId = "sales-slip-product-options";
  const productOptions = useMemo(() => {
    const filtered = saleProducts.filter((product) =>
      matchesSearch(productSearch, [product.name, product.category, product.unit, product.rate])
    );
    return productSearch.trim() ? filtered : saleProducts;
  }, [productSearch, saleProducts]);

  const rows = items.map((item) => {
    const productName = item.product || "";
    const product = saleProducts.find((entry) => sameText(entry.name, productName));
    const hasManualAmount = item.amount !== undefined && item.amount !== "";
    if (!product) {
      return {
        ...item,
        product: productName,
        qty: Number(item.qty || 0),
        qtyInput: item.qty ?? "",
        amountInput: item.amount ?? "",
        rate: 0,
        unit: "",
        total: 0,
        invalid: true,
      };
    }
    const rate = Number(product.rate || 0);
    const enteredAmount = hasManualAmount ? Number(item.amount || 0) : null;
    const qty = hasManualAmount && rate > 0 ? enteredAmount / rate : Number(item.qty || 0);
    const total = hasManualAmount ? enteredAmount : rate * qty;
    return {
      ...item,
      product: product.name,
      qty,
      qtyInput: hasManualAmount ? numberInputValue(qty, 3) : item.qty ?? "",
      amountInput: hasManualAmount ? item.amount : numberInputValue(total, 2),
      rate,
      unit: product.unit,
      total,
      invalid: false,
    };
  });
  const subtotal = rows.reduce((sum, item) => sum + item.total, 0);
  const tax = gst ? (subtotal - discount) * 0.05 : 0;
  const total = Math.max(0, subtotal - Number(discount || 0) + tax);
  const filteredBills = bills.filter(
    (bill) =>
      (!historyDate || bill.date === historyDate) &&
      matchesSearch(globalSearch, [
        bill.billNo,
        bill.date,
        bill.mode,
        bill.total,
        ...(bill.items || []).map((item) => item.product),
      ])
  );
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

  useEffect(() => {
    if (shouldSeedItem && !items.length && saleProducts[0]) {
      setItems([{ product: saleProducts[0].name, qty: 1 }]);
      setShouldSeedItem(false);
    }
  }, [items.length, saleProducts, shouldSeedItem]);

  function changeSaleProduct(index, productName) {
    setItems((records) =>
      records.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const product = saleProducts.find((entry) => sameText(entry.name, productName));
        if (!product) return { ...item, product: productName };
        const amount = item.amount;
        const rate = Number(product.rate || 0);
        return {
          ...item,
          product: product.name,
          qty: amount !== undefined && amount !== "" && rate > 0
            ? numberInputValue(Number(amount || 0) / rate, 3)
            : item.qty,
        };
      })
    );
    setSavedBillKey("");
  }

  function changeSaleQty(index, qty) {
    setItems((records) =>
      records.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const { amount, ...rest } = item;
        return { ...rest, qty };
      })
    );
    setSavedBillKey("");
  }

  function changeSaleAmount(index, amount) {
    setItems((records) =>
      records.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (amount === "") return { ...item, amount: "" };
        const product = saleProducts.find((entry) => sameText(entry.name, item.product));
        const rate = Number(product?.rate || 0);
        return {
          ...item,
          amount,
          qty: rate > 0 ? numberInputValue(Number(amount || 0) / rate, 3) : item.qty,
        };
      })
    );
    setSavedBillKey("");
  }

  function addSaleItem() {
    if (!saleProducts[0]) return;
    setShouldSeedItem(false);
    setItems((records) => [...records, { product: saleProducts[0].name, qty: 1 }]);
    setSavedBillKey("");
  }

  function removeSaleItem(index) {
    setShouldSeedItem(false);
    setItems((records) => records.filter((_, itemIndex) => itemIndex !== index));
    setSavedBillKey("");
  }

  function startNewBill() {
    const freshDate = today();
    setItems(saleProducts[0] ? [{ product: saleProducts[0].name, qty: 1 }] : []);
    setShouldSeedItem(false);
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
    if (!saleProducts.length || !rows.length) {
      setMessage("Add products before saving a bill.");
      return null;
    }
    if (rows.some((item) => item.invalid || !item.product || !item.rate)) {
      setMessage("Select valid products before saving a bill.");
      return null;
    }
    if (rows.some((item) => Number(item.qty || 0) <= 0 || Number(item.total || 0) <= 0)) {
      setMessage("Qty and amount must be greater than 0.");
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
              <button
                className="action-button"
                type="button"
                onClick={addSaleItem}
                disabled={!saleProducts.length}
              >
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
            <label className="inline-search sale-product-search">
              <Search size={17} />
              <input
                value={productSearch}
                placeholder="Search product"
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </label>
            <datalist id={productOptionId}>
              {productOptions.map((product) => (
                <option key={product.id || product.name} value={product.name} />
              ))}
            </datalist>
            <div className="sale-head">
              <span>PRODUCT</span>
              <span>AMOUNT</span>
              <span>QTY</span>
              <span>RATE</span>
              <span>TOTAL</span>
              <span />
            </div>
            {!saleProducts.length && <div className="empty-state">No products found</div>}
            {rows.map((item, index) => (
              <div className="sale-line" key={`${item.product}-${index}`}>
                <input
                  className="sale-product-input"
                  list={productOptionId}
                  value={item.product}
                  placeholder="Search product"
                  onChange={(event) => changeSaleProduct(index, event.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.amountInput}
                  onChange={(event) => changeSaleAmount(index, event.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={item.qtyInput}
                  onChange={(event) => changeSaleQty(index, event.target.value)}
                />
                <span className="sale-rate">{money(item.rate)} / {item.unit}</span>
                <strong>{money(item.total)}</strong>
                <button className="icon-button quiet" type="button" onClick={() => removeSaleItem(index)} aria-label={`Remove ${item.product}`}>
                  <X size={16} />
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

function InventoryPage({
  materialRows,
  productRows,
  categoryRows = [],
  onSaveMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onUpdateMaterialStock,
  onSaveCategory = async () => null,
  onSaveProduct,
  onUpdateProduct,
  onDeleteProduct,
  globalSearch = "",
}) {
  const csvInputRef = useRef(null);
  const productCsvInputRef = useRef(null);
  const [modalMode, setModalMode] = useState(null);
  const [materialForm, setMaterialForm] = useState({
    name: "",
    category: "",
    stock: 0,
    unit: "kg",
    min: 0,
    rate: 0,
  });
  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    category: "",
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
  const [importingCsv, setImportingCsv] = useState(false);
  const [importingProductCsv, setImportingProductCsv] = useState(false);
  const rawMaterialCategoryOptions = useMemo(
    () => categoryNames(categoryRows, "Raw Material", materialRows.map((material) => material.category)),
    [categoryRows, materialRows]
  );
  const productCategoryOptions = useMemo(
    () => categoryNames(categoryRows, "Product", productRows.map((product) => product.category)),
    [categoryRows, productRows]
  );
  const filteredMaterialRows = materialRows.filter((material) =>
    matchesSearch(globalSearch, [material.name, material.category, material.unit, material.rate, material.stock])
  );
  const filteredProductRows = productRows.filter((product) =>
    matchesSearch(globalSearch, [product.name, product.category, product.unit, product.rate, product.sku])
  );

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

  function openMaterialForm(material = null) {
    setMaterialForm(
      material
        ? { ...material }
        : {
            name: "",
            category: "",
            stock: 0,
            unit: "kg",
            min: 0,
            rate: 0,
          }
    );
    setModalMode("material");
  }

  function openProductForm(product = null) {
    setProductForm(
      product
        ? { ...product }
        : {
            sku: "",
            name: "",
            category: "",
            unit: "kg",
            rate: 0,
            taxRate: 0,
          }
    );
    setModalMode("product");
  }

  async function submitMaterial(event) {
    event.preventDefault();
    const result = await (materialForm.id ? onUpdateMaterial(materialForm) : onSaveMaterial(materialForm));
    setMaterialForm({ name: "", category: "", stock: 0, unit: "kg", min: 0, rate: 0 });
    setMessage(materialForm.id ? "Raw material updated" : "Raw material saved");
    setModalMode(null);
  }

  function normalizeInventoryImportRow(row) {
    return normalizeMaterial({
      name: row.name || row.material || row.item || "",
      category: row.category || row.type || "",
      stock: row.stock || row.qty || row.quantity || 0,
      unit: row.unit || "kg",
      min: row.min || row.minimum || row.minimum_stock || row.minimumstock || 0,
      rate: row.rate || row.price || 0,
    });
  }

  function normalizeProductImportRow(row) {
    return normalizeProduct({
      sku: row.sku || row.code || "",
      name: row.name || row.product || row.item || "",
      category: row.category || row.type || "",
      unit: row.unit || "piece",
      rate: row.rate || row.price || 0,
      taxRate: row.taxrate || row.tax_rate || row.gst || row.gst_percent || 0,
    });
  }

  async function importInventoryCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingCsv(true);
    try {
      const importedRows = csvToRecords(await file.text())
        .map(normalizeInventoryImportRow)
        .filter((record) => record.name.trim());
      const uniqueRows = Array.from(
        new Map(importedRows.map((record) => [record.name.trim().toLowerCase(), record])).values()
      );

      if (!uniqueRows.length) {
        setMessage("CSV has no raw material rows");
        return;
      }

      const existingByName = new Map(materialRows.map((material) => [material.name.trim().toLowerCase(), material]));
      const existingCategories = new Set(
        categoryRows
          .filter((category) => category.type.toLowerCase() === "raw material")
          .map((category) => category.name.trim().toLowerCase())
      );
      const importCategories = uniqueValues(uniqueRows.map((record) => record.category));
      for (const category of importCategories) {
        const key = category.trim().toLowerCase();
        if (!existingCategories.has(key)) {
          await onSaveCategory({ type: "Raw Material", name: category });
          existingCategories.add(key);
        }
      }
      let updated = 0;
      let created = 0;

      for (const record of uniqueRows) {
        const existing = existingByName.get(record.name.trim().toLowerCase());
        if (existing) {
          await onUpdateMaterial({ ...existing, ...record, id: existing.id });
          updated += 1;
        } else {
          await onSaveMaterial(record);
          created += 1;
        }
      }

      setMessage(`Imported ${uniqueRows.length} raw material rows (${created} new, ${updated} updated)`);
    } catch {
      setMessage("CSV import failed. Check the file headings and values.");
    } finally {
      setImportingCsv(false);
      event.target.value = "";
    }
  }

  function exportInventoryCsv() {
    const records = materialRows.map((material) => ({
      name: material.name,
      category: material.category,
      stock: material.stock,
      unit: material.unit,
      min: material.min,
      rate: material.rate,
    }));
    downloadTextFile("raw-material-inventory-export.csv", recordsToCsv(INVENTORY_CSV_COLUMNS, records));
  }

  async function removeMaterial(material) {
    if (!window.confirm(`Delete ${material.name}?`)) return;
    await onDeleteMaterial(material.id);
    setMessage("Raw material deleted");
  }

  async function submitProduct(event) {
    event.preventDefault();
    const result = await (productForm.id ? onUpdateProduct(productForm) : onSaveProduct(productForm));
    setProductForm({ sku: "", name: "", category: "", unit: "kg", rate: 0, taxRate: 0 });
    setMessage(productForm.id ? "Product updated" : "Product saved");
    setModalMode(null);
  }

  async function importProductsCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingProductCsv(true);
    try {
      const importedRows = csvToRecords(await file.text())
        .map(normalizeProductImportRow)
        .filter((record) => record.name.trim());
      const uniqueRows = uniqueBy(
        importedRows,
        (record) => lookupKey(record.sku || record.name)
      );

      if (!uniqueRows.length) {
        setMessage("CSV has no product rows");
        return;
      }

      const existingBySku = new Map(productRows.filter((product) => product.sku).map((product) => [lookupKey(product.sku), product]));
      const existingByName = new Map(productRows.map((product) => [lookupKey(product.name), product]));
      const existingCategories = new Set(
        categoryRows
          .filter((category) => sameText(category.type, "Product"))
          .map((category) => lookupKey(category.name))
      );
      const importCategories = uniqueValues(uniqueRows.map((record) => record.category));
      for (const category of importCategories) {
        const key = lookupKey(category);
        if (!existingCategories.has(key)) {
          await onSaveCategory({ type: "Product", name: category });
          existingCategories.add(key);
        }
      }

      let updated = 0;
      let created = 0;
      for (const record of uniqueRows) {
        const existing =
          (record.sku && existingBySku.get(lookupKey(record.sku))) ||
          existingByName.get(lookupKey(record.name));
        if (existing) {
          await onUpdateProduct({ ...existing, ...record, id: existing.id });
          updated += 1;
        } else {
          await onSaveProduct(record);
          created += 1;
        }
      }
      setMessage(`Imported ${uniqueRows.length} product rows (${created} new, ${updated} updated)`);
    } catch {
      setMessage("Product CSV import failed. Check the file headings and values.");
    } finally {
      setImportingProductCsv(false);
      event.target.value = "";
    }
  }

  function exportProductsCsv() {
    const records = productRows.map((product) => ({
      sku: product.sku,
      name: product.name,
      category: product.category,
      unit: product.unit,
      rate: product.rate,
      taxRate: product.taxRate,
    }));
    downloadTextFile("finished-goods-export.csv", recordsToCsv(PRODUCT_CSV_COLUMNS, records));
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    await onDeleteProduct(product.id);
    setMessage("Product deleted");
  }

  async function submitStock(event) {
    event.preventDefault();
    const selected = materialRows.find((material) => material.id === stockForm.id);
    const nextStock =
      Number(stockForm.stock || 0) +
      Number(stockForm.inToday || 0) -
      Number(stockForm.outToday || 0) -
      Number(stockForm.wastage || 0);
    await onUpdateMaterialStock(stockForm.id, { ...stockForm, stock: Math.max(0, nextStock) });
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
        onAction={() => openMaterialForm()}
        onSecondAction={openStockUpdate}
      >
        {message && <p className="db-message">{message}</p>}
        <div className="inventory-tools">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={importInventoryCsv} />
          <button
            className="ghost-button"
            type="button"
            onClick={() => csvInputRef.current?.click()}
            disabled={importingCsv}
          >
            <Upload size={16} />
            {importingCsv ? "Importing..." : "Import CSV"}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => downloadTextFile("raw-material-inventory-demo.csv", INVENTORY_DEMO_CSV)}
          >
            <Download size={16} />
            Demo CSV
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={exportInventoryCsv}
            disabled={!materialRows.length}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <DataTable
          columns={["Material", "Category", "Stock", "In", "Out", "Wastage", "Action"]}
          rows={filteredMaterialRows.map((material) => [
            material.name,
            material.category,
            `${material.stock} ${material.unit} / Min ${material.min}`,
            `${material.inToday} ${material.unit}`,
            `${material.outToday} ${material.unit}`,
            `${material.wastage} ${material.unit}`,
            <RowActions
              onEdit={() => openMaterialForm(material)}
              onDelete={() => removeMaterial(material)}
            />,
          ])}
        />
      </Panel>
      <Panel title="Finished goods" subtitle="Ready stock" action="Add product" onAction={() => openProductForm()}>
        <div className="inventory-tools">
          <input ref={productCsvInputRef} type="file" accept=".csv,text/csv" onChange={importProductsCsv} />
          <button
            className="ghost-button"
            type="button"
            onClick={() => productCsvInputRef.current?.click()}
            disabled={importingProductCsv}
          >
            <Upload size={16} />
            {importingProductCsv ? "Importing..." : "Import CSV"}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => downloadTextFile("finished-goods-demo.csv", PRODUCT_DEMO_CSV)}
          >
            <Download size={16} />
            Demo CSV
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={exportProductsCsv}
            disabled={!productRows.length}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <div className="product-grid">
          {filteredProductRows.map((product) => (
            <article key={product.name}>
              <span>{product.category.toUpperCase()}</span>
              <strong>{product.name}</strong>
              <p>{product.stock ? `${product.stock} ${product.unit}` : product.unit} - {money(product.rate)}</p>
              <RowActions
                onEdit={() => openProductForm(product)}
                onDelete={() => removeProduct(product)}
              />
            </article>
          ))}
        </div>
      </Panel>
      {modalMode === "material" && (
        <Modal title={materialForm.id ? "Edit raw material" : "Add raw material"} eyebrow="Inventory record" onClose={() => setModalMode(null)}>
          <form className="modal-form grid-form" onSubmit={submitMaterial}>
            <label className="field"><span>Name</span><input required value={materialForm.name} onChange={(event) => setMaterialForm({ ...materialForm, name: event.target.value })} /></label>
            <label className="field">
              <span>Category</span>
              <select
                value={materialForm.category}
                onChange={(event) => setMaterialForm({ ...materialForm, category: event.target.value })}
              >
                <option value="">Select category</option>
                {uniqueValues([...rawMaterialCategoryOptions, materialForm.category]).map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <button className="action-button full" type="submit">{materialForm.id ? "Update raw material" : "Save raw material"}</button>
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
        <Modal title={productForm.id ? "Edit product" : "Add product"} eyebrow="Finished goods" onClose={() => setModalMode(null)}>
          <form className="modal-form grid-form" onSubmit={submitProduct}>
            <label className="field"><span>SKU</span><input value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} /></label>
            <label className="field"><span>Name</span><input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
            <label className="field">
              <span>Category</span>
              <select value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}>
                <option value="">Select category</option>
                {uniqueValues([...productCategoryOptions, productForm.category]).map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="field"><span>Unit</span><select value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })}>{uniqueValues([productForm.unit, ...UNIT_OPTIONS]).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
            <label className="field"><span>Rate</span><input type="number" value={productForm.rate} onChange={(event) => setProductForm({ ...productForm, rate: event.target.value })} /></label>
            <label className="field"><span>GST %</span><input type="number" value={productForm.taxRate} onChange={(event) => setProductForm({ ...productForm, taxRate: event.target.value })} /></label>
            <button className="action-button full" type="submit">{productForm.id ? "Update product" : "Save product"}</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function InventoryUsagePage({
  materialRows,
  usageRows,
  onSaveUsage,
  onUpdateUsage,
  onDeleteUsage,
  globalSearch = "",
}) {
  const csvInputRef = useRef(null);
  const [form, setForm] = useState(() => ({
    usageDate: today(),
    materialId: materialRows[0]?.id || "",
    materialName: materialRows[0]?.name || "",
    category: materialRows[0]?.category || "",
    usedQty: 0,
    unusedQty: materialRows[0]?.stock || 0,
    wastageQty: 0,
    unit: materialRows[0]?.unit || "kg",
    notes: "",
  }));
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);
  const selectedMaterial =
    materialRows.find((material) => material.id === form.materialId) ||
    materialRows.find((material) => material.name === form.materialName);
  const filteredUsageRows = usageRows.filter((usage) =>
    matchesSearch(globalSearch, [
      usage.materialName,
      usage.category,
      usage.usageDate,
      usage.usedQty,
      usage.unusedQty,
      usage.wastageQty,
      usage.unit,
      usage.notes,
    ])
  );

  useEffect(() => {
    if (!form.materialId && materialRows[0]) {
      const first = materialRows[0];
      setForm((current) => ({
        ...current,
        materialId: first.id,
        materialName: first.name,
        category: first.category,
        unusedQty: first.stock,
        unit: first.unit,
      }));
    }
  }, [form.materialId, materialRows]);

  useEffect(() => {
    if (!selectedMaterial) return;
    setForm((current) => {
      const usedQty = Number(current.usedQty || 0);
      const wastageQty = Number(current.wastageQty || 0);
      const unusedQty = Math.max(0, Number(selectedMaterial.stock || 0) - usedQty - wastageQty);
      if (
        current.materialId === selectedMaterial.id &&
        current.materialName === selectedMaterial.name &&
        current.category === selectedMaterial.category &&
        current.unit === selectedMaterial.unit &&
        Number(current.unusedQty || 0) === unusedQty
      ) {
        return current;
      }
      return {
        ...current,
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        category: selectedMaterial.category,
        unit: selectedMaterial.unit,
        unusedQty,
      };
    });
  }, [selectedMaterial?.id, selectedMaterial?.name, selectedMaterial?.category, selectedMaterial?.unit, selectedMaterial?.stock]);

  function changeMaterial(materialId) {
    const material = materialRows.find((item) => item.id === materialId);
    if (!material) return;
    const usedQty = Number(form.usedQty || 0);
    const wastageQty = Number(form.wastageQty || 0);
    setForm({
      ...form,
      materialId: material.id,
      materialName: material.name,
      category: material.category,
      unit: material.unit,
      unusedQty: Math.max(0, Number(material.stock || 0) - usedQty - wastageQty),
    });
  }

  function updateUsageQuantity(field, value) {
    const next = { ...form, [field]: value };
    const stock = Number(selectedMaterial?.stock || 0);
    const usedQty = Number(field === "usedQty" ? value : next.usedQty || 0);
    const wastageQty = Number(field === "wastageQty" ? value : next.wastageQty || 0);
    next.unusedQty = Math.max(0, stock - usedQty - wastageQty);
    setForm(next);
  }

  async function submitUsage(event) {
    event.preventDefault();
    if (!form.materialName) {
      setMessage("Select raw material before saving usage");
      return;
    }
    const payload = {
      ...form,
      materialId: selectedMaterial?.id || form.materialId,
      materialName: selectedMaterial?.name || form.materialName,
      category: selectedMaterial?.category || form.category,
      unit: selectedMaterial?.unit || form.unit,
      usedQty: Number(form.usedQty || 0),
      unusedQty: Number(form.unusedQty || 0),
      wastageQty: Number(form.wastageQty || 0),
    };
    if (editingId) {
      await onUpdateUsage({ ...payload, id: editingId });
      setMessage("Inventory usage updated");
      setEditingId("");
    } else {
      await onSaveUsage(payload);
      setMessage("Inventory usage saved");
    }
    resetUsage();
  }

  function editUsage(usage) {
    setEditingId(usage.id);
    setForm({
      usageDate: usage.usageDate,
      materialId: usage.materialId,
      materialName: usage.materialName,
      category: usage.category,
      usedQty: usage.usedQty,
      unusedQty: usage.unusedQty,
      wastageQty: usage.wastageQty,
      unit: usage.unit,
      notes: usage.notes,
    });
    setMessage("Editing inventory usage");
  }

  function resetUsage() {
    const first = materialRows[0];
    setForm({
      usageDate: today(),
      materialId: first?.id || "",
      materialName: first?.name || "",
      category: first?.category || "",
      usedQty: 0,
      unusedQty: first?.stock || 0,
      wastageQty: 0,
      unit: first?.unit || "kg",
      notes: "",
    });
  }

  function cancelEdit() {
    setEditingId("");
    resetUsage();
    setMessage("");
  }

  async function removeUsage(usage) {
    if (!window.confirm(`Delete usage for ${usage.materialName}?`)) return;
    await onDeleteUsage(usage.id);
    setMessage("Inventory usage deleted");
    if (editingId === usage.id) cancelEdit();
  }

  function normalizeUsageImportRow(row) {
    const material =
      byName(materialRows, row.materialname || row.material_name || row.material || row.name) ||
      null;
    const usedQty = Number(row.usedqty || row.used_qty || row.used || 0);
    const wastageQty = Number(row.wastageqty || row.wastage_qty || row.wastage || 0);
    const stock = Number(material?.stock || 0);
    return normalizeInventoryUsage({
      usageDate: row.usagedate || row.usage_date || row.date || today(),
      materialId: material?.id || "",
      materialName: row.materialname || row.material_name || row.material || row.name || material?.name || "",
      category: row.category || material?.category || "",
      usedQty,
      unusedQty: row.unusedqty || row.unused_qty || row.unused || Math.max(0, stock - usedQty - wastageQty),
      wastageQty,
      unit: row.unit || material?.unit || "kg",
      notes: row.notes || "",
    });
  }

  async function importUsageCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    try {
      const importedRows = csvToRecords(await file.text())
        .map(normalizeUsageImportRow)
        .filter((record) => record.materialName.trim());

      for (const record of importedRows) {
        await onSaveUsage(record);
      }
      setMessage(`Imported ${importedRows.length} inventory usage rows`);
    } catch {
      setMessage("Inventory usage CSV import failed. Check the headings and values.");
    } finally {
      setImportingCsv(false);
      event.target.value = "";
    }
  }

  function exportUsageCsv() {
    const records = usageRows.map((usage) => ({
      usageDate: usage.usageDate,
      materialName: usage.materialName,
      category: usage.category,
      usedQty: usage.usedQty,
      unusedQty: usage.unusedQty,
      wastageQty: usage.wastageQty,
      unit: usage.unit,
      notes: usage.notes,
    }));
    downloadTextFile("inventory-usage-export.csv", recordsToCsv(INVENTORY_USAGE_CSV_COLUMNS, records));
  }

  return (
    <Page>
      <Panel title="Inventory usage" subtitle="Used, unused, and wastage">
        {message && <p className="db-message">{message}</p>}
        <div className="inventory-tools">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={importUsageCsv} />
          <button className="ghost-button" type="button" onClick={() => csvInputRef.current?.click()} disabled={importingCsv}>
            <Upload size={16} />
            {importingCsv ? "Importing..." : "Import CSV"}
          </button>
          <button className="ghost-button" type="button" onClick={() => downloadTextFile("inventory-usage-demo.csv", INVENTORY_USAGE_DEMO_CSV)}>
            <Download size={16} />
            Demo CSV
          </button>
          <button className="ghost-button" type="button" onClick={exportUsageCsv} disabled={!usageRows.length}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <form className="form-grid purchase-form" onSubmit={submitUsage}>
          <label>DATE<input type="date" value={form.usageDate} onChange={(event) => setForm({ ...form, usageDate: event.target.value })} /></label>
          <label>
            RAW MATERIAL
            <select value={form.materialId} onChange={(event) => changeMaterial(event.target.value)}>
              <option value="">Select material</option>
              {materialRows.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
            </select>
          </label>
          <label>CATEGORY<input value={form.category} readOnly /></label>
          <label>AVAILABLE<input value={`${quantity(selectedMaterial?.stock || 0)} ${form.unit}`} readOnly /></label>
          <label>USED<input type="number" min="0" step="0.01" value={form.usedQty} onChange={(event) => updateUsageQuantity("usedQty", event.target.value)} /></label>
          <label>UNUSED<input type="number" min="0" step="0.01" value={form.unusedQty} onChange={(event) => setForm({ ...form, unusedQty: event.target.value })} /></label>
          <label>WASTAGE<input type="number" min="0" step="0.01" value={form.wastageQty} onChange={(event) => updateUsageQuantity("wastageQty", event.target.value)} /></label>
          <label>UNIT<input value={form.unit} readOnly /></label>
          <label className="full">NOTES<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          <div className="button-row full">
            <button className="action-button full" type="submit">{editingId ? "Update usage" : "Save usage"}</button>
            {editingId && <button className="ghost-button" type="button" onClick={cancelEdit}>Cancel edit</button>}
          </div>
        </form>
      </Panel>
      <Panel title="Usage history" subtitle="Inventory movement">
        <DataTable
          columns={["Date", "Material", "Category", "Used", "Unused", "Wastage", "Notes", "Action"]}
          rows={filteredUsageRows.map((usage) => [
            usage.usageDate,
            usage.materialName,
            usage.category,
            `${quantity(usage.usedQty)} ${usage.unit}`,
            `${quantity(usage.unusedQty)} ${usage.unit}`,
            `${quantity(usage.wastageQty)} ${usage.unit}`,
            usage.notes || "-",
            <RowActions onEdit={() => editUsage(usage)} onDelete={() => removeUsage(usage)} />,
          ])}
          empty="No inventory usage found"
        />
      </Panel>
    </Page>
  );
}

function VendorPaymentPage({
  vendorRows,
  purchaseRows,
  paymentRows,
  onSaveVendorPayment,
  onUpdateVendorPayment,
  onDeleteVendorPayment,
  onUpdatePurchase,
  globalSearch = "",
}) {
  const [vendorId, setVendorId] = useState(vendorRows[3]?.id || vendorRows[0]?.id || "");
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState("UPI");
  const [paymentDate, setPaymentDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [selectedDueIds, setSelectedDueIds] = useState([]);
  const [editingPaymentId, setEditingPaymentId] = useState("");
  const [message, setMessage] = useState("");
  const pendingEntries = useMemo(
    () =>
      purchaseRows
        .map((purchase) => {
          const purchaseAmount = Number(purchase.amount || Number(purchase.qty || 0) * Number(purchase.rate || 0));
          const paidAmount = Number(purchase.paid || 0);
          const pendingAmount = Math.max(0, Number(purchase.pending ?? purchaseAmount - paidAmount));
          return {
            ...purchase,
            amount: purchaseAmount,
            paid: paidAmount,
            pending: pendingAmount,
          };
        })
        .filter((purchase) => purchase.pending > 0)
        .filter((purchase) =>
          matchesSearch(globalSearch, [
            purchase.vendor,
            purchase.material,
            purchase.category,
            purchase.date,
            purchase.amount,
            purchase.paid,
            purchase.pending,
          ])
        )
        .sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`)),
    [globalSearch, purchaseRows]
  );
  const selectedDueEntries = useMemo(
    () => pendingEntries.filter((entry) => selectedDueIds.includes(entry.id)),
    [pendingEntries, selectedDueIds]
  );
  const selectedPendingTotal = selectedDueEntries.reduce((sum, entry) => sum + entry.pending, 0);
  const selectedVendor = vendorRows.find((vendor) => vendor.id === vendorId);
  const selected =
    selectedVendor ||
    (selectedDueEntries[0]
      ? { id: selectedDueEntries[0].vendorId, name: selectedDueEntries[0].vendor, pending: selectedPendingTotal }
      : null) ||
    vendorRows[0] ||
    { id: "", name: "Vendor", pending: 0 };
  const vendorSelectOptions = useMemo(() => {
    const options = [...vendorRows];
    if (vendorId && !options.some((vendor) => vendor.id === vendorId)) {
      options.unshift({
        id: vendorId,
        name: selectedDueEntries[0]?.vendor || "Selected vendor",
        category: selectedDueEntries[0]?.category || "",
      });
    }
    return options;
  }, [selectedDueEntries, vendorId, vendorRows]);
  const allPendingTotal = pendingEntries.reduce((sum, entry) => sum + entry.pending, 0);
  const vendorEntryPending = pendingEntries
    .filter((entry) => entry.vendorId === selected.id || entry.vendor === selected.name)
    .reduce((sum, entry) => sum + entry.pending, 0);
  const currentPending = selectedDueEntries.length ? selectedPendingTotal : vendorEntryPending;
  const effectivePaymentAmount = selectedDueEntries.length ? selectedPendingTotal : Number(amount || 0);
  const balance = Math.max(0, Number(currentPending || 0) - effectivePaymentAmount);
  const selectedEntryLabel = selectedDueEntries.length
    ? `${selectedDueEntries.length} entr${selectedDueEntries.length === 1 ? "y" : "ies"} selected`
    : "No entry selected";

  useEffect(() => {
    if (!vendorId && vendorRows[0]) {
      setVendorId(vendorRows[0].id);
    }
  }, [vendorId, vendorRows]);

  useEffect(() => {
    const availableIds = new Set(pendingEntries.map((entry) => entry.id));
    setSelectedDueIds((ids) => ids.filter((id) => availableIds.has(id)));
  }, [pendingEntries]);

  function purchasePaymentNote(entries) {
    return `Payment for purchases: ${entries.map((entry) => entry.id).join(", ")}`;
  }

  function paymentNoteWithEntries(customNote, entries) {
    const entryNote = purchasePaymentNote(entries);
    return customNote ? `${customNote} | ${entryNote}` : entryNote;
  }

  function buildPaymentPlan(entries, paymentAmount) {
    let remaining = Number(paymentAmount || 0);
    const plan = [];
    [...entries]
      .sort((a, b) => `${a.date}${a.id}`.localeCompare(`${b.date}${b.id}`))
      .forEach((entry) => {
        if (remaining <= 0) return;
        const applied = Math.min(entry.pending, remaining);
        remaining -= applied;
        if (applied > 0) {
          plan.push({ entry, applied });
        }
      });
    return plan;
  }

  async function applyPaymentToPurchaseEntries(entries, paymentAmount) {
    if (!onUpdatePurchase) return;
    const plan = buildPaymentPlan(entries, paymentAmount);
    for (const { entry, applied } of plan) {
      await onUpdatePurchase({
        ...entry,
        paid: Number(entry.paid || 0) + applied,
        pending: Math.max(0, Number(entry.pending || 0) - applied),
      }, { skipPaymentRecord: true });
    }
  }

  async function submitPayment() {
    if (!selected?.id && !selectedDueEntries.length) return;
    if (selectedDueEntries.length) {
      const entriesByVendor = selectedDueEntries.reduce((groups, entry) => {
        const key = entry.vendorId || entry.vendor;
        const group = groups.get(key) || {
          vendorId: entry.vendorId,
          vendorName: entry.vendor,
          amount: 0,
          entries: [],
        };
        group.amount += entry.pending;
        group.entries.push(entry);
        groups.set(key, group);
        return groups;
      }, new Map());

      for (const group of entriesByVendor.values()) {
        await onSaveVendorPayment({
          vendorId: group.vendorId,
          vendorName: group.vendorName,
          amount: group.amount,
          mode,
          paymentDate,
          notes: paymentNoteWithEntries(notes, group.entries),
        });
      }
      await applyPaymentToPurchaseEntries(selectedDueEntries, selectedPendingTotal);
      cancelPaymentEdit();
      setMessage(`${selectedDueEntries.length} pending entr${selectedDueEntries.length === 1 ? "y" : "ies"} paid`);
      return;
    }

    const paymentAmount = Number(amount || 0);
    if (paymentAmount <= 0) {
      setMessage("Enter payment amount");
      return;
    }

    const vendorPendingEntries = pendingEntries.filter((entry) => entry.vendorId === selected.id || entry.vendor === selected.name);
    const paymentPlan = buildPaymentPlan(vendorPendingEntries, paymentAmount);
    const payment = {
      vendorId: selected.id,
      vendorName: selected.name,
      amount: paymentAmount,
      mode,
      paymentDate,
      notes: paymentPlan.length ? paymentNoteWithEntries(notes, paymentPlan.map(({ entry }) => entry)) : notes,
    };
    if (editingPaymentId) {
      await onUpdateVendorPayment({ ...payment, id: editingPaymentId });
      setMessage("Vendor payment updated");
      setEditingPaymentId("");
    } else {
      await onSaveVendorPayment(payment);
      await applyPaymentToPurchaseEntries(vendorPendingEntries, paymentAmount);
      setMessage("Vendor payment saved");
    }
    setSelectedDueIds([]);
    setAmount(0);
    setNotes("");
  }

  function editPayment(payment) {
    setVendorId(String(payment.vendorId || selected.id || ""));
    setAmount(payment.amount);
    setMode(payment.mode);
    setPaymentDate(payment.paymentDate);
    setNotes(payment.notes || "");
    setSelectedDueIds([]);
    setEditingPaymentId(payment.id);
    setMessage("Editing vendor payment");
  }

  function syncSelectedEntries(ids) {
    const entries = pendingEntries.filter((entry) => ids.includes(entry.id));
    const nextAmount = entries.reduce((sum, entry) => sum + entry.pending, 0);
    const firstEntry = entries[0];
    const firstVendor = firstEntry
      ? vendorRows.find((item) => item.id === firstEntry.vendorId) || vendorRows.find((item) => item.name === firstEntry.vendor)
      : null;

    setSelectedDueIds(ids);
    setEditingPaymentId("");
    setAmount(nextAmount);
    if (firstEntry) {
      setVendorId(firstVendor?.id || firstEntry.vendorId || "");
      setNotes(purchasePaymentNote(entries));
      setMessage(`${entries.length} pending entr${entries.length === 1 ? "y" : "ies"} selected`);
    } else {
      setNotes("");
      setMessage("");
    }
  }

  function togglePendingEntry(entry) {
    const nextIds = selectedDueIds.includes(entry.id)
      ? selectedDueIds.filter((id) => id !== entry.id)
      : [...selectedDueIds, entry.id];
    syncSelectedEntries(nextIds);
  }

  function payPendingEntry(entry) {
    const vendor = vendorRows.find((item) => item.id === entry.vendorId) || vendorRows.find((item) => item.name === entry.vendor);
    setVendorId(vendor?.id || entry.vendorId || "");
    setAmount(entry.pending);
    setPaymentDate(today());
    setNotes(purchasePaymentNote([entry]));
    setSelectedDueIds([entry.id]);
    setEditingPaymentId("");
    setMessage(`Selected pending entry: ${entry.vendor} - ${entry.material}`);
  }

  async function deletePayment(payment) {
    if (!window.confirm(`Delete payment ${money(payment.amount)}?`)) return;
    await onDeleteVendorPayment(payment.id);
    if (editingPaymentId === payment.id) {
      cancelPaymentEdit();
    }
    setMessage("Vendor payment deleted");
  }

  function cancelPaymentEdit() {
    setEditingPaymentId("");
    setSelectedDueIds([]);
    setAmount(0);
    setNotes("");
    setPaymentDate(today());
    setMode("UPI");
    setMessage("");
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
              <select
                value={vendorId}
                disabled={selectedDueEntries.length > 0}
                onChange={(event) => {
                  setVendorId(event.target.value);
                  setSelectedDueIds([]);
                }}
              >
                {vendorSelectOptions.map((vendor) => (
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
              <input
                value={amount}
                readOnly={selectedDueEntries.length > 0}
                onChange={(event) => setAmount(event.target.value)}
              />
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
            <span>Selected entry <b>{selectedEntryLabel}</b></span>
            <span>Current pending <b>{money(currentPending)}</b></span>
            <span>Payment mode <b>{mode}</b></span>
            <span>Balance after payment <b>{money(balance)}</b></span>
          </div>
          {message && <p className="db-message">{message}</p>}
          <div className="button-row full">
            <button className="action-button full" type="button" onClick={submitPayment}>
              {editingPaymentId ? "Update vendor payment" : selectedDueEntries.length ? "Pay selected entries" : "Save vendor payment"}
            </button>
            {editingPaymentId && <button className="ghost-button" type="button" onClick={cancelPaymentEdit}>Cancel edit</button>}
            {!!selectedDueEntries.length && <button className="ghost-button" type="button" onClick={cancelPaymentEdit}>Clear selection</button>}
          </div>
        </Panel>
        <Panel title="Pending payments" subtitle="Select entry to pay">
          <div className="table-toolbar">
            <span>{selectedDueEntries.length} selected - {money(selectedPendingTotal)} | Total {money(allPendingTotal)}</span>
            <div className="row-actions">
              <button className="ghost-button table-action-button" type="button" onClick={() => syncSelectedEntries(pendingEntries.map((entry) => entry.id))}>
                Select all
              </button>
              <button className="ghost-button table-action-button" type="button" onClick={() => syncSelectedEntries([])}>
                Clear
              </button>
            </div>
          </div>
          <DataTable
            columns={["Select", "Entry", "Amount", "Paid", "Pending", "Action"]}
            rows={pendingEntries.map((entry) => [
              <input
                type="checkbox"
                checked={selectedDueIds.includes(entry.id)}
                onChange={() => togglePendingEntry(entry)}
                aria-label={`Select ${entry.vendor} ${entry.material}`}
              />,
              <div className="entry-stack">
                <strong>{entry.vendor}</strong>
                <span>{entry.material} - {entry.date}</span>
              </div>,
              money(entry.amount),
              money(entry.paid),
              money(entry.pending),
              <button className="ghost-button table-action-button" type="button" onClick={() => payPendingEntry(entry)}>
                <WalletCards size={15} />
                Pay
              </button>,
            ])}
            empty="No pending vendor payments"
          />
        </Panel>
      </section>
      <Panel title="Payment history" subtitle="Vendor payment records">
        <DataTable
          columns={["Date", "Vendor", "Mode", "Amount", "Notes", "Action"]}
          rows={paymentRows
            .filter((payment) =>
              matchesSearch(globalSearch, [payment.paymentDate, payment.vendorName, payment.mode, payment.amount, payment.notes])
            )
            .map((payment) => [
            payment.paymentDate,
            payment.vendorName,
            payment.mode,
            money(payment.amount),
            payment.notes || "-",
            <RowActions
              onEdit={() => editPayment(payment)}
              onDelete={() => deletePayment(payment)}
            />,
          ])}
          empty="No vendor payments found"
        />
      </Panel>
    </Page>
  );
}

function DailyVendorsPage({
  vendorRows,
  materialRows,
  purchaseRows,
  categoryRows,
  onSaveVendor,
  onSaveCategory,
  onSaveMaterial,
  onSavePurchase,
  onUpdatePurchase,
  onDeletePurchase,
  globalSearch = "",
}) {
  const formRef = useRef(null);
  const csvInputRef = useRef(null);
  const vendorOptions = useMemo(() => vendorRows, [vendorRows]);
  const materialOptions = useMemo(() => materialRows, [materialRows]);
  const rawMaterialCategoryOptions = useMemo(
    () => categoryNames(categoryRows, "Raw Material", materialOptions.map((item) => item.category)),
    [categoryRows, materialOptions]
  );
  const vendorCategoryOptions = useMemo(
    () => categoryNames(categoryRows, "Vendor", vendorOptions.map((vendor) => vendor.category)),
    [categoryRows, vendorOptions]
  );
  const categoryOptions = useMemo(
    () => uniqueValues([...rawMaterialCategoryOptions, ...vendorCategoryOptions]),
    [rawMaterialCategoryOptions, vendorCategoryOptions]
  );
  const [dateFilter, setDateFilter] = useState(today());
  const [modalMode, setModalMode] = useState(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState("");
  const [message, setMessage] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);
  const [form, setForm] = useState({
    date: today(),
    vendor: vendorOptions[0]?.name || "",
    material: materialOptions[0]?.name || "",
    category: materialOptions[0]?.category || "",
    qty: 1,
    unit: materialOptions[0]?.unit || "kg",
    rate: materialOptions[0]?.rate || 0,
    paid: 0,
    mode: "Cash",
    notes: "",
  });
  const selectedCategoryKey = lookupKey(form.category);
  const vendorMatchesCategory = (vendor, categoryKey = selectedCategoryKey) =>
    !categoryKey || lookupKey(vendor.category) === categoryKey;
  const materialMatchesCategory = (material, categoryKey = selectedCategoryKey) =>
    !categoryKey || lookupKey(material.category) === categoryKey;
  const vendorsByCategory = useMemo(
    () => vendorOptions.filter((vendor) => vendorMatchesCategory(vendor)),
    [selectedCategoryKey, vendorOptions]
  );
  const materialsByCategory = useMemo(
    () => materialOptions.filter((material) => materialMatchesCategory(material)),
    [selectedCategoryKey, materialOptions]
  );
  const vendorSelectOptions = useMemo(() => {
    const options = [...vendorsByCategory];
    if (editingPurchaseId && form.vendor && !options.some((vendor) => sameText(vendor.name, form.vendor))) {
      options.unshift({ id: `current-${form.vendor}`, name: form.vendor, category: form.category });
    }
    return options;
  }, [editingPurchaseId, form.category, form.vendor, vendorsByCategory]);
  const materialSelectOptions = useMemo(() => {
    const options = [...materialsByCategory];
    if (editingPurchaseId && form.material && !options.some((material) => sameText(material.name, form.material))) {
      options.unshift({ id: `current-${form.material}`, name: form.material, category: form.category, unit: form.unit, rate: form.rate });
    }
    return options;
  }, [editingPurchaseId, form.category, form.material, form.rate, form.unit, materialsByCategory]);
  const unitOptions = useMemo(
    () => uniqueValues([form.unit, ...materialOptions.map((item) => item.unit), ...UNIT_OPTIONS]),
    [form.unit, materialOptions]
  );
  const [vendorForm, setVendorForm] = useState({ name: "", category: categoryOptions[0] || "", contact: "" });
  const [categoryForm, setCategoryForm] = useState({ type: "Raw Material", name: "" });
  const [materialForm, setMaterialForm] = useState({
    name: "",
    category: categoryOptions[0] || "",
    stock: 0,
    unit: "kg",
    min: 0,
    rate: 0,
  });

  useEffect(() => {
    const selected = byName(materialOptions, form.material);
    if (editingPurchaseId || selected || !materialOptions[0]) return;
    const first = materialOptions[0];
    setForm((current) => ({
      ...current,
      material: first.name,
      category: first.category || current.category,
      unit: first.unit || current.unit,
      rate: first.rate || current.rate,
    }));
  }, [editingPurchaseId, form.material, materialOptions]);

  useEffect(() => {
    if (editingPurchaseId || !form.category) return;
    const categoryKey = lookupKey(form.category);
    const currentVendor = byName(vendorOptions, form.vendor);
    if (currentVendor && vendorMatchesCategory(currentVendor, categoryKey)) return;
    const nextVendor = vendorOptions.find((vendor) => vendorMatchesCategory(vendor, categoryKey));
    const nextVendorName = nextVendor?.name || "";
    if (nextVendorName !== form.vendor) {
      setForm((current) => ({ ...current, vendor: nextVendorName }));
    }
  }, [editingPurchaseId, form.category, form.vendor, vendorOptions]);

  async function savePurchase(event) {
    event.preventDefault();
    if (!form.vendor || !form.material) {
      setMessage("Add vendor and raw material before saving");
      return;
    }
    if (editingPurchaseId) {
      await onUpdatePurchase({ ...form, id: editingPurchaseId });
      setMessage("Daily vendor entry updated");
      setEditingPurchaseId("");
      return;
    }
    await onSavePurchase(form);
    setMessage("Daily vendor entry saved");
  }

  function editPurchase(record) {
    const purchase = normalizeVendorPurchase(record);
    setForm({
      date: purchase.date,
      vendor: purchase.vendor,
      material: purchase.material,
      category: purchase.category,
      qty: purchase.qty,
      unit: purchase.unit,
      rate: purchase.rate,
      paid: purchase.paid,
      mode: purchase.mode,
      notes: purchase.notes,
    });
    setEditingPurchaseId(purchase.id);
    setMessage("Editing daily vendor entry");
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function deletePurchase(record) {
    if (!window.confirm(`Delete purchase for ${record.material}?`)) return;
    await onDeletePurchase(record.id);
    if (editingPurchaseId === record.id) {
      setEditingPurchaseId("");
    }
    setMessage("Daily vendor entry deleted");
  }

  function cancelPurchaseEdit() {
    setEditingPurchaseId("");
    setForm({
      date: today(),
      vendor: vendorOptions[0]?.name || "",
      material: materialOptions[0]?.name || "",
      category: materialOptions[0]?.category || categoryOptions[0] || "",
      qty: 1,
      unit: materialOptions[0]?.unit || "kg",
      rate: materialOptions[0]?.rate || 0,
      paid: 0,
      mode: "Cash",
      notes: "",
    });
    setMessage("");
  }

  function changeVendor(value) {
    if (value === "__add_vendor__") {
      setVendorForm({ name: "", category: categoryOptions[0] || "", contact: "" });
      setModalMode("vendor");
      return;
    }
    const selected = byName(vendorOptions, value);
    const nextCategory = selected?.category || form.category;
    const currentMaterial = byName(materialOptions, form.material);
    const materialStillMatches = currentMaterial && materialMatchesCategory(currentMaterial, nextCategory.trim().toLowerCase());
    const nextMaterial = materialStillMatches
      ? currentMaterial
      : materialOptions.find((material) => materialMatchesCategory(material, nextCategory.trim().toLowerCase()));
    setForm({
      ...form,
      vendor: value,
      category: nextCategory,
      material: nextMaterial?.name || "",
      unit: nextMaterial?.unit || form.unit,
      rate: nextMaterial?.rate ?? form.rate,
    });
  }

  function changeCategory(value) {
    if (value === "__add_category__") {
      setCategoryForm({ type: "Raw Material", name: "" });
      setModalMode("category");
      return;
    }
    const categoryKey = lookupKey(value);
    const currentVendor = byName(vendorOptions, form.vendor);
    const currentMaterial = byName(materialOptions, form.material);
    const nextVendor = currentVendor && vendorMatchesCategory(currentVendor, categoryKey)
      ? currentVendor
      : vendorOptions.find((vendor) => vendorMatchesCategory(vendor, categoryKey));
    const nextMaterial = currentMaterial && materialMatchesCategory(currentMaterial, categoryKey)
      ? currentMaterial
      : materialOptions.find((material) => materialMatchesCategory(material, categoryKey));
    setForm({
      ...form,
      category: value,
      vendor: nextVendor?.name || "",
      material: nextMaterial?.name || "",
      unit: nextMaterial?.unit || form.unit,
      rate: nextMaterial?.rate ?? form.rate,
    });
  }

  function changeMaterial(value) {
    if (value === "__add_material__") {
      setMaterialForm({
        name: "",
        category: form.category || categoryOptions[0] || "",
        stock: 0,
        unit: "kg",
        min: 0,
        rate: 0,
      });
      setModalMode("material");
      return;
    }
    const selected = byName(materialOptions, value);
    const nextCategory = selected?.category || form.category;
    const currentVendor = byName(vendorOptions, form.vendor);
    const vendorStillMatches = currentVendor && vendorMatchesCategory(currentVendor, lookupKey(nextCategory));
    const nextVendor = vendorStillMatches
      ? currentVendor
      : vendorOptions.find((vendor) => vendorMatchesCategory(vendor, lookupKey(nextCategory)));
    setForm({
      ...form,
      material: value,
      category: nextCategory,
      vendor: nextVendor?.name || "",
      unit: selected?.unit || form.unit,
      rate: selected?.rate || form.rate,
    });
  }

  async function submitQuickVendor(event) {
    event.preventDefault();
    await onSaveVendor(vendorForm);
    setForm((current) => ({
      ...current,
      vendor: vendorForm.name,
      category: vendorForm.category || current.category,
    }));
    setVendorForm({ name: "", category: categoryOptions[0] || "", contact: "" });
    setMessage("Vendor added");
    setModalMode(null);
  }

  async function submitQuickCategory(event) {
    event.preventDefault();
    await onSaveCategory(categoryForm);
    setForm((current) => ({ ...current, category: categoryForm.name }));
    setMaterialForm((current) => ({ ...current, category: categoryForm.name }));
    setVendorForm((current) => ({ ...current, category: categoryForm.name }));
    setCategoryForm({ type: "Raw Material", name: "" });
    setMessage("Category added");
    setModalMode(null);
  }

  async function submitQuickMaterial(event) {
    event.preventDefault();
    await onSaveMaterial(materialForm);
    setForm((current) => ({
      ...current,
      material: materialForm.name,
      category: materialForm.category,
      unit: materialForm.unit || current.unit,
      rate: materialForm.rate || current.rate,
    }));
    setMaterialForm({
      name: "",
      category: categoryOptions[0] || "",
      stock: 0,
      unit: "kg",
      min: 0,
      rate: 0,
    });
    setMessage("Raw material added");
    setModalMode(null);
  }

  const filtered = purchaseRows.filter(
    (record) =>
      (!dateFilter || record.date === dateFilter) &&
      matchesSearch(globalSearch, [
        record.date,
        record.vendor,
        record.material,
        record.category,
        record.qty,
        record.unit,
        record.rate,
        record.amount,
        record.paid,
        record.pending,
      ])
  );

  function normalizeDailyVendorImportRow(row) {
    const vendor = byName(vendorOptions, row.vendor || row.vendorname || row.vendor_name);
    const material = byName(materialOptions, row.material || row.materialname || row.raw_material || row.item);
    const category = row.category || material?.category || vendor?.category || "";
    const qty = Number(row.qty || row.quantity || 0);
    const rate = Number(row.rate || row.price || material?.rate || 0);
    return normalizeVendorPurchase({
      date: row.date || row.purchase_date || row.purchasedate || today(),
      vendorId: vendor?.id || "",
      vendor: row.vendor || row.vendorname || row.vendor_name || vendor?.name || "",
      material: row.material || row.materialname || row.raw_material || row.item || material?.name || "",
      category,
      qty,
      unit: row.unit || material?.unit || "kg",
      rate,
      amount: row.amount || qty * rate,
      paid: row.paid || row.paid_today || row.paidtoday || 0,
      mode: row.mode || "Cash",
      notes: row.notes || "",
    });
  }

  async function importDailyVendorCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    try {
      const importedRows = csvToRecords(await file.text())
        .map(normalizeDailyVendorImportRow)
        .filter((record) => record.vendor.trim() && record.material.trim());
      const createdVendors = new Map();
      const createdMaterials = new Map();

      for (const record of importedRows) {
        let vendor = byName(vendorOptions, record.vendor) || createdVendors.get(lookupKey(record.vendor));
        if (!vendor) {
          const result = await onSaveVendor({ name: record.vendor, category: record.category, contact: "" });
          vendor = result.record || { id: "", name: record.vendor, category: record.category };
          createdVendors.set(lookupKey(record.vendor), vendor);
        }

        let material = byName(materialOptions, record.material) || createdMaterials.get(lookupKey(record.material));
        if (!material) {
          const result = await onSaveMaterial({
            name: record.material,
            category: record.category,
            stock: 0,
            unit: record.unit,
            min: 0,
            rate: record.rate,
          });
          material = result.record || { id: "", name: record.material, category: record.category, unit: record.unit, rate: record.rate };
          createdMaterials.set(lookupKey(record.material), material);
        }

        await onSavePurchase({
          ...record,
          vendorId: vendor?.id || record.vendorId,
          vendor: vendor?.name || record.vendor,
          material: material?.name || record.material,
          category: record.category || material?.category || vendor?.category || "",
          unit: record.unit || material?.unit || "kg",
          rate: Number(record.rate || material?.rate || 0),
        });
      }
      setMessage(`Imported ${importedRows.length} daily vendor rows`);
    } catch {
      setMessage("Daily vendor CSV import failed. Check the headings and values.");
    } finally {
      setImportingCsv(false);
      event.target.value = "";
    }
  }

  function exportDailyVendorCsv() {
    const records = purchaseRows.map((record) => ({
      date: record.date,
      vendor: record.vendor,
      category: record.category,
      material: record.material,
      qty: record.qty,
      unit: record.unit,
      rate: record.rate,
      paid: record.paid,
      mode: record.mode,
      notes: record.notes,
    }));
    downloadTextFile("daily-vendors-export.csv", recordsToCsv(DAILY_VENDOR_CSV_COLUMNS, records));
  }

  return (
    <Page>
      <Panel title="Daily vendor" subtitle="Date wise purchase and payment">
        {message && <p className="db-message">{message}</p>}
        <div className="inventory-tools">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={importDailyVendorCsv} />
          <button className="ghost-button" type="button" onClick={() => csvInputRef.current?.click()} disabled={importingCsv}>
            <Upload size={16} />
            {importingCsv ? "Importing..." : "Import CSV"}
          </button>
          <button className="ghost-button" type="button" onClick={() => downloadTextFile("daily-vendors-demo.csv", DAILY_VENDOR_DEMO_CSV)}>
            <Download size={16} />
            Demo CSV
          </button>
          <button className="ghost-button" type="button" onClick={exportDailyVendorCsv} disabled={!purchaseRows.length}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <form className="form-grid purchase-form" onSubmit={savePurchase} ref={formRef}>
          <label>DATE<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
          <label>VENDOR<select value={form.vendor} onChange={(event) => changeVendor(event.target.value)}><option value="">Select vendor</option><option value="__add_vendor__">Add vendor</option>{vendorSelectOptions.map((vendor) => <option key={vendor.id} value={vendor.name}>{vendor.name}</option>)}</select></label>
          <label>CATEGORY<select value={form.category} onChange={(event) => changeCategory(event.target.value)}><option value="">Select category</option><option value="__add_category__">Add category</option>{uniqueValues([...categoryOptions, form.category]).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>RAW MATERIAL<select value={form.material} onChange={(event) => changeMaterial(event.target.value)}><option value="">Select raw material</option><option value="__add_material__">Add raw material</option>{materialSelectOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label>QTY<input type="number" value={form.qty} onChange={(event) => setForm({ ...form, qty: event.target.value })} /></label>
          <label>UNIT<select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>{unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
          <label>RATE<input type="number" value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value })} /></label>
          <label>PAID TODAY<input type="number" value={form.paid} onChange={(event) => setForm({ ...form, paid: event.target.value })} /></label>
          <label>MODE<select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option>Cash</option><option>UPI</option><option>Bank</option></select></label>
          <label>NOTES<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          <div className="button-row full">
            <button className="action-button full" type="submit">{editingPurchaseId ? "Update purchase" : "Save purchase"}</button>
            {editingPurchaseId && <button className="ghost-button" type="button" onClick={cancelPurchaseEdit}>Cancel edit</button>}
          </div>
        </form>
      </Panel>
      <Panel title="Purchase history" subtitle="Daily vendor ledger">
        <div className="filter-row">
          <label>DATE<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
          <button className="ghost-button" type="button" onClick={() => setDateFilter("")}>All dates</button>
        </div>
        <DataTable
          columns={["Date", "Vendor", "Item", "Qty", "Amount", "Paid", "Pending", "Action"]}
          rows={filtered.map((record) => {
            const amount = purchaseAmount(record);
            const pending = purchasePending(record);
            const paid = Math.max(0, amount - pending);
            return [
              record.date,
              record.vendor,
              record.material,
              `${record.qty} ${record.unit}`,
              money(amount),
              money(paid),
              money(pending),
              <RowActions
                onEdit={() => editPurchase(record)}
                onDelete={() => deletePurchase(record)}
              />,
            ];
          })}
        />
      </Panel>
      {modalMode === "vendor" && (
        <Modal title="Add vendor" eyebrow="Daily vendor" onClose={() => setModalMode(null)}>
          <form className="modal-form grid-form" onSubmit={submitQuickVendor}>
            <label className="field"><span>Vendor name</span><input required value={vendorForm.name} onChange={(event) => setVendorForm({ ...vendorForm, name: event.target.value })} /></label>
            <label className="field"><span>Category</span><select value={vendorForm.category} onChange={(event) => setVendorForm({ ...vendorForm, category: event.target.value })}><option value="">Select category</option>{uniqueValues([...vendorCategoryOptions, vendorForm.category]).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="field full"><span>Contact</span><input value={vendorForm.contact} onChange={(event) => setVendorForm({ ...vendorForm, contact: event.target.value })} /></label>
            <button className="action-button full" type="submit">Save vendor</button>
          </form>
        </Modal>
      )}
      {modalMode === "category" && (
        <Modal title="Add category" eyebrow="Daily vendor" onClose={() => setModalMode(null)}>
          <form className="modal-form grid-form" onSubmit={submitQuickCategory}>
            <label className="field"><span>Type</span><select value={categoryForm.type} onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value })}><option>Raw Material</option><option>Vendor</option><option>Expense</option><option>Product</option></select></label>
            <label className="field"><span>Name</span><input required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></label>
            <button className="action-button full" type="submit">Save category</button>
          </form>
        </Modal>
      )}
      {modalMode === "material" && (
        <Modal title="Add raw material" eyebrow="Daily vendor" onClose={() => setModalMode(null)}>
          <form className="modal-form grid-form" onSubmit={submitQuickMaterial}>
            <label className="field"><span>Name</span><input required value={materialForm.name} onChange={(event) => setMaterialForm({ ...materialForm, name: event.target.value })} /></label>
            <label className="field"><span>Category</span><select value={materialForm.category} onChange={(event) => setMaterialForm({ ...materialForm, category: event.target.value })}><option value="">Select category</option>{uniqueValues([...rawMaterialCategoryOptions, materialForm.category]).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <button className="action-button full" type="submit">Save raw material</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function EmployeesPage({
  staff,
  status,
  attendanceRows = [],
  onSaveEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  globalSearch = "",
}) {
  const csvInputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(staff[0]?.id || "");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => blankEmployeeForm());
  const [editingId, setEditingId] = useState("");
  const [salaryMonth, setSalaryMonth] = useState(today().slice(0, 7));
  const [saving, setSaving] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [message, setMessage] = useState(status);
  const selected = staff.find((employee) => employee.id === selectedId) || staff[0];
  const effectiveSearch = query.trim() || globalSearch;
  const filtered = staff.filter((employee) =>
    matchesSearch(effectiveSearch, [employee.name, employee.role, employee.contact, employee.address, employee.joining])
  );
  const employeeRoleOptions = useMemo(
    () => uniqueValues(["Karigar", "Counter", "Manager", "Cleaner", "Driver", ...staff.map((employee) => employee.role), form.role]),
    [form.role, staff]
  );
  const selectedAttendanceRows = selected
    ? attendanceRows
        .filter((row) => row.employeeId === selected.id && row.attendanceDate.startsWith(salaryMonth))
        .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate))
    : [];
  const presentDays = selectedAttendanceRows.filter((row) => row.status === "Present").length;
  const absentDays = selectedAttendanceRows.filter((row) => row.status === "Absent").length;
  const leaveDays = selectedAttendanceRows.filter((row) => row.status === "Leave").length;
  const halfDays = selectedAttendanceRows.filter((row) => row.status === "Half Day").length;
  const attendanceCount = selectedAttendanceRows.length;
  const salaryDays = attendanceCount || 30;
  const payableRatio = attendanceCount ? (presentDays + halfDays * 0.5) / salaryDays : 1;
  const earnedSalary = selected ? Math.round(Number(selected.salary || 0) * payableRatio) : 0;
  const salaryRows = [];

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

  async function deleteEmployee(employeeId) {
    const employee = staff.find((item) => item.id === employeeId);
    if (employee && !window.confirm(`Delete ${employee.name}?`)) return;
    const remaining = staff.filter((employee) => employee.id !== employeeId);
    await onDeleteEmployee(employeeId);
    setSelectedId(remaining[0]?.id || "");
    setMessage("Employee removed");
  }

  function normalizeEmployeeImportRow(row, index = 0) {
    return normalizeEmployee({
      name: row.name || row.employee || "",
      role: row.role || "Karigar",
      contact: row.contact || row.phone || "",
      phone: row.phone || row.contact || "",
      address: row.address || "",
      aadhaar: row.aadhaar || row.aadhaar_card || row.aadhaarcard || "",
      aadhaarCard: row.aadhaar_card || row.aadhaarcard || row.aadhaar || "",
      joining: row.joining || row.joining_date || row.joiningdate || today(),
      joiningDate: row.joining_date || row.joiningdate || row.joining || today(),
      salary: row.salary || row.monthly_salary || row.monthlysalary || 0,
      shiftStart: row.shiftstart || row.shift_start || "09:00:00",
      shiftEnd: row.shiftend || row.shift_end || "21:00:00",
      status: row.status || "Absent",
    }, index);
  }

  async function importEmployeeCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    try {
      const importedRows = csvToRecords(await file.text())
        .map((row, index) => normalizeEmployeeImportRow(row, index))
        .filter((employee) => employee.name.trim());
      const uniqueRows = Array.from(
        new Map(importedRows.map((employee) => [employee.name.trim().toLowerCase(), employee])).values()
      );
      const existingByName = new Map(staff.map((employee) => [employee.name.trim().toLowerCase(), employee]));
      let created = 0;
      let updated = 0;

      for (const employee of uniqueRows) {
        const existing = existingByName.get(employee.name.trim().toLowerCase());
        if (existing) {
          await onUpdateEmployee({ ...existing, ...employee, id: existing.id });
          updated += 1;
        } else {
          await onSaveEmployee(employee);
          created += 1;
        }
      }

      if (uniqueRows[0]) setSelectedId(uniqueRows[0].id);
      setMessage(`Imported ${uniqueRows.length} employees (${created} new, ${updated} updated)`);
    } catch {
      setMessage("Employee CSV import failed. Check the headings and values.");
    } finally {
      setImportingCsv(false);
      event.target.value = "";
    }
  }

  function exportEmployeesCsv() {
    const records = staff.map((employee) => ({
      name: employee.name,
      role: employee.role,
      contact: employee.contact === "-" ? "" : employee.contact,
      address: employee.address === "-" ? "" : employee.address,
      aadhaar: employee.aadhaar === "-" ? "" : employee.aadhaar,
      joining: employee.joining,
      salary: employee.salary,
      shiftStart: employee.shiftStart || "09:00:00",
      shiftEnd: employee.shiftEnd || "21:00:00",
    }));
    downloadTextFile("employees-export.csv", recordsToCsv(EMPLOYEE_CSV_COLUMNS, records));
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
            <div className="button-row">
              <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={importEmployeeCsv} hidden />
              <button className="ghost-button" type="button" onClick={() => csvInputRef.current?.click()} disabled={importingCsv}>
                <Upload size={16} />
                {importingCsv ? "Importing..." : "Import CSV"}
              </button>
              <button className="ghost-button" type="button" onClick={exportEmployeesCsv} disabled={!staff.length}>
                <Download size={16} />
                Export CSV
              </button>
              <button className="ghost-button" type="button" onClick={() => downloadTextFile("employee-demo.csv", EMPLOYEE_DEMO_CSV)}>
                <Download size={16} />
                Demo CSV
              </button>
              <button className="action-button" type="button" onClick={() => openEmployeeForm()}>
                <Plus size={17} />
                Add employee
              </button>
            </div>
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
                  <strong>{presentDays} / {salaryDays}</strong>
                  <small>P {presentDays} | A {absentDays} | L {leaveDays} | H {halfDays}</small>
                </article>
                <article>
                  <span>Total salary</span>
                  <strong>{money(selected.salary)}</strong>
                  <small>Month {salaryMonth}</small>
                </article>
                <article>
                  <span>Earned salary</span>
                  <strong>{money(earnedSalary)}</strong>
                  <small>After leave and absent</small>
                </article>
                <article>
                  <span>Advance / paid</span>
                  <strong>{money(0)}</strong>
                  <small>Balance ₹0</small>
                </article>
                <article>
                  <span>Payable</span>
                  <strong>{money(earnedSalary)}</strong>
                  <small>Earned - paid</small>
                </article>
                <label className="salary-month-control">
                  SALARY MONTH
                  <input type="month" value={salaryMonth} onChange={(event) => setSalaryMonth(event.target.value)} />
                </label>
              </div>
              <section className="employee-report-section">
                <h3>Attendance history</h3>
                <DataTable
                  columns={["Date", "Status", "In", "Out"]}
                  rows={selectedAttendanceRows.map((row) => [
                    row.attendanceDate,
                    <span className="status-badge">{row.status}</span>,
                    row.checkIn || "-",
                    row.checkOut || "-",
                  ])}
                  empty="No attendance records found"
                />
              </section>
              <section className="employee-report-section">
                <h3>Salary payments</h3>
                <DataTable
                  columns={["Date", "Amount", "Mode", "Leave"]}
                  rows={salaryRows.map(([day, amount, rowMode, leave]) => [day, amount, rowMode, leave])}
                  empty="No salary payments found"
                />
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
              <select value={form.role} onChange={(event) => updateForm("role", event.target.value)}>
                {employeeRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
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

function AttendancePage({ staff, attendanceRows = [], onSaveAttendance, globalSearch = "" }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState("Present");
  const [checkIn, setCheckIn] = useState("09:00");
  const [checkOut, setCheckOut] = useState("");
  const [filterDate, setFilterDate] = useState(today());
  const [filterStatus, setFilterStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const filteredAttendanceRows = attendanceRows.filter(
    (row) =>
      (!filterDate || row.attendanceDate === filterDate) &&
      (!filterStatus || sameText(row.status, filterStatus)) &&
      matchesSearch(globalSearch, [row.attendanceDate, row.employeeName, row.status, row.checkIn, row.checkOut, row.notes])
  );

  useEffect(() => {
    setSelectedIds(staff.map((employee) => employee.id));
  }, [staff]);

  function toggleEmployee(employeeId) {
    setSelectedIds((ids) =>
      ids.includes(employeeId) ? ids.filter((id) => id !== employeeId) : [...ids, employeeId]
    );
  }

  async function saveAttendance(event) {
    event.preventDefault();
    if (!selectedIds.length) {
      setMessage("Select employees before updating attendance");
      return;
    }
    setSaving(true);
    try {
      await onSaveAttendance({ date, status, checkIn, checkOut, employeeIds: selectedIds });
      setFilterDate(date);
      setMessage(`Attendance updated for ${selectedIds.length} employee${selectedIds.length === 1 ? "" : "s"}`);
    } catch {
      setMessage("Attendance update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Panel title="Attendance" subtitle="Batch update attendance" action="Clear all" onAction={() => setSelectedIds([])}>
        <form onSubmit={saveAttendance}>
          <div className="form-grid">
            <label>DATE<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label>STATUS<select value={status} onChange={(event) => setStatus(event.target.value)}><option>Present</option><option>Absent</option><option>Half Day</option><option>Leave</option></select></label>
            <label>CHECK IN<input type="time" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} /></label>
            <label>CHECK OUT<input type="time" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></label>
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
          <button className="action-button full" type="submit" disabled={saving}>
            {saving ? "Updating..." : `Update ${selectedIds.length} employee${selectedIds.length === 1 ? "" : "s"}`}
          </button>
        </form>
      </Panel>
      <Panel title="Filter wise" subtitle="Attendance report">
        <div className="filter-row">
          <label>DATE<input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} /></label>
          <label>STATUS<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}><option value="">All status</option><option>Present</option><option>Absent</option><option>Half Day</option><option>Leave</option></select></label>
          <button className="ghost-button" type="button" onClick={() => setFilterDate("")}>All dates</button>
        </div>
        <DataTable
          columns={["Date", "Employee", "Status", "In", "Out"]}
          rows={filteredAttendanceRows.map((row) => [
            row.attendanceDate,
            row.employeeName,
            <span className="status-badge">{row.status}</span>,
            row.checkIn || "-",
            row.checkOut || "-",
          ])}
          empty="No attendance for selected filter"
        />
      </Panel>
    </Page>
  );
}

function VendorsPage({ vendorRows, categoryRows, onSaveVendor, onUpdateVendor, onDeleteVendor, globalSearch = "" }) {
  const csvInputRef = useRef(null);
  const categoryOptions = useMemo(
    () => categoryNames(categoryRows, "Vendor", vendorRows.map((vendor) => vendor.category)),
    [categoryRows, vendorRows]
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", contact: "" });
  const [message, setMessage] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);
  const filteredVendorRows = vendorRows.filter((vendor) =>
    matchesSearch(globalSearch, [
      vendor.name,
      vendor.category,
      vendor.contact,
      vendor.purchases,
      vendor.pending,
      vendor.lastPaid,
    ])
  );

  function openVendorForm(vendor = null) {
    setForm(vendor ? { ...vendor } : { name: "", category: categoryOptions[0] || "", contact: "" });
    setShowForm(true);
  }

  async function submitVendor(event) {
    event.preventDefault();
    const result = await (form.id ? onUpdateVendor(form) : onSaveVendor(form));
    setMessage(form.id ? "Vendor updated" : "Vendor saved");
    setForm({ name: "", category: "", contact: "" });
    setShowForm(false);
  }

  async function removeVendor(vendor) {
    if (!window.confirm(`Delete ${vendor.name}?`)) return;
    await onDeleteVendor(vendor.id);
    setMessage("Vendor deleted");
  }

  function normalizeVendorImportRow(row) {
    return normalizeVendor({
      name: row.name || row.vendor || row.vendor_name || "",
      category: row.category || row.type || "",
      contact: row.contact || row.phone || "",
    });
  }

  async function importVendorCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    try {
      const importedRows = csvToRecords(await file.text())
        .map(normalizeVendorImportRow)
        .filter((record) => record.name.trim());
      const uniqueRows = uniqueBy(importedRows, (record) => lookupKey(record.name));
      const existingByName = new Map(vendorRows.map((vendor) => [lookupKey(vendor.name), vendor]));
      let created = 0;
      let updated = 0;
      for (const record of uniqueRows) {
        const existing = existingByName.get(lookupKey(record.name));
        if (existing) {
          await onUpdateVendor({ ...existing, ...record, id: existing.id });
          updated += 1;
        } else {
          await onSaveVendor(record);
          created += 1;
        }
      }
      setMessage(`Imported ${uniqueRows.length} vendors (${created} new, ${updated} updated)`);
    } catch {
      setMessage("Vendor CSV import failed. Check the headings and values.");
    } finally {
      setImportingCsv(false);
      event.target.value = "";
    }
  }

  function exportVendorsCsv() {
    const records = vendorRows.map((vendor) => ({
      name: vendor.name,
      category: vendor.category,
      contact: vendor.contact === "-" ? "" : vendor.contact,
    }));
    downloadTextFile("vendors-export.csv", recordsToCsv(VENDOR_CSV_COLUMNS, records));
  }

  return (
    <Page>
      <Panel title="Vendor management" subtitle="Vendor categories and contacts" action="Add vendor" onAction={() => openVendorForm()}>
        {message && <p className="db-message">{message}</p>}
        <div className="inventory-tools">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={importVendorCsv} />
          <button className="ghost-button" type="button" onClick={() => csvInputRef.current?.click()} disabled={importingCsv}>
            <Upload size={16} />
            {importingCsv ? "Importing..." : "Import CSV"}
          </button>
          <button className="ghost-button" type="button" onClick={() => downloadTextFile("vendors-demo.csv", VENDOR_DEMO_CSV)}>
            <Download size={16} />
            Demo CSV
          </button>
          <button className="ghost-button" type="button" onClick={exportVendorsCsv} disabled={!vendorRows.length}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <DataTable
          columns={["Vendor", "Category", "Contact", "Purchases", "Pending", "Last paid", "Action"]}
          rows={filteredVendorRows.map((vendor) => [
            vendor.name,
            vendor.category,
            vendor.contact,
            money(vendor.purchases),
            money(vendor.pending),
            money(vendor.lastPaid),
            <RowActions
              onEdit={() => openVendorForm(vendor)}
              onDelete={() => removeVendor(vendor)}
            />,
          ])}
        />
      </Panel>
      {showForm && (
        <Modal title={form.id ? "Edit vendor" : "Add vendor"} eyebrow="Vendor record" onClose={() => setShowForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitVendor}>
            <label className="field"><span>Vendor name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="field"><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">Select category</option>{uniqueValues([...categoryOptions, form.category]).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="field full"><span>Contact</span><input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></label>
            <button className="action-button full" type="submit">{form.id ? "Update vendor" : "Save vendor"}</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function ExpensesPage({ expenseRows, categoryRows = [], onSaveExpense, onUpdateExpense, onDeleteExpense, globalSearch = "" }) {
  const csvInputRef = useRef(null);
  const [dateFilter, setDateFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ expenseDate: today(), label: "", category: "", mode: "Cash", amount: 0 });
  const [message, setMessage] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);
  const expenseCategoryOptions = useMemo(
    () => categoryNames(categoryRows, "Expense", expenseRows.map((expense) => expense.category)),
    [categoryRows, expenseRows]
  );
  const filtered = expenseRows.filter(
    (expense) =>
      (!dateFilter || expense.date === dateFilter) &&
      matchesSearch(globalSearch, [expense.date, expense.title, expense.label, expense.category, expense.mode, expense.amount])
  );
  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);

  function openExpenseForm(expense = null) {
    setForm(
      expense
        ? { ...expense, expenseDate: expense.expenseDate || expense.date, label: expense.label || expense.title }
        : { expenseDate: today(), label: "", category: expenseCategoryOptions[0] || "", mode: "Cash", amount: 0 }
    );
    setShowForm(true);
  }

  async function submitExpense(event) {
    event.preventDefault();
    const result = await (form.id ? onUpdateExpense(form) : onSaveExpense(form));
    setMessage(form.id ? "Expense updated" : "Expense saved");
    setForm({ expenseDate: today(), label: "", category: "", mode: "Cash", amount: 0 });
    setShowForm(false);
  }

  async function removeExpense(expense) {
    if (!window.confirm(`Delete ${expense.title}?`)) return;
    await onDeleteExpense(expense.id);
    setMessage("Expense deleted");
  }

  function normalizeExpenseImportRow(row) {
    return normalizeExpense({
      expenseDate: row.expensedate || row.expense_date || row.date || today(),
      label: row.label || row.expense || row.title || "",
      category: row.category || "",
      mode: row.mode || "Cash",
      amount: row.amount || 0,
    });
  }

  async function importExpenseCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    try {
      const importedRows = csvToRecords(await file.text())
        .map(normalizeExpenseImportRow)
        .filter((record) => record.label.trim());
      for (const record of importedRows) {
        await onSaveExpense(record);
      }
      setMessage(`Imported ${importedRows.length} expense rows`);
    } catch {
      setMessage("Expense CSV import failed. Check the headings and values.");
    } finally {
      setImportingCsv(false);
      event.target.value = "";
    }
  }

  function exportExpensesCsv() {
    const records = expenseRows.map((expense) => ({
      expenseDate: expense.expenseDate || expense.date,
      label: expense.label || expense.title,
      category: expense.category,
      mode: expense.mode,
      amount: expense.amount,
    }));
    downloadTextFile("expenses-export.csv", recordsToCsv(EXPENSE_CSV_COLUMNS, records));
  }

  return (
    <Page>
      <Panel title="Expense management" subtitle="Daily shop expenses" action="Add expense" onAction={() => openExpenseForm()}>
        <div className="filter-row">
          <label>
            DATE SEARCH
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </label>
          <strong className="total-chip">{money(total)}</strong>
        </div>
        {message && <p className="db-message">{message}</p>}
        <div className="inventory-tools">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={importExpenseCsv} />
          <button className="ghost-button" type="button" onClick={() => csvInputRef.current?.click()} disabled={importingCsv}>
            <Upload size={16} />
            {importingCsv ? "Importing..." : "Import CSV"}
          </button>
          <button className="ghost-button" type="button" onClick={() => downloadTextFile("expenses-demo.csv", EXPENSE_DEMO_CSV)}>
            <Download size={16} />
            Demo CSV
          </button>
          <button className="ghost-button" type="button" onClick={exportExpensesCsv} disabled={!expenseRows.length}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <DataTable
          columns={["Date", "Expense", "Category", "Mode", "Amount", "Action"]}
          rows={filtered.map((expense) => [
            expense.date,
            expense.title,
            expense.category,
            expense.mode,
            money(expense.amount),
            <RowActions
              onEdit={() => openExpenseForm(expense)}
              onDelete={() => removeExpense(expense)}
            />,
          ])}
        />
      </Panel>
      {showForm && (
        <Modal title={form.id ? "Edit expense" : "Add expense"} eyebrow="Expense record" onClose={() => setShowForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitExpense}>
            <label className="field"><span>Expense</span><input required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></label>
            <label className="field"><span>Date</span><input type="date" value={form.expenseDate} onChange={(event) => setForm({ ...form, expenseDate: event.target.value })} /></label>
            <label className="field"><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">Select category</option>{uniqueValues([...expenseCategoryOptions, form.category]).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="field"><span>Mode</span><select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option>Cash</option><option>UPI</option><option>Bank</option></select></label>
            <label className="field full"><span>Amount</span><input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
            <button className="action-button full" type="submit">{form.id ? "Update expense" : "Save expense"}</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function CategoriesPage({
  categoryRows,
  materialRows,
  onSaveCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSaveMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  globalSearch = "",
}) {
  const categoryCsvInputRef = useRef(null);
  const materialCsvInputRef = useRef(null);
  const rawMaterialCategoryOptions = useMemo(
    () => categoryNames(categoryRows, "Raw Material", materialRows.map((material) => material.category)),
    [categoryRows, materialRows]
  );
  const rawMaterialUnitOptions = useMemo(
    () => uniqueValues([...materialRows.map((material) => material.unit), ...UNIT_OPTIONS]),
    [materialRows]
  );
  const [activeTab, setActiveTab] = useState("categories");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ type: "Product", name: "" });
  const [materialForm, setMaterialForm] = useState({
    name: "",
    category: "",
    stock: 0,
    unit: "kg",
    min: 0,
    rate: 0,
  });
  const [message, setMessage] = useState("");
  const [importingCategoryCsv, setImportingCategoryCsv] = useState(false);
  const [importingMaterialCsv, setImportingMaterialCsv] = useState(false);
  const filteredCategoryRows = categoryRows.filter((category) =>
    matchesSearch(globalSearch, [category.type, category.name, category.items, category.margin])
  );
  const filteredMaterialRows = materialRows.filter((material) =>
    matchesSearch(globalSearch, [material.name, material.category, material.unit, material.rate, material.stock])
  );

  function openCategoryForm(category = null) {
    setCategoryForm(category ? { ...category } : { type: "Product", name: "" });
    setShowCategoryForm(true);
  }

  function openMaterialForm(material = null) {
    setMaterialForm(
      material
        ? { ...material }
        : {
            name: "",
            category: rawMaterialCategoryOptions[0] || "",
            stock: 0,
            unit: "kg",
            min: 0,
            rate: 0,
          }
    );
    setShowMaterialForm(true);
  }

  async function submitCategory(event) {
    event.preventDefault();
    const result = await (categoryForm.id ? onUpdateCategory(categoryForm) : onSaveCategory(categoryForm));
    setMessage(categoryForm.id ? "Category updated" : "Category saved");
    setCategoryForm({ type: "Product", name: "" });
    setShowCategoryForm(false);
  }

  async function submitMaterial(event) {
    event.preventDefault();
    const result = await (materialForm.id ? onUpdateMaterial(materialForm) : onSaveMaterial(materialForm));
    setMessage(
      materialForm.id
        ? "Raw material updated. It is now available in Daily Vendors."
        : "Raw material saved. It is now available in Daily Vendors."
    );
    setMaterialForm({
      name: "",
      category: rawMaterialCategoryOptions[0] || "",
      stock: 0,
      unit: "kg",
      min: 0,
      rate: 0,
    });
    setShowMaterialForm(false);
    setActiveTab("materials");
  }

  async function removeCategory(category) {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    await onDeleteCategory(category.id);
    setMessage("Category deleted");
  }

  async function removeMaterial(material) {
    if (!window.confirm(`Delete ${material.name}?`)) return;
    await onDeleteMaterial(material.id);
    setMessage("Raw material deleted");
  }

  function normalizeCategoryImportRow(row) {
    return normalizeCategory({
      type: row.type || row.category_type || row.categorytype || "Product",
      name: row.name || row.category || "",
    });
  }

  async function importCategoryCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingCategoryCsv(true);
    try {
      const importedRows = csvToRecords(await file.text())
        .map(normalizeCategoryImportRow)
        .filter((record) => record.name.trim());
      const uniqueRows = uniqueBy(importedRows, (record) => `${lookupKey(record.type)}:${lookupKey(record.name)}`);
      const existingByTypeName = new Map(categoryRows.map((category) => [`${lookupKey(category.type)}:${lookupKey(category.name)}`, category]));
      let created = 0;
      let updated = 0;
      for (const record of uniqueRows) {
        const key = `${lookupKey(record.type)}:${lookupKey(record.name)}`;
        const existing = existingByTypeName.get(key);
        if (existing) {
          await onUpdateCategory({ ...existing, ...record, id: existing.id });
          updated += 1;
        } else {
          await onSaveCategory(record);
          created += 1;
        }
      }
      setMessage(`Imported ${uniqueRows.length} categories (${created} new, ${updated} updated)`);
    } catch {
      setMessage("Category CSV import failed. Check the headings and values.");
    } finally {
      setImportingCategoryCsv(false);
      event.target.value = "";
    }
  }

  function exportCategoriesCsv() {
    const records = categoryRows.map((category) => ({
      type: category.type,
      name: category.name,
    }));
    downloadTextFile("categories-export.csv", recordsToCsv(CATEGORY_CSV_COLUMNS, records));
  }

  function normalizeMaterialImportRow(row) {
    return normalizeMaterial({
      name: row.name || row.material || row.raw_material || row.item || "",
      category: row.category || row.type || "",
      stock: row.stock || row.qty || row.quantity || 0,
      unit: row.unit || "kg",
      min: row.min || row.minimum || row.minimum_stock || row.minimumstock || 0,
      rate: row.rate || row.price || 0,
    });
  }

  async function importMaterialCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingMaterialCsv(true);
    try {
      const importedRows = csvToRecords(await file.text())
        .map(normalizeMaterialImportRow)
        .filter((record) => record.name.trim());
      const uniqueRows = uniqueBy(importedRows, (record) => lookupKey(record.name));
      const existingByName = new Map(materialRows.map((material) => [lookupKey(material.name), material]));
      const existingCategories = new Set(
        categoryRows
          .filter((category) => sameText(category.type, "Raw Material"))
          .map((category) => lookupKey(category.name))
      );

      for (const category of uniqueValues(uniqueRows.map((record) => record.category))) {
        const key = lookupKey(category);
        if (!existingCategories.has(key)) {
          await onSaveCategory({ type: "Raw Material", name: category });
          existingCategories.add(key);
        }
      }

      let created = 0;
      let updated = 0;
      for (const record of uniqueRows) {
        const existing = existingByName.get(lookupKey(record.name));
        if (existing) {
          await onUpdateMaterial({ ...existing, ...record, id: existing.id });
          updated += 1;
        } else {
          await onSaveMaterial(record);
          created += 1;
        }
      }
      setMessage(`Imported ${uniqueRows.length} raw materials (${created} new, ${updated} updated)`);
      setActiveTab("materials");
    } catch {
      setMessage("Raw material CSV import failed. Check the headings and values.");
    } finally {
      setImportingMaterialCsv(false);
      event.target.value = "";
    }
  }

  function exportMaterialsCsv() {
    const records = materialRows.map((material) => ({
      name: material.name,
      category: material.category,
      stock: material.stock,
      unit: material.unit,
      min: material.min,
      rate: material.rate,
    }));
    downloadTextFile("raw-material-master-export.csv", recordsToCsv(INVENTORY_CSV_COLUMNS, records));
  }

  return (
    <Page>
      <Panel
        title="Category management"
        subtitle={activeTab === "materials" ? "Raw material master" : "Product, vendor, and expense categories"}
        action={activeTab === "materials" ? "Add raw material" : "Add category"}
        onAction={() => (activeTab === "materials" ? openMaterialForm() : openCategoryForm())}
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
        <div className="inventory-tools">
          {activeTab === "categories" ? (
            <>
              <input ref={categoryCsvInputRef} type="file" accept=".csv,text/csv" onChange={importCategoryCsv} />
              <button className="ghost-button" type="button" onClick={() => categoryCsvInputRef.current?.click()} disabled={importingCategoryCsv}>
                <Upload size={16} />
                {importingCategoryCsv ? "Importing..." : "Import CSV"}
              </button>
              <button className="ghost-button" type="button" onClick={() => downloadTextFile("categories-demo.csv", CATEGORY_DEMO_CSV)}>
                <Download size={16} />
                Demo CSV
              </button>
              <button className="ghost-button" type="button" onClick={exportCategoriesCsv} disabled={!categoryRows.length}>
                <Download size={16} />
                Export CSV
              </button>
            </>
          ) : (
            <>
              <input ref={materialCsvInputRef} type="file" accept=".csv,text/csv" onChange={importMaterialCsv} />
              <button className="ghost-button" type="button" onClick={() => materialCsvInputRef.current?.click()} disabled={importingMaterialCsv}>
                <Upload size={16} />
                {importingMaterialCsv ? "Importing..." : "Import CSV"}
              </button>
              <button className="ghost-button" type="button" onClick={() => downloadTextFile("raw-material-master-demo.csv", INVENTORY_DEMO_CSV)}>
                <Download size={16} />
                Demo CSV
              </button>
              <button className="ghost-button" type="button" onClick={exportMaterialsCsv} disabled={!materialRows.length}>
                <Download size={16} />
                Export CSV
              </button>
            </>
          )}
        </div>
        {activeTab === "categories" ? (
          <DataTable
            columns={["Type", "Name"]}
            rows={filteredCategoryRows.map((category) => [
              category.type,
              <CellWithActions label={category.name}>
                <RowActions
                  onEdit={() => openCategoryForm(category)}
                  onDelete={() => removeCategory(category)}
                />
              </CellWithActions>,
            ])}
            empty="No categories found"
          />
        ) : (
          <DataTable
            columns={["Raw material", "Category"]}
            rows={filteredMaterialRows.map((material) => [
              material.name,
              <CellWithActions label={material.category}>
                <RowActions
                  onEdit={() => openMaterialForm(material)}
                  onDelete={() => removeMaterial(material)}
                />
              </CellWithActions>,
            ])}
            empty="No raw materials found"
          />
        )}
      </Panel>
      {showCategoryForm && (
        <Modal title={categoryForm.id ? "Edit category" : "Add category"} eyebrow="Category record" onClose={() => setShowCategoryForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitCategory}>
            <label className="field"><span>Type</span><select value={categoryForm.type} onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value })}>{CATEGORY_TYPE_OPTIONS.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="field"><span>Name</span><input required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></label>
            <button className="action-button full" type="submit">{categoryForm.id ? "Update category" : "Save category"}</button>
          </form>
        </Modal>
      )}
      {showMaterialForm && (
        <Modal title={materialForm.id ? "Edit raw material" : "Add raw material"} eyebrow="Raw material record" onClose={() => setShowMaterialForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitMaterial}>
            <label className="field"><span>Name</span><input required value={materialForm.name} onChange={(event) => setMaterialForm({ ...materialForm, name: event.target.value })} /></label>
            <label className="field">
              <span>Category</span>
              <select
                value={materialForm.category}
                onChange={(event) => setMaterialForm({ ...materialForm, category: event.target.value })}
              >
                <option value="">Select category</option>
                {uniqueValues([...rawMaterialCategoryOptions, materialForm.category]).map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Unit</span>
              <select value={materialForm.unit} onChange={(event) => setMaterialForm({ ...materialForm, unit: event.target.value })}>
                {uniqueValues([materialForm.unit, ...rawMaterialUnitOptions]).map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <button className="action-button full" type="submit">{materialForm.id ? "Update raw material" : "Save raw material"}</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function UsersPage({ userRows, permissionRows, onSaveUser, onUpdateUser, onDeleteUser, onSavePermission, globalSearch = "" }) {
  const csvInputRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "accountant", status: "Active" });
  const [selectedRole, setSelectedRole] = useState("admin");
  const [message, setMessage] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);
  const filteredUserRows = userRows.filter((user) =>
    matchesSearch(globalSearch, [user.username, user.name, user.role, user.status])
  );
  const roleOptions = useMemo(() => {
    const roles = uniqueValues([...ROLE_OPTIONS.map((role) => role.value), ...userRows.map((user) => user.role)]);
    return roles.map((role) => ({ value: role, label: roleLabel(role) }));
  }, [userRows]);

  useEffect(() => {
    if (!roleOptions.some((role) => role.value === selectedRole)) {
      setSelectedRole(roleOptions[0]?.value || "admin");
    }
  }, [roleOptions, selectedRole]);

  function openUserForm(user = null) {
    setForm(user ? { ...user, password: "" } : { username: "", password: "", name: "", role: "accountant", status: "Active" });
    setShowForm(true);
  }

  async function submitUser(event) {
    event.preventDefault();
    const result = await (form.id ? onUpdateUser(form) : onSaveUser(form));
    setMessage(form.id ? "User updated" : "User saved");
    setForm({ username: "", password: "", name: "", role: "accountant", status: "Active" });
    setShowForm(false);
  }

  async function togglePermission(module, field) {
    if (selectedRole === "admin") return;
    const current = permissionFor(permissionRows, selectedRole, module);
    const next = { ...current, [field]: !current[field] };
    await onSavePermission(next);
    setMessage(`Permissions updated for ${roleLabel(selectedRole)}`);
  }

  async function removeUser(user) {
    if (user.protected) return;
    if (!window.confirm(`Delete ${user.username}?`)) return;
    await onDeleteUser(user.id);
    setMessage("User deleted");
  }

  function normalizeUserImportRow(row) {
    const role = lookupKey(row.role || "accountant") || "accountant";
    return {
      username: row.username || row.user || "",
      password: row.password || "",
      name: row.name || row.full_name || row.fullname || row.username || "",
      role,
      status: row.status || "Active",
    };
  }

  async function importUsersCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    try {
      const importedRows = csvToRecords(await file.text())
        .map(normalizeUserImportRow)
        .filter((record) => record.username.trim());
      const uniqueRows = uniqueBy(importedRows, (record) => lookupKey(record.username));
      const existingByUsername = new Map(userRows.map((user) => [lookupKey(user.username), user]));
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const record of uniqueRows) {
        const existing = existingByUsername.get(lookupKey(record.username));
        if (existing) {
          await onUpdateUser({ ...existing, ...record, id: existing.id });
          updated += 1;
        } else if (record.password) {
          await onSaveUser(record);
          created += 1;
        } else {
          skipped += 1;
        }
      }
      setMessage(`Imported ${created + updated} users (${created} new, ${updated} updated${skipped ? `, ${skipped} skipped without password` : ""})`);
    } catch {
      setMessage("User CSV import failed. Check the headings and values.");
    } finally {
      setImportingCsv(false);
      event.target.value = "";
    }
  }

  function exportUsersCsv() {
    const records = userRows.map((user) => ({
      username: user.username,
      password: "",
      name: user.name,
      role: user.role,
      status: user.status,
    }));
    downloadTextFile("users-export.csv", recordsToCsv(USER_CSV_COLUMNS, records));
  }

  return (
    <Page>
      <Panel title="User management" subtitle="ERP users and roles" action="Create user" onAction={() => openUserForm()}>
        {message && <p className="db-message">{message}</p>}
        <div className="inventory-tools">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={importUsersCsv} />
          <button className="ghost-button" type="button" onClick={() => csvInputRef.current?.click()} disabled={importingCsv}>
            <Upload size={16} />
            {importingCsv ? "Importing..." : "Import CSV"}
          </button>
          <button className="ghost-button" type="button" onClick={() => downloadTextFile("users-demo.csv", USER_DEMO_CSV)}>
            <Download size={16} />
            Demo CSV
          </button>
          <button className="ghost-button" type="button" onClick={exportUsersCsv} disabled={!userRows.length}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <DataTable
          columns={["User", "Name", "Role", "Status", "Action"]}
          rows={filteredUserRows.map((user) => [
            user.username,
            user.name,
            roleLabel(user.role),
            user.status,
            user.protected ? (
              <button className="ghost-button" type="button" onClick={() => openUserForm(user)}>Edit</button>
            ) : (
              <RowActions
                onEdit={() => openUserForm(user)}
                onDelete={() => removeUser(user)}
              />
            ),
          ])}
        />
      </Panel>
      <Panel title="Access control" subtitle="Role permissions">
        <div className="filter-row">
          <label>
            ROLE
            <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
              {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </label>
          <strong className="total-chip">{selectedRole === "admin" ? "Full access" : "Editable"}</strong>
        </div>
        <DataTable
          columns={["Module", "View", "Add", "Edit", "Delete"]}
          rows={ERP_MODULES.map((module) => {
            const permission = permissionFor(permissionRows, selectedRole, module);
            const locked = selectedRole === "admin";
            return [
              module.label,
              <input type="checkbox" checked={permission.canView} disabled={locked} onChange={() => togglePermission(module, "canView")} />,
              <input type="checkbox" checked={permission.canAdd} disabled={locked} onChange={() => togglePermission(module, "canAdd")} />,
              <input type="checkbox" checked={permission.canEdit} disabled={locked} onChange={() => togglePermission(module, "canEdit")} />,
              <input type="checkbox" checked={permission.canDelete} disabled={locked} onChange={() => togglePermission(module, "canDelete")} />,
            ];
          })}
        />
      </Panel>
      {showForm && (
        <Modal title={form.id ? "Edit user" : "Create user"} eyebrow="User record" onClose={() => setShowForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitUser}>
            <label className="field"><span>Username</span><input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
            <label className="field"><span>Full name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="field"><span>{form.id ? "New password" : "Password"}</span><input required={!form.id} type="password" value={form.password || ""} autoComplete="new-password" placeholder={form.id ? "Leave blank to keep current password" : "Enter password"} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <label className="field"><span>Role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
            <label className="field full"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Active</option><option>Inactive</option></select></label>
            <button className="action-button full" type="submit">{form.id ? "Update user" : "Save user"}</button>
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

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="row-actions">
      <button className="icon-button quiet row-action" type="button" onClick={onEdit} aria-label="Edit">
        <Pencil size={16} />
      </button>
      <button className="icon-button danger row-action" type="button" onClick={onDelete} aria-label="Delete">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function CellWithActions({ label, children }) {
  return (
    <div className="cell-with-actions">
      <span>{label}</span>
      {children}
    </div>
  );
}

function totalForDate(bills, date) {
  return bills.filter((bill) => bill.date === date).reduce((sum, bill) => sum + bill.total, 0);
}
