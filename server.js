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
    CREATE TABLE IF NOT EXISTS raw_stock (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'General',
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
      category VARCHAR(100) NOT NULL DEFAULT 'General',
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
      category VARCHAR(100) NOT NULL DEFAULT 'General',
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
      category VARCHAR(100) NOT NULL DEFAULT 'General',
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
      category VARCHAR(100) NOT NULL DEFAULT 'General',
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

async function listSalesHistory() {
  const rows = await query("SELECT * FROM sales_slips ORDER BY sale_date DESC, id DESC");
  return rows.map(mapSale);
}

async function getBootstrap() {
  const [employees, rawStock, products, vendorPurchases, vendorPayments, expenses, categories, users, salesHistory] =
    await Promise.all([
      listEmployees(),
      listRawStock(),
      listProducts(),
      listVendorPurchases(),
      listVendorPayments(),
      listExpenses(),
      listCategories(),
      listUsers(),
      listSalesHistory(),
    ]);
  const vendors = await listVendors(vendorPurchases, vendorPayments);
  const todayDate = today();
  const todaySales = salesHistory.filter((sale) => sale.saleDate === todayDate).reduce((sum, sale) => sum + sale.total, 0);
  const todayExpenses = expenses.filter((expense) => expense.expenseDate === todayDate).reduce((sum, expense) => sum + expense.amount, 0);
  const vendorDues = vendors.reduce((sum, vendor) => sum + vendor.pending, 0);

  return {
    dashboard: {
      todaySales,
      todayExpenses,
      presentCount: employees.filter((employee) => employee.status === "Present").length,
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
    vendorPayments,
    expenses,
    categories,
    products,
    employeeAttendance: [],
    employeePayments: [],
    stockHistory: [],
    salesHistory,
    users,
    permissions: [],
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

app.post("/api/raw-stock", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const result = await exec(
    `INSERT INTO raw_stock (name, category, stock, unit, minimum_stock, rate, in_today, out_today, wastage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      text(body.name, "Raw material"),
      text(body.category, "General"),
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
  await exec(
    `UPDATE raw_stock
     SET name = ?, category = ?, stock = ?, unit = ?, minimum_stock = ?, rate = ?, in_today = ?, out_today = ?, wastage = ?
     WHERE id = ?`,
    [
      text(body.name, "Raw material"),
      text(body.category, "General"),
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
  const result = await exec(
    "INSERT INTO products (sku, name, category, unit, rate, tax_rate) VALUES (?, ?, ?, ?, ?, ?)",
    [nullableText(body.sku), text(body.name, "Product"), text(body.category, "General"), text(body.unit, "kg"), number(body.rate), number(body.taxRate)]
  );
  const product = await findOne(listProducts, result.insertId);
  await respondWithBootstrap(res, "product", product, 201);
}));

app.put("/api/products/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await exec(
    "UPDATE products SET sku = ?, name = ?, category = ?, unit = ?, rate = ?, tax_rate = ? WHERE id = ?",
    [nullableText(body.sku), text(body.name, "Product"), text(body.category, "General"), text(body.unit, "kg"), number(body.rate), number(body.taxRate), req.params.id]
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
  const result = await exec(
    "INSERT INTO vendors (name, category, contact) VALUES (?, ?, ?)",
    [text(body.name, "Vendor"), text(body.category, "General"), text(body.contact)]
  );
  const purchases = await listVendorPurchases();
  const payments = await listVendorPayments();
  const vendor = (await listVendors(purchases, payments)).find((item) => String(item.id) === String(result.insertId));
  await respondWithBootstrap(res, "vendor", vendor, 201);
}));

app.put("/api/vendors/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await exec(
    "UPDATE vendors SET name = ?, category = ?, contact = ? WHERE id = ?",
    [text(body.name, "Vendor"), text(body.category, "General"), text(body.contact), req.params.id]
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
  const result = await exec(
    `INSERT INTO vendor_purchases
      (vendor_id, vendor_name, purchase_date, item_name, category, qty, unit, rate, amount, paid, mode, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.vendorId || null,
      text(body.vendorName, "Vendor"),
      body.purchaseDate || today(),
      text(body.itemName, "Item"),
      text(body.category, "General"),
      number(body.qty),
      text(body.unit, "kg"),
      number(body.rate),
      amount,
      number(body.paid),
      text(body.mode, "Cash"),
      nullableText(body.notes),
    ]
  );
  const vendorPurchase = (await listVendorPurchases()).find((item) => String(item.id) === String(result.insertId));
  await respondWithBootstrap(res, "vendorPurchase", vendorPurchase, 201);
}));

app.put("/api/vendor-purchases/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  const amount = number(body.amount, number(body.qty) * number(body.rate));
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
      text(body.category, "General"),
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
  const vendorPurchase = (await listVendorPurchases()).find((item) => String(item.id) === String(req.params.id));
  await respondWithBootstrap(res, "vendorPurchase", vendorPurchase);
}));

app.delete("/api/vendor-purchases/:id", asyncHandler(async (req, res) => {
  await exec("DELETE FROM vendor_purchases WHERE id = ?", [req.params.id]);
  await respondWithBootstrap(res, "vendorPurchase", { id: req.params.id });
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
  const result = await exec(
    "INSERT INTO expenses (expense_date, label, category, amount, mode) VALUES (?, ?, ?, ?, ?)",
    [body.expenseDate || today(), text(body.label, "Expense"), text(body.category, "General"), number(body.amount), text(body.mode, "Cash")]
  );
  const expense = (await listExpenses()).find((item) => String(item.id) === String(result.insertId));
  await respondWithBootstrap(res, "expense", expense, 201);
}));

app.put("/api/expenses/:id", asyncHandler(async (req, res) => {
  const body = req.body || {};
  await exec(
    "UPDATE expenses SET expense_date = ?, label = ?, category = ?, amount = ?, mode = ? WHERE id = ?",
    [body.expenseDate || today(), text(body.label, "Expense"), text(body.category, "General"), number(body.amount), text(body.mode, "Cash"), req.params.id]
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
  const result = await exec(
    "INSERT INTO categories (type, name, items, margin) VALUES (?, ?, ?, ?)",
    [text(body.type, "Product"), text(body.name, "Category"), number(body.items), text(body.margin, "New")]
  );
  const category = (await listCategories()).find((item) => String(item.id) === String(result.insertId));
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
  res.json({ user: mapUser(rows[0]) });
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
