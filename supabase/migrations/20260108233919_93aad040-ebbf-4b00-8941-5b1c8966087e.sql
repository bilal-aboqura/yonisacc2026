-- 1. Stock Movements Table (حركات المخزون)
CREATE TABLE public.stock_movements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    movement_type TEXT NOT NULL, -- 'in', 'out', 'transfer', 'adjustment'
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC DEFAULT 0,
    reference_type TEXT, -- 'invoice', 'purchase', 'transfer', 'adjustment'
    reference_id UUID,
    from_warehouse_id UUID REFERENCES public.warehouses(id),
    notes TEXT,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Invoice Payments Table (سجل المدفوعات)
CREATE TABLE public.invoice_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash', -- 'cash', 'bank_transfer', 'check', 'credit_card'
    reference_number TEXT,
    bank_account_id UUID,
    treasury_transaction_id UUID REFERENCES public.treasury_transactions(id),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Bank Accounts Table (الحسابات البنكية)
CREATE TABLE public.bank_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id), -- Link to chart of accounts
    bank_name TEXT NOT NULL,
    bank_name_en TEXT,
    account_number TEXT,
    iban TEXT,
    swift_code TEXT,
    branch_name TEXT,
    currency TEXT DEFAULT 'SAR',
    opening_balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Fiscal Periods Table (الفترات المحاسبية)
CREATE TABLE public.fiscal_periods (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    period_type TEXT NOT NULL DEFAULT 'month', -- 'month', 'quarter', 'year'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Units of Measure Table (وحدات القياس)
CREATE TABLE public.units (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    symbol TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Price Lists Table (قوائم الأسعار)
CREATE TABLE public.price_lists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    discount_percent NUMERIC DEFAULT 0,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Price List Items Table (أصناف قوائم الأسعار)
CREATE TABLE public.price_list_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL DEFAULT 0,
    min_quantity NUMERIC DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Company Settings Table (إعدادات الشركة)
CREATE TABLE public.company_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
    sales_account_id UUID REFERENCES public.accounts(id),
    purchases_account_id UUID REFERENCES public.accounts(id),
    inventory_account_id UUID REFERENCES public.accounts(id),
    receivables_account_id UUID REFERENCES public.accounts(id),
    payables_account_id UUID REFERENCES public.accounts(id),
    vat_account_id UUID REFERENCES public.accounts(id),
    cash_account_id UUID REFERENCES public.accounts(id),
    default_warehouse_id UUID REFERENCES public.warehouses(id),
    default_branch_id UUID REFERENCES public.branches(id),
    invoice_prefix TEXT DEFAULT 'INV-',
    purchase_prefix TEXT DEFAULT 'PUR-',
    quote_prefix TEXT DEFAULT 'QT-',
    journal_prefix TEXT DEFAULT 'JE-',
    receipt_prefix TEXT DEFAULT 'RV-',
    payment_prefix TEXT DEFAULT 'PV-',
    next_invoice_number INTEGER DEFAULT 1,
    next_purchase_number INTEGER DEFAULT 1,
    next_quote_number INTEGER DEFAULT 1,
    next_journal_number INTEGER DEFAULT 1,
    next_receipt_number INTEGER DEFAULT 1,
    next_payment_number INTEGER DEFAULT 1,
    default_payment_terms INTEGER DEFAULT 30,
    default_tax_rate NUMERIC DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_movements
CREATE POLICY "Company owner can view stock movements" ON public.stock_movements
    FOR SELECT USING (is_company_owner(company_id));
CREATE POLICY "Company owner can manage stock movements" ON public.stock_movements
    FOR ALL USING (is_company_owner(company_id));

-- RLS Policies for invoice_payments
CREATE POLICY "Company owner can view invoice payments" ON public.invoice_payments
    FOR SELECT USING (is_company_owner(company_id));
CREATE POLICY "Company owner can manage invoice payments" ON public.invoice_payments
    FOR ALL USING (is_company_owner(company_id));

-- RLS Policies for bank_accounts
CREATE POLICY "Company owner can view bank accounts" ON public.bank_accounts
    FOR SELECT USING (is_company_owner(company_id));
CREATE POLICY "Company owner can manage bank accounts" ON public.bank_accounts
    FOR ALL USING (is_company_owner(company_id));

-- RLS Policies for fiscal_periods
CREATE POLICY "Company owner can view fiscal periods" ON public.fiscal_periods
    FOR SELECT USING (is_company_owner(company_id));
CREATE POLICY "Company owner can manage fiscal periods" ON public.fiscal_periods
    FOR ALL USING (is_company_owner(company_id));

-- RLS Policies for units
CREATE POLICY "Company owner can view units" ON public.units
    FOR SELECT USING (is_company_owner(company_id));
CREATE POLICY "Company owner can manage units" ON public.units
    FOR ALL USING (is_company_owner(company_id));

-- RLS Policies for price_lists
CREATE POLICY "Company owner can view price lists" ON public.price_lists
    FOR SELECT USING (is_company_owner(company_id));
CREATE POLICY "Company owner can manage price lists" ON public.price_lists
    FOR ALL USING (is_company_owner(company_id));

-- RLS Policies for price_list_items
CREATE POLICY "Company owner can view price list items" ON public.price_list_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.price_lists pl
        WHERE pl.id = price_list_items.price_list_id AND is_company_owner(pl.company_id)
    ));
CREATE POLICY "Company owner can manage price list items" ON public.price_list_items
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.price_lists pl
        WHERE pl.id = price_list_items.price_list_id AND is_company_owner(pl.company_id)
    ));

-- RLS Policies for company_settings
CREATE POLICY "Company owner can view company settings" ON public.company_settings
    FOR SELECT USING (is_company_owner(company_id));
CREATE POLICY "Company owner can manage company settings" ON public.company_settings
    FOR ALL USING (is_company_owner(company_id));

-- Add foreign key for bank_account in invoice_payments
ALTER TABLE public.invoice_payments
    ADD CONSTRAINT invoice_payments_bank_account_id_fkey 
    FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);

-- Create indexes for better performance
CREATE INDEX idx_stock_movements_company ON public.stock_movements(company_id);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON public.stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(movement_date);
CREATE INDEX idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_date ON public.invoice_payments(payment_date);
CREATE INDEX idx_bank_accounts_company ON public.bank_accounts(company_id);
CREATE INDEX idx_fiscal_periods_company ON public.fiscal_periods(company_id);
CREATE INDEX idx_price_list_items_product ON public.price_list_items(product_id);

-- Trigger for updated_at on bank_accounts
CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on company_settings
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();