import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE,
  user: process.env.DB_USER || process.env.MYSQL_USER,
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
  dateStrings: true,
};

const hasDbConfig = Boolean(dbConfig.database && dbConfig.user);
const pool = hasDbConfig ? mysql.createPool(dbConfig) : null;
let schemaReady;

app.use(express.json({ limit: "1mb" }));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function nullableText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password || "")).digest("hex");
}

function labelScore(value) {
  const label = String(value || "").trim();
  if (!label) return -1;
  const hasUpper = /[A-Z]/.test(label);
  const hasLower = /[a-z]/.test(label);
  if (hasUpper && hasLower) return 3;
  if (hasUpper) return 2;
  if (hasLower) return 1;
  return 0;
}

function vendorKey(record) {
  const id = record.vendorId || record.id;
  const name = record.vendorName || record.vendor || record.name || "";
  return id ? `id:${String(id)}` : `name:${String(name).trim().toLowerCase()}`;
}

async function migrate() {
  if (!pool) {
    throw new Error("Missing database environment variables. Set DB_NAME, DB_USER, and DB_PASSWORD in Hostinger.");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      employee_code VARCHAR(64) NULL UNIQUE,
      name VARCHAR(160) NOT NULL,
      role VARCHAR(100) NOT NULL DEFAULT 'Staff',
      phone VARCHAR(40) NOT NULL DEFAULT '',
      address TEXT NULL,
      aadhaar_card VARCHAR(40) NOT NULL DEFAULT '',
      joining_date DATE NULL,
      shift_start TIME NULL DEFAULT '09:00:00',
      shift_end TIME NULL DEFAULT '21:00:00',
      salary DECIMAL(12,2) NOT NULL DEFAULT 0,
      advance DECIMAL(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(40) NOT NULL DEFAULT 'Absent',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_attendance (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      employee_id INT UNSIGNED NULL,
      employee_name VARCHAR(160) NOT NULL,
      attendance_date DATE NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'Absent',
      check_in TIME NULL,
      check_out TIME NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY employee_attendance_employee_date_unique (employee_id, attendance_date),
      INDEX employee_attendance_date_idx (attendance_date),
      CONSTRAINT employee_attendance_employee_fk FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS raw_stock (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT '',
      stock DECIMAL(12,3) NOT NULL DEFAULT 0,
      unit VARCHAR(40) NOT NULL DEFAULT 'kg',
      minimum_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
      rate DECIMAL(12,2) NOT NULL DEFAULT 0,
      in_today DECIMAL(12,3) NOT NULL DEFAULT 0,
      out_today DECIMAL(12,3) NOT NULL DEFAULT 0,
      wastage DECIMAL(12,3) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      sku VARCHAR(80) NULL UNIQUE,
      name VARCHAR(160) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT '',
      unit VARCHAR(40) NOT NULL DEFAULT 'kg',
      rate DECIMAL(12,2) NOT NULL DEFAULT 0,
      tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT '',
      contact VARCHAR(80) NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_purchases (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      vendor_id INT UNSIGNED NULL,
      vendor_name VARCHAR(160) NOT NULL,
      purchase_date DATE NOT NULL,
      item_name VARCHAR(160) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT '',
      qty DECIMAL(12,3) NOT NULL DEFAULT 0,
      unit VARCHAR(40) NOT NULL DEFAULT 'kg',
      rate DECIMAL(12,2) NOT NULL DEFAULT 0,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      paid DECIMAL(12,2) NOT NULL DEFAULT 0,
      mode VARCHAR(40) NOT NULL DEFAULT 'Cash',
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX vendor_purchases_vendor_idx (vendor_id),
      INDEX vendor_purchases_date_idx (purchase_date),
      CONSTRAINT vendor_purchases_vendor_fk FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_usage (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      material_id INT UNSIGNED NULL,
      material_name VARCHAR(160) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT '',
      usage_date DATE NOT NULL,
      used_qty DECIMAL(12,3) NOT NULL DEFAULT 0,
      unused_qty DECIMAL(12,3) NOT NULL DEFAULT 0,
      wastage_qty DECIMAL(12,3) NOT NULL DEFAULT 0,
      unit VARCHAR(40) NOT NULL DEFAULT 'kg',
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX inventory_usage_date_idx (usage_date),
      INDEX inventory_usage_material_idx (material_id),
      CONSTRAINT inventory_usage_material_fk FOREIGN KEY (material_id) REFERENCES raw_stock(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_payments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      vendor_id INT UNSIGNED NULL,
      vendor_name VARCHAR(160) NOT NULL,
      payment_date DATE NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      mode VARCHAR(40) NOT NULL DEFAULT 'Cash',
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX vendor_payments_vendor_idx (vendor_id),
      INDEX vendor_payments_date_idx (payment_date),
      CONSTRAINT vendor_payments_vendor_fk FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      expense_date DATE NOT NULL,
      label VARCHAR(180) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT '',
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      mode VARCHAR(40) NOT NULL DEFAULT 'Cash',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX expenses_date_idx (expense_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(80) NOT NULL DEFAULT 'Product',
      name VARCHAR(120) NOT NULL,
      items INT NOT NULL DEFAULT 0,
      margin VARCHAR(80) NOT NULL DEFAULT 'New',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY categories_type_name_unique (type, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(80) NOT NULL UNIQUE,
      password_hash CHAR(64) NULL,
      name VARCHAR(160) NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'accountant',
      status VARCHAR(40) NOT NULL DEFAULT 'Active',
      protected TINYINT(1) NOT NULL DEFAULT 0,
      last_login_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      role_name VARCHAR(80) NOT NULL,
      module_key VARCHAR(80) NOT NULL,
      module_label VARCHAR(120) NOT NULL,
      can_view TINYINT(1) NOT NULL DEFAULT 1,
      can_add TINYINT(1) NOT NULL DEFAULT 1,
      can_edit TINYINT(1) NOT NULL DEFAULT 1,
      can_delete TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY role_permissions_role_module_unique (role_name, module_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_slips (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      bill_no VARCHAR(80) NOT NULL UNIQUE,
      sale_date DATE NOT NULL,
      sale_date_time DATETIME NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount DECIMAL(12,2) NOT NULL DEFAULT 0,
      tax DECIMAL(12,2) NOT NULL DEFAULT 0,
      total DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_mode VARCHAR(40) NOT NULL DEFAULT 'Cash',
      items_json LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX sales_slips_date_idx (sale_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function ensureSchema() {
  schemaReady ||= migrate();
  return schemaReady;
}

async function query(sql, params = []) {
  await ensureSchema();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function exec(sql, params = []) {
  await ensureSchema();
  const [result] = await pool.execute(sql, params);
  return result;
}

function mapEmployee(row) {
  return {
    id: row.id,
    employeeCode: row.employee_code || `EMP-${String(row.id).padStart(3, "0")}`,
    name: row.name,
    role: row.role,
    phone: row.phone || "",
    address: row.address || "",
    aadhaarCard: row.aadhaar_card || "",
    joiningDate: row.joining_date || today(),
    shiftStart: row.shift_start || "09:00:00",
    shiftEnd: row.shift_end || "21:00:00",
    shift: `${row.shift_start || "09:00:00"} - ${row.shift_end || "21:00:00"}`,
    salary: number(row.salary),
    advance: number(row.advance),
    status: row.status || "Absent",
  };
}

function mapEmployeeAttendance(row) {
  return {
    id: row.id,
    employeeId: row.employee_id || "",
    employeeName: row.employee_name,
    attendanceDate: row.attendance_date,
    status: row.status || "Absent",
    checkIn: row.check_in || "",
    checkOut: row.check_out || "",
    notes: row.notes || "",
  };
}

function mapRawStock(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    stock: number(row.stock),
    unit: row.unit,
    min: number(row.minimum_stock),
    rate: number(row.rate),
    inToday: number(row.in_today),
    outToday: number(row.out_today),
    wastage: number(row.wastage),
  };
}

function mapProduct(row) {
  return {
    id: row.id,
    sku: row.sku || `PRD-${String(row.id).padStart(3, "0")}`,
    name: row.name,
    category: row.category,
    unit: row.unit,
    rate: number(row.rate),
    taxRate: number(row.tax_rate),
  };
}

function mapVendor(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    contact: row.contact || "",
    purchases: 0,
    pending: 0,
    lastPaid: 0,
  };
}

function mapVendorPurchase(row) {
  const amount = number(row.amount);
  const paid = number(row.paid);
  return {
    id: row.id,
    vendorId: row.vendor_id || "",
    vendorName: row.vendor_name,
    purchaseDate: row.purchase_date,
    itemName: row.item_name,
    category: row.category,
    qty: number(row.qty),
    unit: row.unit,
    rate: number(row.rate),
    amount,
    paid,
    pending: Math.max(0, amount - paid),
    mode: row.mode,
    notes: row.notes || "",
  };
}

function mapInventoryUsage(row) {
  return {
    id: row.id,
    materialId: row.material_id || "",
    materialName: row.material_name,
    category: row.category,
    usageDate: row.usage_date,
    usedQty: number(row.used_qty),
    unusedQty: number(row.unused_qty),
    wastageQty: number(row.wastage_qty),
    unit: row.unit,
    notes: row.notes || "",
  };
}

function mapVendorPayment(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id || "",
    vendorName: row.vendor_name,
    paymentDate: row.payment_date,
    amount: number(row.amount),
    mode: row.mode,
    notes: row.notes || "",
  };
}

function mapExpense(row) {
  return {
    id: row.id,
    expenseDate: row.expense_date,
    label: row.label,
    category: row.category,
    amount: number(row.amount),
    mode: row.mode,
  };
}

function mapCategory(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    items: number(row.items),
    margin: row.margin || "New",
  };
}

function mapUser(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    status: row.status,
    protected: Boolean(row.protected),
    lastLoginAt: row.last_login_at,
  };
}

function mapPermission(row) {
  return {
    id: row.id,
    role: row.role_name,
    moduleKey: row.module_key,
    moduleLabel: row.module_label,
    canView: Boolean(row.can_view),
    canAdd: Boolean(row.can_add),
    canEdit: Boolean(row.can_edit),
    canDelete: Boolean(row.can_delete),
  };
}

function mapSale(row) {
  let items = [];
  try {
    items = JSON.parse(row.items_json || "[]");
  } catch {
    items = [];
  }
  return {
    id: row.id,
    billNo: row.bill_no,
    saleDate: row.sale_date,
    saleDateTime: row.sale_date_time,
    subtotal: number(row.subtotal),
    discount: number(row.discount),
    tax: number(row.tax),
    total: number(row.total),
    paymentMode: row.payment_mode,
    items,
  };
}

async function listEmployees() {
  const rows = await query("SELECT * FROM employees ORDER BY name");
  return rows.map(mapEmployee);
}

async function listEmployeeAttendance() {
  const rows = await query("SELECT * FROM employee_attendance ORDER BY attendance_date DESC, id DESC");
  return rows.map(mapEmployeeAttendance);
}

async function listRawStock() {
  const rows = await query("SELECT * FROM raw_stock ORDER BY category, name");
  return rows.map(mapRawStock);
}

async function listProducts() {
  const rows = await query("SELECT * FROM products ORDER BY category, name");
  return rows.map(mapProduct);
}

async function listVendorPurchases() {
  const rows = await query("SELECT * FROM vendor_purchases ORDER BY purchase_date DESC, id DESC");
  return rows.map(mapVendorPurchase);
}

async function listInventoryUsage() {
  const rows = await query("SELECT * FROM inventory_usage ORDER BY usage_date DESC, id DESC");
  return rows.map(mapInventoryUsage);
}

async function listVendorPayments() {
  const rows = await query("SELECT * FROM vendor_payments ORDER BY payment_date DESC, id DESC");
  return rows.map(mapVendorPayment);
}

async function listVendors(purchases, payments) {
  const rows = await query("SELECT * FROM vendors ORDER BY name");
  const vendors = rows.map(mapVendor);
  const purchaseTotals = new Map();
  const lastPayments = new Map();

  purchases.forEach((purchase) => {
    const key = vendorKey(purchase);
    const current = purchaseTotals.get(key) || { purchases: 0, pending: 0 };
    current.purchases += number(purchase.amount);
    current.pending += number(purchase.pending);
    purchaseTotals.set(key, current);
  });

  payments.forEach((payment) => {
    const key = vendorKey(payment);
    const existing = lastPayments.get(key);
    if (!existing || `${payment.paymentDate}${payment.id}`.localeCompare(`${existing.paymentDate}${existing.id}`) > 0) {
      lastPayments.set(key, payment);
    }
  });

  return vendors.map((vendor) => {
    const totals = purchaseTotals.get(vendorKey(vendor)) || { purchases: 0, pending: 0 };
    const lastPayment = lastPayments.get(vendorKey(vendor));
    return {
      ...vendor,
      purchases: totals.purchases,
      pending: totals.pending,
      lastPaid: number(lastPayment?.amount),
    };
  });
}

async function listExpenses() {
  const rows = await query("SELECT * FROM expenses ORDER BY expense_date DESC, id DESC");
  return rows.map(mapExpense);
}

async function listCategories() {
  const rows = await query("SELECT * FROM categories ORDER BY type, name");
  return rows.map(mapCategory);
}

async function listUsers() {
  const rows = await query("SELECT id, username, name, role, status, protected, last_login_at FROM users ORDER BY username");
  return rows.map(mapUser);
}

async function listPermissions() {
  const rows = await query("SELECT * FROM role_permissions ORDER BY role_name, module_label");
  return rows.map(mapPermission);
}

async function listSalesHistory() {
  const rows = await query("SELECT * FROM sales_slips ORDER BY sale_date DESC, id DESC");
  return rows.map(mapSale);
}

async function getBootstrap() {
  await syncDerivedCategories();
  const [employees, employeeAttendance, rawStock, products, vendorPurchases, inventoryUsage, vendorPayments, expenses, categories, users, permissions, salesHistory] =
    await Promise.all([
      listEmployees(),
      listEmployeeAttendance(),
      listRawStock(),
      listProducts(),
      listVendorPurchases(),
      listInventoryUsage(),
      listVendorPayments(),
      listExpenses(),
      listCategories(),
      listUsers(),
      listPermissions(),
      listSalesHistory(),
    ]);
  const vendors = await listVendors(vendorPurchases, vendorPayments);
  const todayDate = today();
  const todaySales = salesHistory.filter((sale) => sale.saleDate === todayDate).reduce((sum, sale) => sum + sale.total, 0);
  const todayExpenses = expenses.filter((expense) => expense.expenseDate === todayDate).reduce((sum, expense) => sum + expense.amount, 0);
  const vendorDues = vendors.reduce((sum, vendor) => sum + vendor.pending, 0);
  const todayAttendance = employeeAttendance.filter((record) => record.attendanceDate === todayDate);
  const presentCount = todayAttendance.length
    ? todayAttendance.filter((record) => record.status === "Present").length
    : employees.filter((employee) => employee.status === "Present").length;

  return {
    dashboard: {
      todaySales,
      todayExpenses,
      presentCount,
      totalStaff: employees.length,
      vendorDues,
      dueVendors: vendors.filter((vendor) => vendor.pending > 0).length,
      todayProductionBatches: 0,
      todayProductionCost: 0,
      pendingProductionPlans: 0,
      todayWastageCost: 0,
    },
    employees,
    rawStock,
    finishedStock: products,
    vendors,
    vendorPurchases,
    inventoryUsage,
    vendorPayments,
    expenses,
    categories,
    products,
    employeeAttendance,
    employeePayments: [],
    stockHistory: inventoryUsage,
    salesHistory,
    users,
    permissions,
    recipes: [],
    productionPlans: [],
    productionBatches: [],
    wastageEntries: [],
  };
}

async function findOne(listFn, id) {
  const records = await listFn();
  return records.find((record) => String(record.id) === String(id));
}

async function vendorNameForPayment(body) {
  const providedName = text(body.vendorName || body.vendor);
  if (providedName) return providedName;
  if (body.vendorId) {
    const rows = await query("SELECT name FROM vendors WHERE id = ? LIMIT 1", [body.vendorId]);
    if (rows[0]?.name) return rows[0].name;
  }
  return "Vendor";
}

async function findRawStockByName(name) {
  const rows = await query("SELECT * FROM raw_stock WHERE LOWER(name) = LOWER(?) LIMIT 1", [text(name)]);
  return rows[0] ? mapRawStock(rows[0]) : null;
}

async function ensureCategory(type, name) {
  const categoryName = text(name);
  if (!categoryName) return null;
  const categoryType = text(type, "Raw Material");
  const existing = await query(
    "SELECT * FROM categories WHERE LOWER(type) = LOWER(?) AND LOWER(name) = LOWER(?) LIMIT 1",
    [categoryType, categoryName]
  );
  if (existing[0]) {
    if (labelScore(categoryName) > labelScore(existing[0].name)) {
      await exec("UPDATE categories SET type = ?, name = ? WHERE id = ?", [categoryType, categoryName, existing[0].id]);
      return findOne(listCategories, existing[0].id);
    }
    return mapCategory(existing[0]);
  }
  const result = await exec("INSERT INTO categories (type, name, items, margin) VALUES (?, ?, ?, ?)", [
    categoryType,
    categoryName,
    0,
    "Auto",
  ]);
  return findOne(listCategories, result.insertId);
}

async function syncDerivedCategories() {
  const sources = [
    ["Raw Material", "SELECT DISTINCT category AS name FROM raw_stock WHERE TRIM(category) <> ''"],
    ["Product", "SELECT DISTINCT category AS name FROM products WHERE TRIM(category) <> ''"],
    ["Vendor", "SELECT DISTINCT category AS name FROM vendors WHERE TRIM(category) <> ''"],
    ["Expense", "SELECT DISTINCT category AS name FROM expenses WHERE TRIM(category) <> ''"],
  ];

  for (const [categoryType, sql] of sources) {
    const rows = await query(sql);
    for (const row of rows) {
      await ensureCategory(categoryType, row.name);
    }
  }
}

async function ensureRawStockFromMaterial({ itemName, category, unit, rate }) {
  const materialName = text(itemName, "Item");
  const existing = await findRawStockByName(materialName);
  if (existing) return existing;
  await ensureCategory("Raw Material", category);
  const result = await exec(
    `INSERT INTO raw_stock (name, category, stock, unit, minimum_stock, rate, in_today, out_today, wastage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [materialName, text(category), 0, text(unit, "kg"), 0, number(rate), 0, 0, 0]
  );
  return findOne(listRawStock, result.insertId);
}

async function adjustRawStock(materialId, delta, movement = {}) {
  if (!materialId || !Number(delta || 0)) return;
  await exec(
    `UPDATE raw_stock
     SET stock = GREATEST(0, stock + ?),
         in_today = GREATEST(0, in_today + ?),
         out_today = GREATEST(0, out_today + ?),
         wastage = GREATEST(0, wastage + ?)
     WHERE id = ?`,
    [
      number(delta),
      number(movement.inToday),
      number(movement.outToday),
      number(movement.wastage),
      materialId,
    ]
  );
}

async function materialForInventoryMovement(record) {
  return ensureRawStockFromMaterial({
    itemName: record.itemName || record.materialName,
    category: record.category,
    unit: record.unit,
    rate: record.rate,
  });
}

async function materialForUsage(record) {
  if (record.materialId) {
    const material = await findOne(listRawStock, record.materialId);
    if (material) return material;
  }
  return ensureRawStockFromMaterial({
    itemName: record.materialName,
    category: record.category,
    unit: record.unit,
  });
}

function usageStockDelta(record) {
  return -(number(record.usedQty) + number(record.wastageQty));
}

async function respondWithBootstrap(res, key, record, status = 200) {
  const bootstrap = await getBootstrap();
  res.status(status).json({ [key]: record, record, bootstrap });
}

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

app.get("/api/health", asyncHandler(async (_req, res) => {
  await ensureSchema();
  res.json({ ok: true });
}));

app.get("/api/bootstrap", asyncHandler(async (_req, res) => {
  res.json(await getBootstrap());
}));

app.post("/api/employees", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const result = await exec(
    `INSERT INTO employees
      (employee_code, name, role, phone, address, aadhaar_card, joining_date, salary, shift_start, shift_end, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullableText(body.employeeCode),
      text(body.name, "Employee"),
      text(body.role, "Staff"),
      text(body.phone),
      text(body.address),
      text(body.aadhaarCard),
      body.joiningDate || today(),
      number(body.salary),
      body.shiftStart || "09:00:00",
      body.shiftEnd || "21:00:00",
      text(body.status, "Absent"),
    ]
  );
  const employee = await findOne(listEmployees, result.insertId);
  await respondWithBootstrap(res, "employee", employee, 201);
}));

app.put("/api/employees/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await exec(
    `UPDATE employees
     SET employee_code = ?, name = ?, role = ?, phone = ?, address = ?, aadhaar_card = ?,
         joining_date = ?, salary = ?, shift_start = ?, shift_end = ?, status = ?
     WHERE id = ?`,
    [
      nullableText(body.employeeCode),
      text(body.name, "Employee"),
      text(body.role, "Staff"),
      text(body.phone),
      text(body.address),
      text(body.aadhaarCard),
      body.joiningDate || today(),
      number(body.salary),
      body.shiftStart || "09:00:00",
      body.shiftEnd || "21:00:00",
      text(body.status, "Absent"),
      req.params.id,
    ]
  );
  const employee = await findOne(listEmployees, req.params.id);
  await respondWithBootstrap(res, "employee", employee);
}));

app.delete("/api/employees/:id", asyncHandler(async (req, res) => {
  await exec("DELETE FROM employees WHERE id = ?", [req.params.id]);
  await respondWithBootstrap(res, "employee", { id: req.params.id });
}));

app.post("/api/attendance", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const attendanceDate = body.attendanceDate || body.date || today();
  const status = text(body.status, "Present");
  const employeeIds = Array.isArray(body.employeeIds)
    ? body.employeeIds.map((id) => String(id)).filter(Boolean)
    : [];

  if (!employeeIds.length) {
    await respondWithBootstrap(res, "employeeAttendance", [], 201);
    return;
  }

  const placeholders = employeeIds.map(() => "?").join(",");
  const employeeRows = await query(`SELECT * FROM employees WHERE id IN (${placeholders})`, employeeIds);
  const checkIn = nullableText(body.checkIn);
  const checkOut = nullableText(body.checkOut);
  const notes = nullableText(body.notes);

  for (const row of employeeRows) {
    await exec(
      `INSERT INTO employee_attendance
        (employee_id, employee_name, attendance_date, status, check_in, check_out, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        employee_name = VALUES(employee_name),
        status = VALUES(status),
        check_in = VALUES(check_in),
        check_out = VALUES(check_out),
        notes = VALUES(notes)`,
      [row.id, row.name, attendanceDate, status, checkIn, checkOut, notes]
    );
  }

  if (attendanceDate === today() && employeeRows.length) {
    await exec(`UPDATE employees SET status = ? WHERE id IN (${placeholders})`, [status, ...employeeIds]);
  }

  const attendance = (await listEmployeeAttendance()).filter(
    (record) => record.attendanceDate === attendanceDate && employeeIds.includes(String(record.employeeId))
  );
  await respondWithBootstrap(res, "employeeAttendance", attendance, 201);
}));

app.post("/api/raw-stock", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await ensureCategory("Raw Material", body.category);
  const result = await exec(
    `INSERT INTO raw_stock (name, category, stock, unit, minimum_stock, rate, in_today, out_today, wastage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      text(body.name, "Raw material"),
      text(body.category),
      number(body.stock),
      text(body.unit, "kg"),
      number(body.min ?? body.minimumStock),
      number(body.rate),
      number(body.inToday),
      number(body.outToday),
      number(body.wastage),
    ]
  );
  const rawStock = await findOne(listRawStock, result.insertId);
  await respondWithBootstrap(res, "rawStock", rawStock, 201);
}));

app.put("/api/raw-stock/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await ensureCategory("Raw Material", body.category);
  await exec(
    `UPDATE raw_stock
     SET name = ?, category = ?, stock = ?, unit = ?, minimum_stock = ?, rate = ?, in_today = ?, out_today = ?, wastage = ?
     WHERE id = ?`,
    [
      text(body.name, "Raw material"),
      text(body.category),
      number(body.stock),
      text(body.unit, "kg"),
      number(body.min ?? body.minimumStock),
      number(body.rate),
      number(body.inToday),
      number(body.outToday),
      number(body.wastage),
      req.params.id,
    ]
  );
  const rawStock = await findOne(listRawStock, req.params.id);
  await respondWithBootstrap(res, "rawStock", rawStock);
}));

app.delete("/api/raw-stock/:id", asyncHandler(async (req, res) => {
  await exec("DELETE FROM raw_stock WHERE id = ?", [req.params.id]);
  await respondWithBootstrap(res, "rawStock", { id: req.params.id });
}));

app.post("/api/products", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await ensureCategory("Product", body.category);
  const result = await exec(
    "INSERT INTO products (sku, name, category, unit, rate, tax_rate) VALUES (?, ?, ?, ?, ?, ?)",
    [nullableText(body.sku), text(body.name, "Product"), text(body.category), text(body.unit, "kg"), number(body.rate), number(body.taxRate)]
  );
  const product = await findOne(listProducts, result.insertId);
  await respondWithBootstrap(res, "product", product, 201);
}));

app.put("/api/products/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await ensureCategory("Product", body.category);
  await exec(
    "UPDATE products SET sku = ?, name = ?, category = ?, unit = ?, rate = ?, tax_rate = ? WHERE id = ?",
    [nullableText(body.sku), text(body.name, "Product"), text(body.category), text(body.unit, "kg"), number(body.rate), number(body.taxRate), req.params.id]
  );
  const product = await findOne(listProducts, req.params.id);
  await respondWithBootstrap(res, "product", product);
}));

app.delete("/api/products/:id", asyncHandler(async (req, res) => {
  await exec("DELETE FROM products WHERE id = ?", [req.params.id]);
  await respondWithBootstrap(res, "product", { id: req.params.id });
}));

app.post("/api/vendors", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await ensureCategory("Vendor", body.category);
  const result = await exec(
    "INSERT INTO vendors (name, category, contact) VALUES (?, ?, ?)",
    [text(body.name, "Vendor"), text(body.category), text(body.contact)]
  );
  const purchases = await listVendorPurchases();
  const payments = await listVendorPayments();
  const vendor = (await listVendors(purchases, payments)).find((item) => String(item.id) === String(result.insertId));
  await respondWithBootstrap(res, "vendor", vendor, 201);
}));

app.put("/api/vendors/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await ensureCategory("Vendor", body.category);
  await exec(
    "UPDATE vendors SET name = ?, category = ?, contact = ? WHERE id = ?",
    [text(body.name, "Vendor"), text(body.category), text(body.contact), req.params.id]
  );
  const purchases = await listVendorPurchases();
  const payments = await listVendorPayments();
  const vendor = (await listVendors(purchases, payments)).find((item) => String(item.id) === String(req.params.id));
  await respondWithBootstrap(res, "vendor", vendor);
}));

app.delete("/api/vendors/:id", asyncHandler(async (req, res) => {
  await exec("DELETE FROM vendors WHERE id = ?", [req.params.id]);
  await respondWithBootstrap(res, "vendor", { id: req.params.id });
}));

app.post("/api/vendor-purchases", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const amount = number(body.amount, number(body.qty) * number(body.rate));
  await ensureCategory("Raw Material", body.category);
  const material = await materialForInventoryMovement({
    itemName: body.itemName,
    category: body.category,
    unit: body.unit,
    rate: body.rate,
  });
  const result = await exec(
    `INSERT INTO vendor_purchases
      (vendor_id, vendor_name, purchase_date, item_name, category, qty, unit, rate, amount, paid, mode, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.vendorId || null,
      text(body.vendorName, "Vendor"),
      body.purchaseDate || today(),
      text(body.itemName, "Item"),
      text(body.category),
      number(body.qty),
      text(body.unit, "kg"),
      number(body.rate),
      amount,
      number(body.paid),
      text(body.mode, "Cash"),
      nullableText(body.notes),
    ]
  );
  await adjustRawStock(material.id, number(body.qty), { inToday: number(body.qty) });
  const vendorPurchase = (await listVendorPurchases()).find((item) => String(item.id) === String(result.insertId));
  await respondWithBootstrap(res, "vendorPurchase", vendorPurchase, 201);
}));

app.put("/api/vendor-purchases/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const amount = number(body.amount, number(body.qty) * number(body.rate));
  const existing = await findOne(listVendorPurchases, req.params.id);
  if (existing) {
    const previousMaterial = await materialForInventoryMovement(existing);
    await adjustRawStock(previousMaterial.id, -number(existing.qty), { inToday: -number(existing.qty) });
  }
  await ensureCategory("Raw Material", body.category);
  const material = await materialForInventoryMovement({
    itemName: body.itemName,
    category: body.category,
    unit: body.unit,
    rate: body.rate,
  });
  await exec(
    `UPDATE vendor_purchases
     SET vendor_id = ?, vendor_name = ?, purchase_date = ?, item_name = ?, category = ?,
         qty = ?, unit = ?, rate = ?, amount = ?, paid = ?, mode = ?, notes = ?
     WHERE id = ?`,
    [
      body.vendorId || null,
      text(body.vendorName, "Vendor"),
      body.purchaseDate || today(),
      text(body.itemName, "Item"),
      text(body.category),
      number(body.qty),
      text(body.unit, "kg"),
      number(body.rate),
      amount,
      number(body.paid),
      text(body.mode, "Cash"),
      nullableText(body.notes),
      req.params.id,
    ]
  );
  await adjustRawStock(material.id, number(body.qty), { inToday: number(body.qty) });
  const vendorPurchase = (await listVendorPurchases()).find((item) => String(item.id) === String(req.params.id));
  await respondWithBootstrap(res, "vendorPurchase", vendorPurchase);
}));

app.delete("/api/vendor-purchases/:id", asyncHandler(async (req, res) => {
  const existing = await findOne(listVendorPurchases, req.params.id);
  if (existing) {
    const material = await materialForInventoryMovement(existing);
    await adjustRawStock(material.id, -number(existing.qty), { inToday: -number(existing.qty) });
  }
  await exec("DELETE FROM vendor_purchases WHERE id = ?", [req.params.id]);
  await respondWithBootstrap(res, "vendorPurchase", { id: req.params.id });
}));

app.post("/api/inventory-usage", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const material = await materialForUsage({
    materialId: body.materialId,
    materialName: body.materialName || body.name,
    category: body.category,
    unit: body.unit,
  });
  const record = {
    materialId: material.id,
    materialName: material.name,
    category: body.category || material.category,
    usageDate: body.usageDate || body.date || today(),
    usedQty: number(body.usedQty),
    unusedQty: number(body.unusedQty),
    wastageQty: number(body.wastageQty),
    unit: body.unit || material.unit,
    notes: text(body.notes),
  };
  await ensureCategory("Raw Material", record.category);
  const result = await exec(
    `INSERT INTO inventory_usage
      (material_id, material_name, category, usage_date, used_qty, unused_qty, wastage_qty, unit, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.materialId,
      record.materialName,
      text(record.category),
      record.usageDate,
      record.usedQty,
      record.unusedQty,
      record.wastageQty,
      text(record.unit, "kg"),
      nullableText(record.notes),
    ]
  );
  await adjustRawStock(record.materialId, usageStockDelta(record), {
    outToday: record.usedQty,
    wastage: record.wastageQty,
  });
  const usage = await findOne(listInventoryUsage, result.insertId);
  await respondWithBootstrap(res, "inventoryUsage", usage, 201);
}));

app.put("/api/inventory-usage/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const existing = await findOne(listInventoryUsage, req.params.id);
  if (existing) {
    const previousMaterial = await materialForUsage(existing);
    await adjustRawStock(previousMaterial.id, -usageStockDelta(existing), {
      outToday: -number(existing.usedQty),
      wastage: -number(existing.wastageQty),
    });
  }
  const material = await materialForUsage({
    materialId: body.materialId,
    materialName: body.materialName || body.name,
    category: body.category,
    unit: body.unit,
  });
  const record = {
    materialId: material.id,
    materialName: material.name,
    category: body.category || material.category,
    usageDate: body.usageDate || body.date || today(),
    usedQty: number(body.usedQty),
    unusedQty: number(body.unusedQty),
    wastageQty: number(body.wastageQty),
    unit: body.unit || material.unit,
    notes: text(body.notes),
  };
  await ensureCategory("Raw Material", record.category);
  await exec(
    `UPDATE inventory_usage
     SET material_id = ?, material_name = ?, category = ?, usage_date = ?,
         used_qty = ?, unused_qty = ?, wastage_qty = ?, unit = ?, notes = ?
     WHERE id = ?`,
    [
      record.materialId,
      record.materialName,
      text(record.category),
      record.usageDate,
      record.usedQty,
      record.unusedQty,
      record.wastageQty,
      text(record.unit, "kg"),
      nullableText(record.notes),
      req.params.id,
    ]
  );
  await adjustRawStock(record.materialId, usageStockDelta(record), {
    outToday: record.usedQty,
    wastage: record.wastageQty,
  });
  const usage = await findOne(listInventoryUsage, req.params.id);
  await respondWithBootstrap(res, "inventoryUsage", usage);
}));

app.delete("/api/inventory-usage/:id", asyncHandler(async (req, res) => {
  const existing = await findOne(listInventoryUsage, req.params.id);
  if (existing) {
    const material = await materialForUsage(existing);
    await adjustRawStock(material.id, -usageStockDelta(existing), {
      outToday: -number(existing.usedQty),
      wastage: -number(existing.wastageQty),
    });
  }
  await exec("DELETE FROM inventory_usage WHERE id = ?", [req.params.id]);
  await respondWithBootstrap(res, "inventoryUsage", { id: req.params.id });
}));

app.post("/api/vendor-payments", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const vendorName = await vendorNameForPayment(body);
  const result = await exec(
    "INSERT INTO vendor_payments (vendor_id, vendor_name, payment_date, amount, mode, notes) VALUES (?, ?, ?, ?, ?, ?)",
    [
      body.vendorId || null,
      vendorName,
      body.paymentDate || today(),
      number(body.amount),
      text(body.mode, "Cash"),
      nullableText(body.notes),
    ]
  );
  const vendorPayment = (await listVendorPayments()).find((item) => String(item.id) === String(result.insertId));
  await respondWithBootstrap(res, "vendorPayment", vendorPayment, 201);
}));

app.put("/api/vendor-payments/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const vendorName = await vendorNameForPayment(body);
  await exec(
    "UPDATE vendor_payments SET vendor_id = ?, vendor_name = ?, payment_date = ?, amount = ?, mode = ?, notes = ? WHERE id = ?",
    [body.vendorId || null, vendorName, body.paymentDate || today(), number(body.amount), text(body.mode, "Cash"), nullableText(body.notes), req.params.id]
  );
  const vendorPayment = (await listVendorPayments()).find((item) => String(item.id) === String(req.params.id));
  await respondWithBootstrap(res, "vendorPayment", vendorPayment);
}));

app.delete("/api/vendor-payments/:id", asyncHandler(async (req, res) => {
  await exec("DELETE FROM vendor_payments WHERE id = ?", [req.params.id]);
  await respondWithBootstrap(res, "vendorPayment", { id: req.params.id });
}));

app.post("/api/expenses", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await ensureCategory("Expense", body.category);
  const result = await exec(
    "INSERT INTO expenses (expense_date, label, category, amount, mode) VALUES (?, ?, ?, ?, ?)",
    [body.expenseDate || today(), text(body.label, "Expense"), text(body.category), number(body.amount), text(body.mode, "Cash")]
  );
  const expense = (await listExpenses()).find((item) => String(item.id) === String(result.insertId));
  await respondWithBootstrap(res, "expense", expense, 201);
}));

app.put("/api/expenses/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await ensureCategory("Expense", body.category);
  await exec(
    "UPDATE expenses SET expense_date = ?, label = ?, category = ?, amount = ?, mode = ? WHERE id = ?",
    [body.expenseDate || today(), text(body.label, "Expense"), text(body.category), number(body.amount), text(body.mode, "Cash"), req.params.id]
  );
  const expense = (await listExpenses()).find((item) => String(item.id) === String(req.params.id));
  await respondWithBootstrap(res, "expense", expense);
}));

app.delete("/api/expenses/:id", asyncHandler(async (req, res) => {
  await exec("DELETE FROM expenses WHERE id = ?", [req.params.id]);
  await respondWithBootstrap(res, "expense", { id: req.params.id });
}));

app.post("/api/categories", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const categoryType = text(body.type, "Product");
  const categoryName = text(body.name, "Category");
  await exec(
    `INSERT INTO categories (type, name, items, margin)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      items = VALUES(items),
      margin = VALUES(margin)`,
    [categoryType, categoryName, number(body.items), text(body.margin, "New")]
  );
  const category = (await listCategories()).find(
    (item) => item.type.toLowerCase() === categoryType.toLowerCase() && item.name.toLowerCase() === categoryName.toLowerCase()
  );
  await respondWithBootstrap(res, "category", category, 201);
}));

app.put("/api/categories/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await exec(
    "UPDATE categories SET type = ?, name = ?, items = ?, margin = ? WHERE id = ?",
    [text(body.type, "Product"), text(body.name, "Category"), number(body.items), text(body.margin, "New"), req.params.id]
  );
  const category = (await listCategories()).find((item) => String(item.id) === String(req.params.id));
  await respondWithBootstrap(res, "category", category);
}));

app.delete("/api/categories/:id", asyncHandler(async (req, res) => {
  await exec("DELETE FROM categories WHERE id = ?", [req.params.id]);
  await respondWithBootstrap(res, "category", { id: req.params.id });
}));

app.post("/api/users", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const result = await exec(
    "INSERT INTO users (username, password_hash, name, role, status, protected) VALUES (?, ?, ?, ?, ?, ?)",
    [text(body.username), hashPassword(body.password), text(body.name, body.username), text(body.role, "accountant"), text(body.status, "Active"), 0]
  );
  const user = (await listUsers()).find((item) => String(item.id) === String(result.insertId));
  await respondWithBootstrap(res, "user", user, 201);
}));

app.put("/api/users/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const params = [
    text(body.username),
    text(body.name, body.username),
    text(body.role, "accountant"),
    text(body.status, "Active"),
    req.params.id,
  ];
  await exec("UPDATE users SET username = ?, name = ?, role = ?, status = ? WHERE id = ?", params);
  if (body.password) {
    await exec("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword(body.password), req.params.id]);
  }
  const user = (await listUsers()).find((item) => String(item.id) === String(req.params.id));
  await respondWithBootstrap(res, "user", user);
}));

app.delete("/api/users/:id", asyncHandler(async (req, res) => {
  await exec("DELETE FROM users WHERE id = ? AND protected = 0", [req.params.id]);
  await respondWithBootstrap(res, "user", { id: req.params.id });
}));

app.post("/api/permissions", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const roleName = text(body.role || body.roleName, "accountant").toLowerCase();
  const moduleKey = text(body.moduleKey, "operations");
  const moduleLabel = text(body.moduleLabel, moduleKey);
  await exec(
    `INSERT INTO role_permissions
      (role_name, module_key, module_label, can_view, can_add, can_edit, can_delete)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      module_label = VALUES(module_label),
      can_view = VALUES(can_view),
      can_add = VALUES(can_add),
      can_edit = VALUES(can_edit),
      can_delete = VALUES(can_delete)`,
    [
      roleName,
      moduleKey,
      moduleLabel,
      body.canView ? 1 : 0,
      body.canAdd ? 1 : 0,
      body.canEdit ? 1 : 0,
      body.canDelete ? 1 : 0,
    ]
  );
  const permission = (await listPermissions()).find(
    (item) => item.role === roleName && item.moduleKey === moduleKey
  );
  await respondWithBootstrap(res, "permission", permission, 201);
}));

app.post("/api/login", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const rows = await query(
    "SELECT id, username, name, role, status, protected, last_login_at FROM users WHERE username = ? AND password_hash = ? AND status = 'Active' LIMIT 1",
    [text(body.username), hashPassword(body.password)]
  );
  if (!rows.length) {
    res.status(401).json({ message: "Invalid username or password" });
    return;
  }
  await exec("UPDATE users SET last_login_at = NOW() WHERE id = ?", [rows[0].id]);
  const users = await listUsers();
  const user = users.find((item) => String(item.id) === String(rows[0].id)) || mapUser(rows[0]);
  res.json({ user });
}));

app.post("/api/sales-slips", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const products = await listProducts();
  const saleDate = body.saleDate || today();
  const discount = number(body.discount);
  const items = (body.items || [])
    .map((item) => {
      const product = products.find((entry) => String(entry.id) === String(item.productId)) || products.find((entry) => entry.name === item.product);
      if (!product) return null;
      const qty = number(item.qty);
      const total = qty * product.rate;
      return {
        product: product.name,
        productId: product.id,
        qty,
        unit: product.unit,
        rate: product.rate,
        total,
      };
    })
    .filter(Boolean);
  if (!items.length) {
    res.status(400).json({ message: "No matching products found" });
    return;
  }
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = body.taxEnabled ? Math.max(0, subtotal - discount) * 0.05 : number(body.tax);
  const total = Math.max(0, subtotal - discount + tax);
  const countRows = await query("SELECT COUNT(*) AS count FROM sales_slips WHERE sale_date = ?", [saleDate]);
  const billNo = text(body.billNo, `${saleDate}-${String(number(countRows[0]?.count) + 1).padStart(2, "0")}`);
  const result = await exec(
    `INSERT INTO sales_slips (bill_no, sale_date, sale_date_time, subtotal, discount, tax, total, payment_mode, items_json)
     VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
    [billNo, saleDate, subtotal, discount, tax, total, text(body.paymentMode, "Cash"), JSON.stringify(items)]
  );
  const saleSlip = (await listSalesHistory()).find((item) => String(item.id) === String(result.insertId));
  await respondWithBootstrap(res, "saleSlip", saleSlip, 201);
}));

const staticDir = path.join(__dirname, "dist");
app.use(express.static(staticDir));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Server error" });
});

app.listen(port, () => {
  console.log(`Chatru ERP server listening on ${port}`);
});
