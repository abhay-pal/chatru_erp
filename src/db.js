const DB_NAME = "chatru-halwai-erp-db";
const DB_VERSION = 2;
const SALES_STORE = "sales_bills";
const EMPLOYEE_STORE = "employees";
const SALES_FALLBACK_KEY = "chatru-halwai-sales-bills";
const EMPLOYEE_FALLBACK_KEY = "chatru-halwai-employees";
const LIVE_API_BASE = import.meta.env.VITE_CHATRU_API_BASE || "https://chatru.chatruhalwai.online";
const LIVE_USER_ID = import.meta.env.VITE_CHATRU_USER_ID || "1";

function fallbackRead(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function fallbackWrite(key, records) {
  localStorage.setItem(key, JSON.stringify(records));
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SALES_STORE)) {
        const store = db.createObjectStore(SALES_STORE, { keyPath: "billNo" });
        store.createIndex("date", "date", { unique: false });
      }
      if (!db.objectStoreNames.contains(EMPLOYEE_STORE)) {
        const store = db.createObjectStore(EMPLOYEE_STORE, { keyPath: "id" });
        store.createIndex("name", "name", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function completeTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function listLocal(storeName, fallbackKey) {
  try {
    const db = await openDb();
    const transaction = db.transaction(storeName, "readonly");
    const records = await requestToPromise(transaction.objectStore(storeName).getAll());
    db.close();
    return records || [];
  } catch {
    return fallbackRead(fallbackKey);
  }
}

async function putLocal(storeName, fallbackKey, record, keyName) {
  try {
    const db = await openDb();
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(record);
    await completeTransaction(transaction);
    db.close();
  } catch {
    const keyValue = record[keyName];
    const records = fallbackRead(fallbackKey).filter((item) => item[keyName] !== keyValue);
    fallbackWrite(fallbackKey, [record, ...records]);
  }
}

async function replaceLocal(storeName, fallbackKey, records) {
  try {
    const db = await openDb();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.clear();
    records.forEach((record) => store.put(record));
    await completeTransaction(transaction);
    db.close();
  } catch {
    fallbackWrite(fallbackKey, records);
  }
}

async function apiRequest(path, { method = "GET", body } = {}) {
  const headers = {
    "Content-Type": "application/json",
    "x-user-id": String(LIVE_USER_ID),
  };
  const response = await fetch(`${LIVE_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `API returned ${response.status}`);
  }

  return data;
}

function sortSales(records) {
  return records.sort((a, b) => `${b.date}${b.billNo}`.localeCompare(`${a.date}${a.billNo}`));
}

function normalizeSalesRecord(record) {
  const itemText = typeof record.items === "string" ? record.items : "";
  return {
    billNo: record.billNo || `SALE-${record.id}`,
    date: record.saleDate || record.date,
    mode: record.paymentMode || record.mode || "Cash",
    items: Array.isArray(record.items)
      ? record.items
      : itemText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((product) => ({ product })),
    subtotal: Number(record.subtotal || 0),
    discount: Number(record.discount || 0),
    tax: Number(record.tax || 0),
    total: Number(record.total || 0),
    createdAt: record.saleDateTime || record.createdAt || new Date().toISOString(),
  };
}

function toSalesPayload(bill, products) {
  const items = bill.items
    .map((item) => {
      const product = products.find((entry) => entry.name === item.product);
      return product ? { productId: product.id, qty: Number(item.qty || 0) } : null;
    })
    .filter(Boolean);

  if (!items.length) {
    throw new Error("No matching live products found");
  }

  return {
    items,
    discount: Number(bill.discount || 0),
    taxEnabled: Number(bill.tax || 0) > 0,
    paymentMode: bill.mode || "Cash",
  };
}

function toEmployeePayload(employee) {
  return {
    name: employee.name,
    role: employee.role,
    phone: employee.phone || (employee.contact === "-" ? "" : employee.contact) || "",
    address: employee.address === "-" ? "" : employee.address || "",
    aadhaarCard: employee.aadhaarCard || (employee.aadhaar === "-" ? "" : employee.aadhaar) || "",
    joiningDate: employee.joiningDate || employee.joining,
    salary: Number(employee.salary || 0),
    shiftStart: employee.shiftStart || "09:00:00",
    shiftEnd: employee.shiftEnd || "21:00:00",
  };
}

export async function loadBusinessData() {
  return apiRequest("/api/bootstrap");
}

export async function createBusinessRecord(path, record) {
  try {
    const result = await apiRequest(path, { method: "POST", body: record });
    return { record: result.record || result.item || result, bootstrap: result.bootstrap, source: "live" };
  } catch {
    return { record, bootstrap: null, source: "local" };
  }
}

export async function updateBusinessRecord(path, record) {
  try {
    const result = await apiRequest(path, { method: "PUT", body: record });
    return { record: result.record || result.item || result, bootstrap: result.bootstrap, source: "live" };
  } catch {
    return { record, bootstrap: null, source: "local" };
  }
}

export async function deleteBusinessRecord(path) {
  try {
    const result = await apiRequest(path, { method: "DELETE" });
    return { record: result?.record || result?.item || result, bootstrap: result?.bootstrap, source: "live" };
  } catch {
    return { record: null, bootstrap: null, source: "local" };
  }
}

export async function listSalesBills() {
  try {
    const bootstrap = await apiRequest("/api/bootstrap");
    const records = (bootstrap.salesHistory || []).map(normalizeSalesRecord);
    await replaceLocal(SALES_STORE, SALES_FALLBACK_KEY, records);
    return sortSales(records);
  } catch {
    return sortSales(await listLocal(SALES_STORE, SALES_FALLBACK_KEY));
  }
}

export async function saveSalesBill(bill) {
  try {
    const bootstrap = await apiRequest("/api/bootstrap");
    const payload = toSalesPayload(bill, bootstrap.products || []);
    const result = await apiRequest("/api/sales-slips", { method: "POST", body: payload });
    const records = (result.bootstrap?.salesHistory || []).map(normalizeSalesRecord);
    if (records.length) {
      await replaceLocal(SALES_STORE, SALES_FALLBACK_KEY, records);
    } else {
      await putLocal(SALES_STORE, SALES_FALLBACK_KEY, bill, "billNo");
    }
    return { record: bill, source: "live" };
  } catch {
    await putLocal(SALES_STORE, SALES_FALLBACK_KEY, bill, "billNo");
    return { record: bill, source: "local" };
  }
}

export async function listEmployees(seedEmployees = []) {
  try {
    const bootstrap = await apiRequest("/api/bootstrap");
    const records = bootstrap.employees || [];
    await replaceLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY, records);
    return records;
  } catch {
    const localRecords = await listLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY);
    if (localRecords.length) {
      return localRecords;
    }
    await replaceLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY, seedEmployees);
    return seedEmployees;
  }
}

export async function saveEmployee(employee) {
  try {
    const result = await apiRequest("/api/employees", {
      method: "POST",
      body: toEmployeePayload(employee),
    });
    const record = result.employee || result.record || result;
    const records = result.bootstrap?.employees || [];
    if (records.length) {
      await replaceLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY, records);
    } else {
      await putLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY, record, "id");
    }
    return { record, source: "live" };
  } catch {
    const record = employee.id ? employee : { ...employee, id: `EMP-${Date.now()}` };
    await putLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY, record, "id");
    return { record, source: "local" };
  }
}

export async function updateEmployeeRecord(employee) {
  try {
    const result = await apiRequest(`/api/employees/${employee.id}`, {
      method: "PUT",
      body: toEmployeePayload(employee),
    });
    const record = result.employee || result.record || result;
    const records = result.bootstrap?.employees || [];
    if (records.length) {
      await replaceLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY, records);
    } else {
      await putLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY, record, "id");
    }
    return { record, source: "live", bootstrap: result.bootstrap };
  } catch {
    await putLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY, employee, "id");
    return { record: employee, source: "local" };
  }
}

export async function deleteEmployeeRecord(employeeId) {
  try {
    const result = await apiRequest(`/api/employees/${employeeId}`, { method: "DELETE" });
    const records = result.bootstrap?.employees || [];
    if (records.length) {
      await replaceLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY, records);
    }
    return { id: String(employeeId), source: "live", bootstrap: result.bootstrap };
  } catch {
    const records = await listLocal(EMPLOYEE_STORE, EMPLOYEE_FALLBACK_KEY);
    await replaceLocal(
      EMPLOYEE_STORE,
      EMPLOYEE_FALLBACK_KEY,
      records.filter((employee) => String(employee.id) !== String(employeeId))
    );
    return { id: String(employeeId), source: "local" };
  }
}
