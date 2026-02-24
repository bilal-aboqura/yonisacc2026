
# Unified Table Styling Across the Platform

## Overview
Apply the professional DataTable design system (already used in Customers, Vendors, Sales, Purchases, Quotes, Purchase Orders) to all remaining 14 pages that still use raw HTML tables.

## Strategy
Pages fall into two categories:

### Category A: Simple list tables -- migrate to DataTable component
These pages have standard list data with actions and can directly use the reusable `DataTable` component:

1. **ClientJournal.tsx** - Journal entries (View/Edit/Print/Delete actions, status badges)
2. **OperationsLog.tsx** - Operations log (tabs filtering kept outside DataTable, table content migrated)
3. **CostCenters.tsx** - Cost centers (View/Edit/Delete actions)
4. **OwnerMessages.tsx** - Contact messages (View action, read/unread badge)
5. **OwnerActivities.tsx** - Verticals management (Edit/Toggle actions)
6. **OwnerPlans.tsx** - Plans management
7. **OwnerAuditLogs.tsx** - Audit logs (read-only, status badges)
8. **OwnerSubscribers.tsx** - Subscribers (complex actions kept via DataTable actions prop)
9. **OwnerSubscriptions.tsx** - Subscriptions management
10. **autoparts/CarBrands.tsx** - Car brands list
11. **autoparts/CarModels.tsx** - Car models list
12. **autoparts/PartsCatalog.tsx** - Parts catalog

### Category B: Specialized financial tables -- apply visual styling only
These pages have unique structures (hierarchical rows, totals rows, multi-level headers, opening balance rows) that don't fit the generic DataTable. They will receive the same visual styling (zebra striping, hover effects, rounded card, header background) applied directly:

1. **reports/TrialBalance.tsx** - Has multi-row headers (rowSpan/colSpan), tree-indented rows, totals row
2. **reports/CashFlow.tsx** - Has two separate tables (inflows/outflows) with totals rows
3. **GeneralLedger.tsx** - Has opening balance row, running totals, special row styling

## Technical Details

### Category A changes (per page):
- Replace `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` imports with `DataTable, StatusBadge` from `data-table`
- Define `columns` array with proper `numeric`, `align`, `width` settings
- Define `actions` array with View/Edit/Delete handlers
- Configure `onSearch`, `emptyState`, `createButton` props
- Remove manual search Input, Card wrapper, loading spinner (all handled by DataTable)

### Category B changes (TrialBalance, CashFlow, GeneralLedger):
- Wrap tables in `rounded-2xl shadow-sm border-border/60` Card
- Add `bg-muted/60 dark:bg-muted/30` to table headers
- Add zebra striping: `rowIdx % 2 === 1 && "bg-muted/20"`
- Add hover: `hover:bg-primary/[0.03]`
- Standardize cell padding to `px-4 py-3.5`
- Add `border-b border-border/30` to cells
- Wrap table in `overflow-auto rounded-lg border border-border/50`

### Special handling:
- **OperationsLog.tsx**: Keep the Tabs component for filtering, but render DataTable inside each tab content
- **ClientJournal.tsx**: Keep the Print action as a custom action in the dropdown; keep PermissionGuard wrapping for edit/delete
- **OwnerSubscribers.tsx/OwnerSubscriptions.tsx**: These are complex pages (680/532 lines) with dialogs, sheets, and custom actions -- migrate the table portion to DataTable while keeping all modal/dialog logic intact

## Files to Edit (15 total)

1. `src/pages/client/ClientJournal.tsx`
2. `src/pages/client/OperationsLog.tsx`
3. `src/pages/client/CostCenters.tsx`
4. `src/pages/client/GeneralLedger.tsx`
5. `src/pages/client/reports/TrialBalance.tsx`
6. `src/pages/client/reports/CashFlow.tsx`
7. `src/pages/client/autoparts/CarBrands.tsx`
8. `src/pages/client/autoparts/CarModels.tsx`
9. `src/pages/client/autoparts/PartsCatalog.tsx`
10. `src/pages/owner/OwnerSubscribers.tsx`
11. `src/pages/owner/OwnerSubscriptions.tsx`
12. `src/pages/owner/OwnerAuditLogs.tsx`
13. `src/pages/owner/OwnerMessages.tsx`
14. `src/pages/owner/OwnerActivities.tsx`
15. `src/pages/owner/OwnerPlans.tsx`

## Result
- All tables across the platform will have consistent SaaS-level styling
- Zebra striping, hover effects, rounded cards, proper alignment
- RTL-optimized with numeric columns aligned correctly
- Mobile-responsive card layout on small screens (via DataTable)
- Unified action dropdown pattern
- Search, pagination, and empty states standardized
