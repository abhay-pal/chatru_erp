export const adminUser = {
  username: "admin",
  password: "admin123",
  name: "Admin",
  role: "Admin",
};

export const navGroups = [
  {
    title: "Dashboards",
    items: [
      { key: "operations", label: "Operations", icon: "LayoutDashboard" },
      { key: "finance", label: "Finance", icon: "BadgeIndianRupee" },
    ],
  },
  {
    title: "Shop Workflow",
    items: [
      { key: "sales-slip", label: "Sales Slip", icon: "ReceiptIndianRupee" },
      { key: "inventory", label: "Inventory", icon: "PackageSearch" },
      { key: "vendor-payment", label: "Vendor Payment", icon: "WalletCards" },
      { key: "daily-vendors", label: "Daily Vendors", icon: "Truck" },
    ],
  },
  {
    title: "Masters",
    items: [
      { key: "employees", label: "Employees", icon: "UsersRound" },
      { key: "attendance", label: "Attendance", icon: "CalendarCheck2" },
      { key: "vendors", label: "Vendors", icon: "Handshake" },
      { key: "expenses", label: "Expenses", icon: "NotebookTabs" },
      { key: "categories", label: "Categories", icon: "Tags" },
      { key: "users", label: "Users", icon: "ShieldCheck" },
    ],
  },
];

export const products = [
  { name: "Desi Ghee Jalebi", category: "Breakfast", rate: 420, unit: "kg" },
  { name: "Hot Samosa", category: "Breakfast", rate: 18, unit: "pc" },
  { name: "Assorted Gift Box", category: "Gifting", rate: 850, unit: "pc" },
  { name: "Aloo Bhujia", category: "Namkeen", rate: 340, unit: "kg" },
  { name: "Kaju Katli", category: "Sweets", rate: 980, unit: "kg" },
  { name: "Motichoor Laddu", category: "Sweets", rate: 520, unit: "tray" },
];

export const materials = [
  { name: "1 kg Gift Box", category: "Packaging", stock: 42, unit: "pcs", min: 120 },
  { name: "A2 Desi Ghee", category: "Dairy", stock: 18, unit: "kg", min: 35 },
  { name: "Besan", category: "Grocery", stock: 126, unit: "kg", min: 60 },
  { name: "Dry Fruit Mix", category: "Dry Fruits", stock: 24, unit: "kg", min: 30 },
];

export const vendors = [
  { name: "Bansal Dry Fruits", category: "Dry Fruits", pending: 66500, cycle: "Weekly" },
  { name: "Garg Packaging", category: "Packaging", pending: 18200, cycle: "Weekly" },
  { name: "Mitra Gas Agency", category: "Gas", pending: 2200, cycle: "On demand" },
  { name: "Shri Krishna Dairy", category: "Dairy", pending: 42000, cycle: "Daily" },
];

export const employees = [
  ["Suresh Ji", "Karigar", 26000, "-", "2026-05-16"],
  ["Ramfal Ji", "Karigar", 25500, "-", "2026-05-16"],
  ["Jaipal Ji", "Karigar", 25500, "-", "2026-05-16"],
  ["Kuldeep kala", "Karigar", 24000, "-", "2026-05-16"],
  ["Bittu", "Karigar", 23000, "-", "2026-05-16"],
  ["Manoj", "Karigar", 23000, "-", "2026-05-16"],
  ["Shobhit B", "Karigar", 22500, "-", "2026-05-16"],
  ["Sachin Bhatura", "Karigar", 22000, "-", "2026-05-16"],
  ["Mukesh", "Karigar", 22000, "-", "2026-05-16"],
  ["Raju janakpuri", "Karigar", 21000, "-", "2026-05-16"],
  ["Neta Ji", "Manager", 32000, "-", "2026-05-16"],
  ["Sewak", "Manager", 30000, "-", "2026-05-16"],
  ["Pradeep Kumar", "Munim", 28000, "-", "2026-05-16"],
  ["Ajay Rana", "Salesman", 23000, "-", "2026-05-16"],
  ["Neeraj", "Chai", 18000, "-", "2026-05-16"],
  ["Ritesh", "Samosa", 21000, "-", "2026-05-16"],
  ["Raju Allu", "Cutter", 18500, "-", "2026-05-16"],
  ["Amit Allu", "Cutter", 18500, "-", "2026-05-16"],
  ["Bhola", "Helper", 17000, "-", "2026-05-16"],
  ["Manjeet", "Helper", 17000, "-", "2026-05-16"],
  ["Sachin Lambu", "Helper", 17000, "-", "2026-05-16"],
  ["Karan Lucknow", "Helper", 17000, "-", "2026-05-16"],
  ["Rohan", "Service", 18000, "-", "2026-05-16"],
  ["Ankur Toppi", "Helper", 17000, "-", "2026-05-16"],
  ["Harsh", "Service", 18000, "-", "2026-05-16"],
  ["Raj Safai", "Safai", 16000, "-", "2026-05-16"],
  ["Pankaj", "Head Halwai", 42000, "+91 98120 10101", "2024-01-01"],
  ["Sunny", "Counter Cashier", 26000, "+91 98120 10102", "2024-03-10"],
  ["Neeraj Pal", "Packing Staff", 21000, "+91 98120 10103", "2025-02-18"],
  ["Sonu", "Delivery Support", 19000, "+91 98120 10104", "2025-08-01"],
  ["Bobby", "Kariger", 24000, "-", "2026-05-13"],
].map(([name, role, salary, contact, joining], index) => ({
  id: `EMP-${String(index + 1).padStart(3, "0")}`,
  name,
  role,
  salary,
  contact,
  joining,
  address: "-",
  aadhaar: "-",
}));

export const expenses = [
  { id: "EXP-001", date: "2026-05-04", title: "Electricity advance", category: "Electricity", mode: "Bank", amount: 8400 },
  { id: "EXP-002", date: "2026-05-04", title: "Diesel for delivery", category: "Fuel", mode: "Cash", amount: 2200 },
  { id: "EXP-003", date: "2026-05-04", title: "Staff food", category: "Staff Food", mode: "Cash", amount: 1650 },
  { id: "EXP-004", date: "2026-05-04", title: "Packaging rolls", category: "Packaging", mode: "UPI", amount: 3800 },
];

export const dailyPurchases = [
  {
    id: "PUR-001",
    date: "2026-05-04",
    vendor: "Shri Krishna Dairy",
    material: "A2 Desi Ghee",
    category: "Dairy",
    qty: 12,
    unit: "kg",
    rate: 980,
    paid: 6000,
    mode: "UPI",
    notes: "Morning delivery",
  },
  {
    id: "PUR-002",
    date: "2026-05-04",
    vendor: "Garg Packaging",
    material: "1 kg Gift Box",
    category: "Packaging",
    qty: 80,
    unit: "pcs",
    rate: 38,
    paid: 0,
    mode: "Cash",
    notes: "Pending",
  },
];

export const categories = [
  ["Product", "Breakfast", 11, "31%"],
  ["Product", "Gifting", 16, "35%"],
  ["Product", "Namkeen", 18, "22%"],
  ["Product", "Sweets", 42, "28%"],
  ["Vendor", "Dairy", 4, "Daily"],
  ["Vendor", "Dry Fruits", 6, "Weekly"],
  ["Vendor", "Gas", 2, "On demand"],
  ["Vendor", "Packaging", 5, "Weekly"],
  ["Expense", "Electricity", 1, "Monthly"],
  ["Expense", "Fuel", 3, "Daily"],
  ["Expense", "Rent", 1, "Monthly"],
  ["Expense", "Staff Food", 2, "Daily"],
].map(([type, name, count, cadence]) => ({ type, name, count, cadence }));

export const users = [
  { username: "admin", name: "Admin", role: "admin", status: "Active", protected: true },
  { username: "accountant", name: "Accountant", role: "accountant", status: "Active", protected: false },
];
