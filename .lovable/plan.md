

# Gold & Jewelry Store Management Module — Implementation Plan

## Overview
Build a complete vertical business module for Gold & Jewelry stores, following the same pattern as the Auto Parts module (activity_type gating via `useAutoPartsAccess` pattern). The module adds gold-specific inventory tracking, purchase/sales invoices, daily price management, and specialized reports.

## Database Schema (6 new tables + 1 alter)

### 1. `gold_price_settings` — Daily gold prices per karat
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK | RLS via `is_company_owner` |
| price_date | date | unique per company+karat |
| karat | text | '18k','21k','22k','24k' |
| price_per_gram | numeric | Daily market price |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 2. `gold_items` — Gold inventory items (extends products concept)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK | |
| product_id | uuid FK → products | Links to standard product for stock tracking |
| karat | text | '18k','21k','22k','24k' |
| weight_grams | numeric | Weight in grams |
| item_type | text | 'ring','necklace','bracelet','earring','chain','pendant','set','other' |
| making_cost | numeric | Manufacturing cost |
| stone_cost | numeric | Default 0, cost of stones |
| gold_cost | numeric | Calculated: weight × price_per_gram |
| barcode | text | |
| is_active | boolean | Default true |
| created_at / updated_at | timestamptz | |

### 3. `gold_purchase_invoices` — Gold purchase transactions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id, branch_id | uuid | |
| invoice_number | text | Auto-generated |
| invoice_date | date | |
| contact_id | uuid FK → contacts | Supplier |
| total_weight | numeric | Sum of items |
| total_amount | numeric | |
| journal_entry_id | uuid FK → journal_entries | Auto-generated JE |
| status | text | draft/confirmed |
| notes | text | |
| created_by | uuid | |
| created_at | timestamptz | |

### 4. `gold_purchase_invoice_items`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| invoice_id | uuid FK | |
| gold_item_id | uuid FK → gold_items | |
| weight_grams | numeric | |
| karat | text | |
| price_per_gram | numeric | |
| making_cost | numeric | |
| total | numeric | Calculated |

### 5. `gold_sales_invoices` — Gold sales transactions
Same structure as purchase invoices but for sales, with `customer` contact_id.

### 6. `gold_sales_invoice_items`
Same as purchase items but with selling price fields.

### Alter existing
- Add `"Gold & Jewelry Shops"` to `business_verticals` table (data insert, not migration).

## RLS Policies
All 6 tables: `is_company_owner(company_id)` for ALL + SELECT (matching existing pattern). Child tables (items) use EXISTS join to parent.

## New Hook: `useGoldAccess`
```typescript
// Same pattern as useAutoPartsAccess
const isGoldCompany = company?.activity_type === "Gold & Jewelry Shops";
```

## Sidebar Integration
Add a new `goldMenuGroup` in `ClientLayout.tsx` (same pattern as `autoPartsMenuGroup`), inserted conditionally when `isGoldCompany` is true. Menu items:
- Gold Items (`/client/gold/items`)
- Gold Purchases (`/client/gold/purchases`)
- Gold Sales (`/client/gold/sales`)
- Gold Price Settings (`/client/gold/prices`)
- Gold Reports (`/client/gold/reports`)

## Screens to Build (8 pages)

### 1. `GoldItems.tsx` — Gold Items Management (list)
- Full-page table with stat cards (total items, total weight, total value by karat)
- Columns: Name, Karat, Weight, Item Type, Making Cost, Gold Cost, Total Value, Barcode
- Filters: by karat, item type, search by name/barcode
- Actions: Add New, Edit, View

### 2. `CreateGoldItem.tsx` — Add/Edit Gold Item (full page form)
- Fields: Name (ar/en), Karat (select), Weight, Item Type (select), Making Cost, Stone Cost, Barcode
- Auto-calculates gold cost from latest `gold_price_settings` for selected karat
- Creates a linked `products` record for stock movement integration
- Selling Price Formula display: `(Weight × Gold Price) + Making Cost + Stone Cost`

### 3. `GoldPurchases.tsx` — Gold Purchase Invoices (list)
- Stat cards: Total purchases, total weight, total value
- Table: Invoice#, Date, Supplier, Items Count, Total Weight, Total Amount, Status
- Actions: Create, View, Confirm

### 4. `CreateGoldPurchase.tsx` — Create Gold Purchase Invoice (full page)
- Header: Branch selector, Supplier (contact), Date, Invoice#
- Items table: Select gold item, weight, karat (auto-filled), price per gram (auto from settings), making cost, line total
- Footer: Total weight, Total amount
- On confirm: Creates journal entry (Debit: Inventory/Gold, Credit: Supplier Payable), updates stock via `stock_movements`

### 5. `GoldSales.tsx` — Gold Sales Invoices (list)
- Same pattern as purchases list but for sales

### 6. `CreateGoldSale.tsx` — Create Gold Sales Invoice (full page)
- Header: Branch, Customer, Date
- Items: Select gold item, weight, gold price, making cost, total
- On confirm: Creates journal entry (Debit: Customer Receivable / Cash, Credit: Revenue + Inventory COGS entries)

### 7. `GoldPriceSettings.tsx` — Daily Gold Price Management
- Date picker + 4 karat price inputs (18k, 21k, 22k, 24k)
- Table of historical prices with date, karat, price
- Auto-calculate lower karats from 24k price (optional ratio)

### 8. `GoldReports.tsx` — Gold Reports (tabs)
- **Stock by Weight**: Group by karat, show total weight, total value, item count
- **Profit per Item**: Sales price - (gold cost + making cost) per sold item
- **Daily Sales**: Aggregated sales by date
- **Making Cost Profit**: Revenue from making cost vs total revenue breakdown

## Routing (in App.tsx)
```
/client/gold/items
/client/gold/items/new
/client/gold/items/:id/edit
/client/gold/purchases
/client/gold/purchases/new
/client/gold/sales
/client/gold/sales/new
/client/gold/prices
/client/gold/reports
```

## Journal Entry Integration
- **Purchase Confirm**: Debit Gold Inventory account (code 1131 or branch-specific), Credit Accounts Payable (code 211)
- **Sales Confirm**: Debit Cash/Receivable (111/1121), Credit Sales Revenue (411) + Debit COGS (511), Credit Gold Inventory (1131)
- Uses existing `journal_entries` and `journal_entry_lines` tables
- All JE creation happens server-side via new RPCs: `confirm_gold_purchase` and `confirm_gold_sale`

## RPCs to Create (2 atomic functions)
1. **`confirm_gold_purchase`**: Validates, creates JE, inserts stock_movements (type: 'purchase'), updates product stock
2. **`confirm_gold_sale`**: Validates stock availability, creates dual JE (revenue + COGS), inserts stock_movements (type: 'sale'), updates product stock

## i18n
Add gold-related keys to `ar.json` and `en.json` for all labels.

## Execution Order
1. Database: Create 6 tables + RLS + insert business_vertical + 2 RPCs
2. Hook: `useGoldAccess.ts`
3. Screens: GoldPriceSettings → GoldItems + CreateGoldItem → GoldPurchases + CreateGoldPurchase → GoldSales + CreateGoldSale → GoldReports
4. Integration: ClientLayout sidebar + App.tsx routes
5. i18n keys

## Files to Create/Edit
**New files (10):**
- `src/hooks/useGoldAccess.ts`
- `src/pages/client/gold/GoldItems.tsx`
- `src/pages/client/gold/CreateGoldItem.tsx`
- `src/pages/client/gold/GoldPurchases.tsx`
- `src/pages/client/gold/CreateGoldPurchase.tsx`
- `src/pages/client/gold/GoldSales.tsx`
- `src/pages/client/gold/CreateGoldSale.tsx`
- `src/pages/client/gold/GoldPriceSettings.tsx`
- `src/pages/client/gold/GoldReports.tsx`

**Edit files (4):**
- `src/App.tsx` — add routes
- `src/components/client/ClientLayout.tsx` — add gold sidebar menu
- `src/i18n/locales/ar.json` — gold keys
- `src/i18n/locales/en.json` — gold keys

