-- =============================================
-- MIGRATION: Fix missing tables and columns
-- =============================================

-- 1. Add deleted_at to companies table (soft delete support)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create business_verticals table (missing from initial migration)
CREATE TABLE IF NOT EXISTS public.business_verticals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon TEXT,
    color TEXT DEFAULT 'from-blue-500 to-blue-600',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_verticals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active verticals" ON public.business_verticals
    FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage verticals" ON public.business_verticals
    FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- Insert common business verticals
INSERT INTO public.business_verticals (name_ar, name_en, icon, color, sort_order) VALUES
('تجارة عامة', 'General Trade', 'ShoppingBag', 'from-blue-500 to-blue-600', 1),
('مطاعم وكافيهات', 'Restaurants & Cafes', 'UtensilsCrossed', 'from-orange-500 to-orange-600', 2),
('خدمات مهنية', 'Professional Services', 'Briefcase', 'from-purple-500 to-purple-600', 3),
('تقنية المعلومات', 'Information Technology', 'Monitor', 'from-cyan-500 to-cyan-600', 4),
('المقاولات والإنشاءات', 'Construction', 'Building2', 'from-yellow-500 to-yellow-600', 5),
('الصحة والطب', 'Healthcare', 'Heart', 'from-red-500 to-red-600', 6),
('التعليم والتدريب', 'Education & Training', 'GraduationCap', 'from-green-500 to-green-600', 7),
('العقارات', 'Real Estate', 'Home', 'from-indigo-500 to-indigo-600', 8),
('الصناعة والتصنيع', 'Manufacturing', 'Factory', 'from-gray-500 to-gray-600', 9),
('النقل والخدمات اللوجستية', 'Transport & Logistics', 'Truck', 'from-teal-500 to-teal-600', 10)
ON CONFLICT DO NOTHING;

-- 3. Ensure company_members table exists (in case migration #9 failed partially)
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'client',
    is_active BOOLEAN NOT NULL DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Drop and recreate to avoid duplicates
DROP POLICY IF EXISTS "Company owner can manage members" ON public.company_members;
DROP POLICY IF EXISTS "Members can view own membership" ON public.company_members;

CREATE POLICY "Company owner can manage members" ON public.company_members
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    );

CREATE POLICY "Members can view own membership" ON public.company_members
    FOR SELECT USING (user_id = auth.uid());

-- Add updated_at trigger if not exists
DROP TRIGGER IF EXISTS update_company_members_updated_at ON public.company_members;
CREATE TRIGGER update_company_members_updated_at
    BEFORE UPDATE ON public.company_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add index for company_members queries
CREATE INDEX IF NOT EXISTS idx_company_members_user ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON public.company_members(company_id);

-- 5. Companies: add index for deleted_at filter
CREATE INDEX IF NOT EXISTS idx_companies_owner_deleted ON public.companies(owner_id, deleted_at);
