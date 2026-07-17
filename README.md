# Chatru ERP

Fresh rebuild of the Chatru ERP front end.

## Included

- Login and session persistence
- Centralized RBAC permissions
- Protected ERP shell
- Finance dashboard
- Operations dashboard
- Employees, inventory, vendors, sales, expenses, categories, and users modules
- Search, status filters, CSV export, and add-record modal
- LocalStorage-backed demo data

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@chatru.com | admin123 |
| Finance Manager | finance@chatru.com | finance123 |
| Operations Manager | ops@chatru.com | ops123 |
| Staff | staff@chatru.com | staff123 |

## Local Development

```bash
pnpm install
pnpm dev
```

## Production Build

```bash
pnpm build
```
