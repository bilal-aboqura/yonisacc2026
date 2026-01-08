-- =============================================
-- جداول النظام المحاسبي
-- =============================================

-- 1. جدول العملاء والموردين
CREATE TABLE public.contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('customer', 'vendor', 'both')),
    name TEXT NOT NULL,
    name_en TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    tax_number TEXT,
    commercial_register TEXT,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'SA',
    credit_limit NUMERIC DEFAULT 0,
    balance NUMERIC DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. جدول فئات المنتجات
CREATE TABLE public.product_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    parent_id UUID REFERENCES public.product_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. جدول المنتجات
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.product_categories(id),
    sku TEXT,
    barcode TEXT,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    unit TEXT DEFAULT 'piece',
    purchase_price NUMERIC DEFAULT 0,
    sale_price NUMERIC DEFAULT 0,
    tax_rate NUMERIC DEFAULT 15,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER,
    is_service BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. جدول المستودعات
CREATE TABLE public.warehouses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    name TEXT NOT NULL,
    name_en TEXT,
    address TEXT,
    is_main BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. جدول مخزون المنتجات
CREATE TABLE public.product_stock (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 0,
    reserved_quantity NUMERIC DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (product_id, warehouse_id)
);

-- 6. جدول دليل الحسابات
CREATE TABLE public.accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.accounts(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    is_parent BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    balance NUMERIC DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (company_id, code)
);

-- 7. جدول الفواتير
CREATE TABLE public.invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    contact_id UUID REFERENCES public.contacts(id),
    type TEXT NOT NULL CHECK (type IN ('sale', 'purchase', 'sale_return', 'purchase_return')),
    invoice_number TEXT NOT NULL,
    reference_number TEXT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'partial', 'cancelled')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (company_id, type, invoice_number)
);

-- 8. جدول بنود الفواتير
CREATE TABLE public.invoice_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    description TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    tax_rate NUMERIC DEFAULT 15,
    tax_amount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- 9. جدول القيود اليومية
CREATE TABLE public.journal_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    entry_number TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    reference_type TEXT,
    reference_id UUID,
    total_debit NUMERIC DEFAULT 0,
    total_credit NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
    is_auto BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    posted_by UUID REFERENCES auth.users(id),
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (company_id, entry_number)
);

-- 10. جدول بنود القيود
CREATE TABLE public.journal_entry_lines (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

-- 11. جدول حركات الخزينة
CREATE TABLE public.treasury_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id),
    type TEXT NOT NULL CHECK (type IN ('receipt', 'payment', 'transfer')),
    transaction_number TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL DEFAULT 0,
    contact_id UUID REFERENCES public.contacts(id),
    invoice_id UUID REFERENCES public.invoices(id),
    description TEXT,
    payment_method TEXT DEFAULT 'cash',
    reference_number TEXT,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (company_id, transaction_number)
);

-- =============================================
-- تفعيل RLS على جميع الجداول
-- =============================================

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- دالة للتحقق من ملكية الشركة
-- =============================================

CREATE OR REPLACE FUNCTION public.is_company_owner(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = _company_id AND owner_id = auth.uid()
    )
$$;

-- =============================================
-- سياسات RLS للعملاء والموردين
-- =============================================

CREATE POLICY "Company owner can view contacts"
ON public.contacts FOR SELECT
USING (public.is_company_owner(company_id));

CREATE POLICY "Company owner can manage contacts"
ON public.contacts FOR ALL
USING (public.is_company_owner(company_id));

-- =============================================
-- سياسات RLS لفئات المنتجات
-- =============================================

CREATE POLICY "Company owner can view categories"
ON public.product_categories FOR SELECT
USING (public.is_company_owner(company_id));

CREATE POLICY "Company owner can manage categories"
ON public.product_categories FOR ALL
USING (public.is_company_owner(company_id));

-- =============================================
-- سياسات RLS للمنتجات
-- =============================================

CREATE POLICY "Company owner can view products"
ON public.products FOR SELECT
USING (public.is_company_owner(company_id));

CREATE POLICY "Company owner can manage products"
ON public.products FOR ALL
USING (public.is_company_owner(company_id));

-- =============================================
-- سياسات RLS للمستودعات
-- =============================================

CREATE POLICY "Company owner can view warehouses"
ON public.warehouses FOR SELECT
USING (public.is_company_owner(company_id));

CREATE POLICY "Company owner can manage warehouses"
ON public.warehouses FOR ALL
USING (public.is_company_owner(company_id));

-- =============================================
-- سياسات RLS لمخزون المنتجات
-- =============================================

CREATE POLICY "Company owner can view stock"
ON public.product_stock FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND public.is_company_owner(p.company_id)
));

CREATE POLICY "Company owner can manage stock"
ON public.product_stock FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND public.is_company_owner(p.company_id)
));

-- =============================================
-- سياسات RLS لدليل الحسابات
-- =============================================

CREATE POLICY "Company owner can view accounts"
ON public.accounts FOR SELECT
USING (public.is_company_owner(company_id));

CREATE POLICY "Company owner can manage accounts"
ON public.accounts FOR ALL
USING (public.is_company_owner(company_id));

-- =============================================
-- سياسات RLS للفواتير
-- =============================================

CREATE POLICY "Company owner can view invoices"
ON public.invoices FOR SELECT
USING (public.is_company_owner(company_id));

CREATE POLICY "Company owner can manage invoices"
ON public.invoices FOR ALL
USING (public.is_company_owner(company_id));

-- =============================================
-- سياسات RLS لبنود الفواتير
-- =============================================

CREATE POLICY "Company owner can view invoice items"
ON public.invoice_items FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND public.is_company_owner(i.company_id)
));

CREATE POLICY "Company owner can manage invoice items"
ON public.invoice_items FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND public.is_company_owner(i.company_id)
));

-- =============================================
-- سياسات RLS للقيود اليومية
-- =============================================

CREATE POLICY "Company owner can view journal entries"
ON public.journal_entries FOR SELECT
USING (public.is_company_owner(company_id));

CREATE POLICY "Company owner can manage journal entries"
ON public.journal_entries FOR ALL
USING (public.is_company_owner(company_id));

-- =============================================
-- سياسات RLS لبنود القيود
-- =============================================

CREATE POLICY "Company owner can view entry lines"
ON public.journal_entry_lines FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = entry_id AND public.is_company_owner(je.company_id)
));

CREATE POLICY "Company owner can manage entry lines"
ON public.journal_entry_lines FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = entry_id AND public.is_company_owner(je.company_id)
));

-- =============================================
-- سياسات RLS لحركات الخزينة
-- =============================================

CREATE POLICY "Company owner can view treasury transactions"
ON public.treasury_transactions FOR SELECT
USING (public.is_company_owner(company_id));

CREATE POLICY "Company owner can manage treasury transactions"
ON public.treasury_transactions FOR ALL
USING (public.is_company_owner(company_id));

-- =============================================
-- Triggers لتحديث updated_at
-- =============================================

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_stock_updated_at
BEFORE UPDATE ON public.product_stock
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- فهارس لتحسين الأداء
-- =============================================

CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_contacts_type ON public.contacts(type);
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE INDEX idx_invoices_type ON public.invoices(type);
CREATE INDEX idx_invoices_contact ON public.invoices(contact_id);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX idx_journal_entries_company ON public.journal_entries(company_id);
CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX idx_accounts_company ON public.accounts(company_id);
CREATE INDEX idx_accounts_parent ON public.accounts(parent_id);