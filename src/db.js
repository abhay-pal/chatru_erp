const DB_NAME = "chatru-halwai-erp-db";
const DB_VERSION = 1;
const SALES_STORE = "sales_bills";
const FALLBACK_KEY = "chatru-halwai-sales-bills";

function fallbackRead() {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]");
  } catch {
    return [];
  }
}

function fallbackWrite(records) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(records));
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

export async function listSalesBills() {
  try {
    const db = await openDb();
    const transaction = db.transaction(SALES_STORE, "readonly");
    const request = transaction.objectStore(SALES_STORE).getAll();
    const records = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return records.sort((a, b) => `${b.date}${b.billNo}`.localeCompare(`${a.date}${a.billNo}`));
  } catch {
    return fallbackRead();
  }
}

export async function saveSalesBill(bill) {
  try {
    const db = await openDb();
    const transaction = db.transaction(SALES_STORE, "readwrite");
    transaction.objectStore(SALES_STORE).put(bill);
    await completeTransaction(transaction);
    db.close();
    return bill;
  } catch {
    const records = fallbackRead().filter((record) => record.billNo !== bill.billNo);
    fallbackWrite([bill, ...records]);
    return bill;
  }
}
