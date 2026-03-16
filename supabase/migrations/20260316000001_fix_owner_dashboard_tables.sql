-- =============================================
-- FIX 2: Missing Owner Dashboard Tables/Columns
-- =============================================

-- 1. Add missing columns to profiles table needed by the dashboard
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create audit_logs table (Missing from initial migrations)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operation_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    severity TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only platform owners can view all audit logs
CREATE POLICY "Platform owners can view all audit logs" ON public.audit_logs
    FOR SELECT USING (public.has_role(auth.uid(), 'owner'));

-- Company owners can view their company's audit logs
CREATE POLICY "Company owners can view company logs" ON public.audit_logs
    FOR SELECT USING (public.is_company_owner(company_id));

-- Anyone can insert logs (via edge functions / triggers)
CREATE POLICY "Allow insertions to audit_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- 3. Create get_enriched_audit_logs RPC function for the frontend
CREATE OR REPLACE FUNCTION public.get_enriched_audit_logs(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_table_name TEXT DEFAULT NULL,
    p_operation_type TEXT DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    operation_type TEXT,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    details TEXT,
    created_at TIMESTAMPTZ,
    company_id UUID,
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    company_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Security check: ensure caller is a platform owner
    IF NOT public.has_role(auth.uid(), 'owner') THEN
        RAISE EXCEPTION 'Access denied. Owner role required.';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.operation_type,
        a.table_name,
        a.record_id,
        a.old_data,
        a.new_data,
        a.details,
        a.created_at,
        a.company_id,
        a.user_id,
        p.full_name AS user_name,
        u.email::TEXT AS user_email,
        c.name AS company_name
    FROM public.audit_logs a
    LEFT JOIN public.profiles p ON p.user_id = a.user_id
    LEFT JOIN auth.users u ON u.id = a.user_id
    LEFT JOIN public.companies c ON c.id = a.company_id
    WHERE 
        (p_table_name IS NULL OR a.table_name = p_table_name) AND
        (p_operation_type IS NULL OR a.operation_type = p_operation_type) AND
        (p_search_query IS NULL OR 
         a.details ILIKE '%' || p_search_query || '%' OR 
         p.full_name ILIKE '%' || p_search_query || '%' OR
         u.email ILIKE '%' || p_search_query || '%')
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
