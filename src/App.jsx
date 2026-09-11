import React, { useEffect, useMemo, useRef, useState } from "react";
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
    category: item.category || "General",
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

function applyPaymentsToPurchases(purchases, payments) {
  const paymentTotals = new Map();
  payments.forEach((payment) => {
    const key = vendorKey(payment);
    paymentTotals.set(key, (paymentTotals.get(key) || 0) + Number(payment.amount || 0));
  });

  const purchasesByVendor = purchases.reduce((groups, purchase) => {
    const key = vendorKey(purchase);
    const group = groups.get(key) || [];
    group.push(purchase);
    groups.set(key, group);
    return groups;
  }, new Map());

  const resolved = new Map();
  purchasesByVendor.forEach((items, key) => {
    let remainingPayments = paymentTotals.get(key) || 0;
    [...items]
      .sort((a, b) => `${a.date}${a.id}`.localeCompare(`${b.date}${b.id}`))
      .forEach((purchase) => {
        const amount = purchaseAmount(purchase);
        const directPaid = Number(purchase.paid || 0);
        const basePending = Math.max(0, amount - directPaid);
        const allocatedPayment = Math.min(basePending, remainingPayments);
        remainingPayments -= allocatedPayment;
        resolved.set(purchase.id, {
          ...purchase,
          amount,
          paid: directPaid + allocatedPayment,
          pending: Math.max(0, basePending - allocatedPayment),
        });
      });
  });

  return purchases.map((purchase) => resolved.get(purchase.id) || purchase);
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
  const [vendorPaymentRows, setVendorPaymentRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
  const [userRows, setUserRows] = useState([]);

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
    if (data.vendorPayments) setVendorPaymentRows(data.vendorPayments.map(normalizeVendorPayment));
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
      amount: record.amount,
      mode: record.mode,
      paymentDate: record.paymentDate,
      notes: record.notes,
    };
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
      vendorId: selectedVendor?.id ? Number(selectedVendor.id) : undefined,
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
    return { ...result, record };
  }

  async function updateVendorPurchase(purchase) {
    const record = normalizeVendorPurchase(purchase);
    const result = await updateBusinessRecord(`/api/vendor-purchases/${record.id}`, toVendorPurchasePayload(record));
    if (result.bootstrap) {
      applyBusinessData(result.bootstrap);
    } else {
      setVendorPurchaseRows((records) => records.map((item) => (item.id === record.id ? record : item)));
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
    () => applyPaymentsToPurchases(vendorPurchaseRows, vendorPaymentRows),
    [vendorPurchaseRows, vendorPaymentRows]
  );
  const dynamicVendorRows = useMemo(
    () => applyDynamicVendorBalances(vendorRows, dynamicVendorPurchaseRows, vendorPaymentRows),
    [vendorRows, dynamicVendorPurchaseRows, vendorPaymentRows]
  );

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
        vendorRows={dynamicVendorRows}
        vendorPurchaseRows={dynamicVendorPurchaseRows}
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
        onSaveExpense={persistExpense}
        onUpdateExpense={updateExpense}
        onDeleteExpense={deleteExpense}
        onSaveCategory={persistCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onSaveUser={persistUser}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
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
  vendorPurchaseRows,
  vendorPaymentRows,
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
  onSaveExpense,
  onUpdateExpense,
  onDeleteExpense,
  onSaveCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSaveUser,
  onUpdateUser,
  onDeleteUser,
}) {
  if (route === "operations") {
    return (
      <OperationsDashboard
        salesBills={salesBills}
        staff={staff}
        materialRows={materialRows}
        vendorRows={vendorRows}
        expenseRows={expenseRows}
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
    return <SalesSlipPage bills={salesBills} status={salesStatus} productRows={productRows} onSaveBill={onSaveBill} />;
  }
  if (route === "inventory") {
    return (
      <InventoryPage
        materialRows={materialRows}
        productRows={productRows}
        onSaveMaterial={onSaveMaterial}
        onUpdateMaterial={onUpdateMaterial}
        onDeleteMaterial={onDeleteMaterial}
        onUpdateMaterialStock={onUpdateMaterialStock}
        onSaveProduct={onSaveProduct}
        onUpdateProduct={onUpdateProduct}
        onDeleteProduct={onDeleteProduct}
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
      />
    );
  }
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
  if (route === "vendors") {
    return (
      <VendorsPage
        vendorRows={vendorRows}
        onSaveVendor={onSaveVendor}
        onUpdateVendor={onUpdateVendor}
        onDeleteVendor={onDeleteVendor}
      />
    );
  }
  if (route === "expenses") {
    return (
      <ExpensesPage
        expenseRows={expenseRows}
        onSaveExpense={onSaveExpense}
        onUpdateExpense={onUpdateExpense}
        onDeleteExpense={onDeleteExpense}
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
      />
    );
  }
  if (route === "users") {
    return <UsersPage userRows={userRows} onSaveUser={onSaveUser} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} />;
  }
  return null;
}

function OperationsDashboard({ salesBills, staff, materialRows, vendorRows, expenseRows, onStartBill }) {
  const todaysSales = totalForDate(salesBills, today());
  const totalExpenses = expenseRows.reduce((sum, item) => sum + item.amount, 0);
  const vendorDues = vendorRows.reduce((sum, item) => sum + item.pending, 0);
  const lowStockRows = materialRows.filter((material) => material.stock <= material.min);
  const inventoryReady = materialRows.length
    ? Math.round(((materialRows.length - lowStockRows.length) / materialRows.length) * 100)
    : 0;

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
          rows={staff.map((employee) => [employee.name, employee.role, employee.status || "Absent"])}
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

function SalesSlipPage({ bills, status, productRows, onSaveBill }) {
  const saleProducts = productRows;
  const [items, setItems] = useState([]);
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

  const rows = items.map((item) => {
    const product = saleProducts.find((entry) => entry.name === item.product) || saleProducts[0];
    if (!product) {
      return { ...item, rate: 0, unit: "", total: 0 };
    }
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

  useEffect(() => {
    if (!items.length && saleProducts[0]) {
      setItems([{ product: saleProducts[0].name, qty: 1 }]);
    }
  }, [items.length, saleProducts]);

  function updateItem(index, patch) {
    setItems(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function startNewBill() {
    const freshDate = today();
    setItems(saleProducts[0] ? [{ product: saleProducts[0].name, qty: 1 }] : []);
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
                onClick={() => setItems([...items, { product: saleProducts[0].name, qty: 1 }])}
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
            <div className="sale-head">
              <span>PRODUCT</span>
              <span>QTY</span>
              <span>RATE</span>
              <span>TOTAL</span>
              <span />
            </div>
            {!saleProducts.length && <div className="empty-state">No products found</div>}
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

function InventoryPage({
  materialRows,
  productRows,
  onSaveMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onUpdateMaterialStock,
  onSaveProduct,
  onUpdateProduct,
  onDeleteProduct,
}) {
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

  function openMaterialForm(material = null) {
    setMaterialForm(
      material
        ? { ...material }
        : {
            name: "",
            category: "Packaging",
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
            category: "Sweets",
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
    setMaterialForm({ name: "", category: "Packaging", stock: 0, unit: "kg", min: 0, rate: 0 });
    setMessage(materialForm.id ? "Raw material updated" : "Raw material saved");
    setModalMode(null);
  }

  async function removeMaterial(material) {
    if (!window.confirm(`Delete ${material.name}?`)) return;
    await onDeleteMaterial(material.id);
    setMessage("Raw material deleted");
  }

  async function submitProduct(event) {
    event.preventDefault();
    const result = await (productForm.id ? onUpdateProduct(productForm) : onSaveProduct(productForm));
    setProductForm({ sku: "", name: "", category: "Sweets", unit: "kg", rate: 0, taxRate: 0 });
    setMessage(productForm.id ? "Product updated" : "Product saved");
    setModalMode(null);
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    await onDeleteProduct(product.id);
    setMessage("Product deleted");
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
        onAction={() => openMaterialForm()}
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
            <RowActions
              onEdit={() => openMaterialForm(material)}
              onDelete={() => removeMaterial(material)}
            />,
          ])}
        />
      </Panel>
      <Panel title="Finished goods" subtitle="Ready stock" action="Add product" onAction={() => openProductForm()}>
        <div className="product-grid">
          {productRows.map((product) => (
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
            <label className="field"><span>Category</span><input value={materialForm.category} onChange={(event) => setMaterialForm({ ...materialForm, category: event.target.value })} /></label>
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
            <label className="field"><span>Category</span><input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /></label>
            <label className="field"><span>Unit</span><input value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })} /></label>
            <label className="field"><span>Rate</span><input type="number" value={productForm.rate} onChange={(event) => setProductForm({ ...productForm, rate: event.target.value })} /></label>
            <label className="field"><span>GST %</span><input type="number" value={productForm.taxRate} onChange={(event) => setProductForm({ ...productForm, taxRate: event.target.value })} /></label>
            <button className="action-button full" type="submit">{productForm.id ? "Update product" : "Save product"}</button>
          </form>
        </Modal>
      )}
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
        .sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`)),
    [purchaseRows]
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
          notes: notes || `Payment for ${group.entries.length} pending purchase${group.entries.length === 1 ? "" : "s"}`,
        });
      }
      cancelPaymentEdit();
      setMessage(`${selectedDueEntries.length} pending entr${selectedDueEntries.length === 1 ? "y" : "ies"} paid`);
      return;
    }

    const payment = {
      vendorId: selected.id,
      vendorName: selected.name,
      amount: Number(amount || 0),
      mode,
      paymentDate,
      notes,
    };
    if (editingPaymentId) {
      await onUpdateVendorPayment({ ...payment, id: editingPaymentId });
      setMessage("Vendor payment updated");
      setEditingPaymentId("");
    } else {
      await onSaveVendorPayment(payment);
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
      setNotes(`Payment for ${entries.length} pending purchase${entries.length === 1 ? "" : "s"}`);
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
    setNotes(`Payment for ${entry.material} purchase on ${entry.date}`);
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
          rows={paymentRows.map((payment) => [
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
}) {
  const formRef = useRef(null);
  const vendorOptions = useMemo(() => vendorRows, [vendorRows]);
  const materialOptions = useMemo(() => materialRows, [materialRows]);
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...categoryRows
              .filter((category) => ["raw material", "vendor"].includes(category.type.toLowerCase()))
              .map((category) => category.name),
            ...materialOptions.map((item) => item.category),
            ...vendorOptions.map((vendor) => vendor.category),
          ].filter(Boolean)
        )
      ),
    [categoryRows, materialOptions, vendorOptions]
  );
  const [dateFilter, setDateFilter] = useState(today());
  const [modalMode, setModalMode] = useState(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState("");
  const [message, setMessage] = useState("");
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
  const vendorSelectOptions = useMemo(() => {
    const options = [...vendorOptions];
    if (form.vendor && !options.some((vendor) => vendor.name === form.vendor)) {
      options.unshift({ id: `current-${form.vendor}`, name: form.vendor, category: form.category });
    }
    return options;
  }, [form.category, form.vendor, vendorOptions]);
  const materialSelectOptions = useMemo(() => {
    const options = [...materialOptions];
    if (form.material && !options.some((material) => material.name === form.material)) {
      options.unshift({ id: `current-${form.material}`, name: form.material, category: form.category, unit: form.unit, rate: form.rate });
    }
    return options;
  }, [form.category, form.material, form.rate, form.unit, materialOptions]);
  const [vendorForm, setVendorForm] = useState({ name: "", category: categoryOptions[0] || "Dairy", contact: "" });
  const [categoryForm, setCategoryForm] = useState({ type: "Raw Material", name: "" });
  const [materialForm, setMaterialForm] = useState({
    name: "",
    category: categoryOptions[0] || "Dairy",
    stock: 0,
    unit: "kg",
    min: 0,
    rate: 0,
  });

  useEffect(() => {
    const selected = materialOptions.find((item) => item.name === form.material);
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

  async function savePurchase(event) {
    event.preventDefault();
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
      category: materialOptions[0]?.category || categoryOptions[0] || "Packaging",
      qty: 1,
      unit: materialOptions[0]?.unit || "pcs",
      rate: materialOptions[0]?.rate || 0,
      paid: 0,
      mode: "Cash",
      notes: "",
    });
    setMessage("");
  }

  function changeVendor(value) {
    if (value === "__add_vendor__") {
      setVendorForm({ name: "", category: categoryOptions[0] || "Dairy", contact: "" });
      setModalMode("vendor");
      return;
    }
    setForm({ ...form, vendor: value });
  }

  function changeCategory(value) {
    if (value === "__add_category__") {
      setCategoryForm({ type: "Raw Material", name: "" });
      setModalMode("category");
      return;
    }
    setForm({ ...form, category: value });
  }

  function changeMaterial(value) {
    if (value === "__add_material__") {
      setMaterialForm({
        name: "",
        category: form.category || categoryOptions[0] || "Dairy",
        stock: 0,
        unit: "kg",
        min: 0,
        rate: 0,
      });
      setModalMode("material");
      return;
    }
    const selected = materialOptions.find((item) => item.name === value);
    setForm({
      ...form,
      material: value,
      category: selected?.category || form.category,
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
    setVendorForm({ name: "", category: categoryOptions[0] || "Dairy", contact: "" });
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
      category: categoryOptions[0] || "Dairy",
      stock: 0,
      unit: "kg",
      min: 0,
      rate: 0,
    });
    setMessage("Raw material added");
    setModalMode(null);
  }

  const filtered = purchaseRows.filter((record) => !dateFilter || record.date === dateFilter);

  return (
    <Page>
      <Panel title="Daily vendor" subtitle="Date wise purchase and payment">
        {message && <p className="db-message">{message}</p>}
        <form className="form-grid purchase-form" onSubmit={savePurchase} ref={formRef}>
          <label>DATE<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
          <label>VENDOR<select value={form.vendor} onChange={(event) => changeVendor(event.target.value)}><option value="__add_vendor__">Add vendor</option>{vendorSelectOptions.map((vendor) => <option key={vendor.id}>{vendor.name}</option>)}</select></label>
          <label>CATEGORY<select value={form.category} onChange={(event) => changeCategory(event.target.value)}><option value="__add_category__">Add category</option>{Array.from(new Set([...categoryOptions, form.category].filter(Boolean))).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>RAW MATERIAL<select value={form.material} onChange={(event) => changeMaterial(event.target.value)}><option value="__add_material__">Add raw material</option>{materialSelectOptions.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
          <label>QTY<input type="number" value={form.qty} onChange={(event) => setForm({ ...form, qty: event.target.value })} /></label>
          <label>UNIT<input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label>
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
            const amount = Number(record.qty) * Number(record.rate);
            return [
              record.date,
              record.vendor,
              record.material,
              `${record.qty} ${record.unit}`,
              money(amount),
              money(record.paid),
              money(amount - record.paid),
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
            <label className="field"><span>Category</span><select value={vendorForm.category} onChange={(event) => setVendorForm({ ...vendorForm, category: event.target.value })}>{Array.from(new Set([...categoryOptions, vendorForm.category].filter(Boolean))).map((item) => <option key={item}>{item}</option>)}</select></label>
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
            <label className="field"><span>Category</span><select value={materialForm.category} onChange={(event) => setMaterialForm({ ...materialForm, category: event.target.value })}>{Array.from(new Set([...categoryOptions, materialForm.category].filter(Boolean))).map((item) => <option key={item}>{item}</option>)}</select></label>
            <button className="action-button full" type="submit">Save raw material</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function EmployeesPage({ staff, status, onSaveEmployee, onUpdateEmployee, onDeleteEmployee }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(staff[0]?.id || "");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => blankEmployeeForm());
  const [editingId, setEditingId] = useState("");
  const [salaryMonth, setSalaryMonth] = useState(today().slice(0, 7));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(status);
  const selected = staff.find((employee) => employee.id === selectedId) || staff[0];
  const filtered = staff.filter((employee) =>
    `${employee.name} ${employee.role} ${employee.contact}`.toLowerCase().includes(query.toLowerCase())
  );
  const attendanceRows = [];
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
                <DataTable
                  columns={["Date", "Status", "In", "Out"]}
                  rows={attendanceRows.map(([day, rowStatus, inTime, outTime]) => [
                    day,
                    <span className="status-badge">{rowStatus}</span>,
                    inTime,
                    outTime,
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

function VendorsPage({ vendorRows, onSaveVendor, onUpdateVendor, onDeleteVendor }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Dairy", contact: "" });
  const [message, setMessage] = useState("");

  function openVendorForm(vendor = null) {
    setForm(vendor ? { ...vendor } : { name: "", category: "Dairy", contact: "" });
    setShowForm(true);
  }

  async function submitVendor(event) {
    event.preventDefault();
    const result = await (form.id ? onUpdateVendor(form) : onSaveVendor(form));
    setMessage(form.id ? "Vendor updated" : "Vendor saved");
    setForm({ name: "", category: "Dairy", contact: "" });
    setShowForm(false);
  }

  async function removeVendor(vendor) {
    if (!window.confirm(`Delete ${vendor.name}?`)) return;
    await onDeleteVendor(vendor.id);
    setMessage("Vendor deleted");
  }

  return (
    <Page>
      <Panel title="Vendor management" subtitle="Vendor categories and contacts" action="Add vendor" onAction={() => openVendorForm()}>
        {message && <p className="db-message">{message}</p>}
        <DataTable
          columns={["Vendor", "Category", "Contact", "Pending", "Action"]}
          rows={vendorRows.map((vendor) => [
            vendor.name,
            vendor.category,
            vendor.contact,
            money(vendor.pending),
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
            <label className="field"><span>Category</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
            <label className="field full"><span>Contact</span><input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></label>
            <button className="action-button full" type="submit">{form.id ? "Update vendor" : "Save vendor"}</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function ExpensesPage({ expenseRows, onSaveExpense, onUpdateExpense, onDeleteExpense }) {
  const [dateFilter, setDateFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ expenseDate: today(), label: "", category: "Staff Food", mode: "Cash", amount: 0 });
  const [message, setMessage] = useState("");
  const filtered = expenseRows.filter((expense) => !dateFilter || expense.date === dateFilter);
  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);

  function openExpenseForm(expense = null) {
    setForm(
      expense
        ? { ...expense, expenseDate: expense.expenseDate || expense.date, label: expense.label || expense.title }
        : { expenseDate: today(), label: "", category: "Staff Food", mode: "Cash", amount: 0 }
    );
    setShowForm(true);
  }

  async function submitExpense(event) {
    event.preventDefault();
    const result = await (form.id ? onUpdateExpense(form) : onSaveExpense(form));
    setMessage(form.id ? "Expense updated" : "Expense saved");
    setForm({ expenseDate: today(), label: "", category: "Staff Food", mode: "Cash", amount: 0 });
    setShowForm(false);
  }

  async function removeExpense(expense) {
    if (!window.confirm(`Delete ${expense.title}?`)) return;
    await onDeleteExpense(expense.id);
    setMessage("Expense deleted");
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
            <label className="field"><span>Category</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
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
}) {
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
  const [categoryForm, setCategoryForm] = useState({ type: "Product", name: "" });
  const [materialForm, setMaterialForm] = useState({
    name: "",
    category: "Dairy",
    stock: 0,
    unit: "kg",
    min: 0,
    rate: 0,
  });
  const [message, setMessage] = useState("");

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
            category: rawMaterialCategoryOptions[0] || "Dairy",
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
      category: rawMaterialCategoryOptions[0] || "Dairy",
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
        {activeTab === "categories" ? (
          <DataTable
            columns={["Type", "Name"]}
            rows={categoryRows.map((category) => [
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
            rows={materialRows.map((material) => [
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
            <label className="field"><span>Type</span><select value={categoryForm.type} onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value })}><option>Product</option><option>Vendor</option><option>Raw Material</option><option>Expense</option></select></label>
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
                {rawMaterialCategoryOptions.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <button className="action-button full" type="submit">{materialForm.id ? "Update raw material" : "Save raw material"}</button>
          </form>
        </Modal>
      )}
    </Page>
  );
}

function UsersPage({ userRows, onSaveUser, onUpdateUser, onDeleteUser }) {
  const modules = navGroups.flatMap((group) => group.items.map((item) => item.label));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "accountant", status: "Active" });
  const [message, setMessage] = useState("");

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

  async function removeUser(user) {
    if (user.protected) return;
    if (!window.confirm(`Delete ${user.username}?`)) return;
    await onDeleteUser(user.id);
    setMessage("User deleted");
  }

  return (
    <Page>
      <Panel title="User management" subtitle="ERP users and roles" action="Create user" onAction={() => openUserForm()}>
        {message && <p className="db-message">{message}</p>}
        <DataTable
          columns={["User", "Name", "Role", "Status", "Action"]}
          rows={userRows.map((user) => [
            user.username,
            user.name,
            user.role,
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
        <DataTable
          columns={["Module", "View", "Add", "Edit", "Delete"]}
          rows={modules.map((module) => [module, "✓", "✓", "✓", module === "Users" ? "-" : "✓"])}
        />
      </Panel>
      {showForm && (
        <Modal title={form.id ? "Edit user" : "Create user"} eyebrow="User record" onClose={() => setShowForm(false)}>
          <form className="modal-form grid-form" onSubmit={submitUser}>
            <label className="field"><span>Username</span><input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
            <label className="field"><span>Full name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="field"><span>Password</span><input required={!form.id} type="password" value={form.password || ""} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <label className="field"><span>Role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="admin">Admin</option><option value="accountant">Accountant</option></select></label>
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
