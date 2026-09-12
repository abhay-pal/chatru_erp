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
      { key: "inventory-usage", label: "Inventory Usage", icon: "PackageSearch" },
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
