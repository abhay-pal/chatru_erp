# Chatru Halwai ERP

Fresh rebuild of the Chatru Halwai ERP front end.

## Included

- Chatru Halwai cream/gold theme with dark sidebar
- Login: `admin` / `admin123`
- Operations and finance dashboards
- Sales Slip with bill preview, print support, and saved bill history
- Add Employee form wired to the Chatru API, with browser fallback
- Inventory, Vendor Payment, Daily Vendors, Employees, Attendance, Vendors, Expenses, Categories, and Users
- Shop workflow navigation excludes the manufacturing tab

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Hostinger Deployment

Use the Node.js deployment for `chatruhalwai.online`.

- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm start`
- Root directory: `./`
- Output directory: `dist`

Set these environment variables in Hostinger before redeploying:

```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u755553180_chatru_erp
DB_USER=u755553180_chatru_erp
DB_PASSWORD=your_mysql_password
```

The server creates the required MySQL tables automatically on first start. It does not insert demo business data. `PORT` is optional for local testing; Hostinger can provide it automatically.
