-- Create cost_centers table
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  parent_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add cost_center_id to accounts table
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

-- Enable RLS on cost_centers
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cost_centers
CREATE POLICY "Company owner can view cost centers" ON public.cost_centers
  FOR SELECT USING (is_company_owner(company_id));

CREATE POLICY "Company owner can manage cost centers" ON public.cost_centers
  FOR ALL USING (is_company_owner(company_id));

-- Create function to generate default chart of accounts for a new company
CREATE OR REPLACE FUNCTION public.create_default_chart_of_accounts(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if company already has accounts
  SELECT COUNT(*) INTO v_count FROM accounts WHERE company_id = p_company_id;
  IF v_count > 0 THEN
    RETURN;
  END IF;

  -- Insert default chart of accounts
  -- Assets (1)
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order) VALUES
  (p_company_id, '1', 'الأصول', 'Assets', 'asset', true, true, 1);
  
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '11', 'الأصول المتداولة', 'Current Assets', 'asset', true, true, 2, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '1'));
  
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '111', 'النقدية والبنوك', 'Cash and Banks', 'asset', true, true, 3, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '11')),
  (p_company_id, '112', 'الذمم المدينة', 'Accounts Receivable', 'asset', true, true, 4, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '11')),
  (p_company_id, '113', 'المخزون', 'Inventory', 'asset', true, true, 5, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '11'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '1111', 'الصندوق', 'Cash', 'asset', false, true, 6, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '111')),
  (p_company_id, '1112', 'البنك', 'Bank', 'asset', false, true, 7, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '111'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '12', 'الأصول الثابتة', 'Fixed Assets', 'asset', true, true, 10, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '1'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '121', 'المباني', 'Buildings', 'asset', false, true, 11, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '12')),
  (p_company_id, '122', 'الآلات والمعدات', 'Machinery & Equipment', 'asset', false, true, 12, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '12')),
  (p_company_id, '123', 'الأثاث والتجهيزات', 'Furniture & Fixtures', 'asset', false, true, 13, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '12')),
  (p_company_id, '124', 'وسائل النقل', 'Vehicles', 'asset', false, true, 14, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '12'));

  -- Liabilities (2)
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order) VALUES
  (p_company_id, '2', 'الخصوم', 'Liabilities', 'liability', true, true, 20);

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '21', 'الخصوم المتداولة', 'Current Liabilities', 'liability', true, true, 21, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '2'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '211', 'الذمم الدائنة', 'Accounts Payable', 'liability', true, true, 22, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '21')),
  (p_company_id, '212', 'ضريبة القيمة المضافة', 'VAT Payable', 'liability', false, true, 23, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '21'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '22', 'الخصوم طويلة الأجل', 'Long-term Liabilities', 'liability', true, true, 25, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '2'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '221', 'القروض', 'Loans', 'liability', false, true, 26, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '22'));

  -- Equity (3)
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order) VALUES
  (p_company_id, '3', 'حقوق الملكية', 'Equity', 'equity', true, true, 30);

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '31', 'رأس المال', 'Capital', 'equity', false, true, 31, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '3')),
  (p_company_id, '32', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', false, true, 32, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '3')),
  (p_company_id, '33', 'أرباح/خسائر العام', 'Current Year P/L', 'equity', false, true, 33, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '3'));

  -- Revenue (4)
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order) VALUES
  (p_company_id, '4', 'الإيرادات', 'Revenue', 'revenue', true, true, 40);

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '41', 'إيرادات المبيعات', 'Sales Revenue', 'revenue', false, true, 41, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '4')),
  (p_company_id, '42', 'إيرادات الخدمات', 'Service Revenue', 'revenue', false, true, 42, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '4')),
  (p_company_id, '43', 'إيرادات أخرى', 'Other Revenue', 'revenue', false, true, 43, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '4'));

  -- Expenses (5)
  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order) VALUES
  (p_company_id, '5', 'المصروفات', 'Expenses', 'expense', true, true, 50);

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '51', 'تكلفة المبيعات', 'Cost of Sales', 'expense', true, true, 51, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '5'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '511', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'expense', false, true, 52, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '51'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '52', 'المصروفات الإدارية', 'Administrative Expenses', 'expense', true, true, 53, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '5'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '521', 'الرواتب والأجور', 'Salaries & Wages', 'expense', false, true, 54, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '52')),
  (p_company_id, '522', 'الإيجارات', 'Rent', 'expense', false, true, 55, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '52')),
  (p_company_id, '523', 'المرافق', 'Utilities', 'expense', false, true, 56, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '52')),
  (p_company_id, '524', 'مصروفات أخرى', 'Other Expenses', 'expense', false, true, 57, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '52'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '53', 'مصروفات البيع والتسويق', 'Sales & Marketing Expenses', 'expense', true, true, 58, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '5'));

  INSERT INTO accounts (company_id, code, name, name_en, type, is_parent, is_system, sort_order, parent_id) VALUES
  (p_company_id, '531', 'مصروفات الإعلان', 'Advertising', 'expense', false, true, 59, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '53')),
  (p_company_id, '532', 'مصروفات التسويق', 'Marketing', 'expense', false, true, 60, (SELECT id FROM accounts WHERE company_id = p_company_id AND code = '53'));

END;
$$;

-- Create trigger to auto-create chart of accounts for new companies
CREATE OR REPLACE FUNCTION public.trigger_create_default_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_default_chart_of_accounts(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_created_add_accounts ON public.companies;
CREATE TRIGGER on_company_created_add_accounts
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_accounts();