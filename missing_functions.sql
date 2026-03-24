-- ═══════════════════════════════════════════════════════════════════════════════
-- MISSING FUNCTIONS — Run in Supabase SQL Editor
-- These 6 functions were lost when the schema was recreated.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. get_account_balances ─────────────────────────────────────────────────
-- Returns { account_id: net_balance } map.  Used by Dashboard, Treasury, etc.
CREATE OR REPLACE FUNCTION public.get_account_balances(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_object_agg(aid, bal)
  INTO result
  FROM (
    SELECT aid, SUM(net) AS bal
    FROM (
      -- Opening balances
      SELECT ob.account_id AS aid, (ob.debit - ob.credit) AS net
      FROM public.opening_balances ob
      WHERE ob.company_id = p_company_id
      UNION ALL
      -- Posted journal entry movements
      SELECT jel.account_id AS aid, (jel.debit - jel.credit) AS net
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.entry_id
      WHERE je.company_id = p_company_id
        AND je.status = 'posted'
    ) all_movements
    GROUP BY aid
  ) balances;

  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- ─── 2. get_user_permissions ─────────────────────────────────────────────────
-- Returns flat permission map {PERMISSION_CODE: true, ...} for RBAC.
CREATE OR REPLACE FUNCTION public.get_user_permissions(_company_id uuid, _user_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if user is company owner (gets all permissions)
  IF EXISTS (
    SELECT 1 FROM public.companies WHERE id = _company_id AND owner_id = _user_id
  ) THEN
    SELECT json_object_agg(p.code, true)
    INTO result
    FROM public.rbac_permissions p;
    RETURN COALESCE(result, '{}'::json);
  END IF;

  -- Get permissions via: rbac_user_roles → rbac_role_permissions → rbac_permissions
  SELECT json_object_agg(p.code, true)
  INTO result
  FROM public.rbac_user_roles ur
  JOIN public.rbac_role_permissions rp ON rp.role_id = ur.role_id
  JOIN public.rbac_permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = _user_id
    AND ur.company_id = _company_id;

  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- ─── 3. get_company_usage ────────────────────────────────────────────────────
-- Returns current month usage vs plan limits.
CREATE OR REPLACE FUNCTION public.get_company_usage(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  _month int := EXTRACT(MONTH FROM CURRENT_DATE)::int;
  _je_count int := 0;
  _si_count int := 0;
  _pi_count int := 0;
  _max_je int;
  _max_si int;
  _max_pi int;
  result json;
BEGIN
  -- Get current usage
  SELECT
    COALESCE(ut.journal_entries_count, 0),
    COALESCE(ut.sales_invoices_count, 0),
    COALESCE(ut.purchase_invoices_count, 0)
  INTO _je_count, _si_count, _pi_count
  FROM public.usage_tracking ut
  WHERE ut.company_id = p_company_id
    AND ut.year = _year AND ut.month = _month;

  -- Get plan limits
  SELECT sp.max_entries, sp.max_invoices, sp.max_invoices
  INTO _max_je, _max_si, _max_pi
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.company_id = p_company_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  result := json_build_object(
    'journal_entries', json_build_object(
      'used', _je_count,
      'limit', _max_je,
      'unlimited', _max_je IS NULL
    ),
    'sales_invoices', json_build_object(
      'used', _si_count,
      'limit', _max_si,
      'unlimited', _max_si IS NULL
    ),
    'purchase_invoices', json_build_object(
      'used', _pi_count,
      'limit', _max_pi,
      'unlimited', _max_pi IS NULL
    ),
    'year', _year,
    'month', _month
  );

  RETURN result;
END;
$$;

-- ─── 4. check_usage_limit ────────────────────────────────────────────────────
-- Returns {allowed, current, limit, unlimited} for a specific usage type.
CREATE OR REPLACE FUNCTION public.check_usage_limit(p_company_id uuid, p_usage_type text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  _month int := EXTRACT(MONTH FROM CURRENT_DATE)::int;
  _current int := 0;
  _limit int;
BEGIN
  -- Get current count for the usage type
  IF p_usage_type = 'journal_entries' THEN
    SELECT COALESCE(journal_entries_count, 0) INTO _current
    FROM public.usage_tracking WHERE company_id = p_company_id AND year = _year AND month = _month;
  ELSIF p_usage_type = 'sales_invoices' THEN
    SELECT COALESCE(sales_invoices_count, 0) INTO _current
    FROM public.usage_tracking WHERE company_id = p_company_id AND year = _year AND month = _month;
  ELSIF p_usage_type = 'purchase_invoices' THEN
    SELECT COALESCE(purchase_invoices_count, 0) INTO _current
    FROM public.usage_tracking WHERE company_id = p_company_id AND year = _year AND month = _month;
  END IF;

  -- Get plan limit
  SELECT CASE
    WHEN p_usage_type = 'journal_entries' THEN sp.max_entries
    ELSE sp.max_invoices
  END INTO _limit
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.company_id = p_company_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'allowed', (_limit IS NULL OR _current < _limit),
    'current', _current,
    'limit', _limit,
    'unlimited', _limit IS NULL
  );
END;
$$;

-- ─── 5. get_trial_balance ────────────────────────────────────────────────────
-- Returns {accounts: [{id, code, name, name_en, type, parent_id, is_parent,
--   opening_debit, opening_credit, movement_debit, movement_credit}]}
CREATE OR REPLACE FUNCTION public.get_trial_balance(
  p_company_id uuid,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object('accounts', COALESCE(json_agg(row_to_json(t)), '[]'::json))
  INTO result
  FROM (
    SELECT
      a.id, a.code, a.name, a.name_en, a.type, a.parent_id, a.is_parent,
      -- Opening balances (from opening_balances table, or movements BEFORE date_from)
      COALESCE(ob.ob_debit, 0)
        + CASE WHEN p_date_from IS NOT NULL THEN COALESCE(pre.pre_debit, 0) ELSE 0 END
        AS opening_debit,
      COALESCE(ob.ob_credit, 0)
        + CASE WHEN p_date_from IS NOT NULL THEN COALESCE(pre.pre_credit, 0) ELSE 0 END
        AS opening_credit,
      -- Movements in the selected period
      COALESCE(mov.mov_debit, 0) AS movement_debit,
      COALESCE(mov.mov_credit, 0) AS movement_credit
    FROM public.accounts a
    -- Opening balances from the opening_balances table
    LEFT JOIN (
      SELECT account_id, SUM(debit) AS ob_debit, SUM(credit) AS ob_credit
      FROM public.opening_balances WHERE company_id = p_company_id
      GROUP BY account_id
    ) ob ON ob.account_id = a.id
    -- Pre-period movements (if date_from is specified)
    LEFT JOIN (
      SELECT jel.account_id, SUM(jel.debit) AS pre_debit, SUM(jel.credit) AS pre_credit
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.entry_id
      WHERE je.company_id = p_company_id AND je.status = 'posted'
        AND je.entry_date < p_date_from
      GROUP BY jel.account_id
    ) pre ON pre.account_id = a.id
    -- In-period movements
    LEFT JOIN (
      SELECT jel.account_id, SUM(jel.debit) AS mov_debit, SUM(jel.credit) AS mov_credit
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.entry_id
      WHERE je.company_id = p_company_id AND je.status = 'posted'
        AND (p_date_from IS NULL OR je.entry_date >= p_date_from)
        AND (p_date_to IS NULL OR je.entry_date <= p_date_to)
      GROUP BY jel.account_id
    ) mov ON mov.account_id = a.id
    WHERE a.company_id = p_company_id
    ORDER BY a.code
  ) t;

  RETURN COALESCE(result, '{"accounts":[]}'::json);
END;
$$;

-- ─── 6. get_cash_flow_report ─────────────────────────────────────────────────
-- Returns cash flow statement categorized into operating/investing/financing.
CREATE OR REPLACE FUNCTION public.get_cash_flow_report(
  p_company_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _start date := COALESCE(p_start_date, (EXTRACT(YEAR FROM CURRENT_DATE) || '-01-01')::date);
  _end date := COALESCE(p_end_date, CURRENT_DATE);
  _opening_cash numeric := 0;
  _closing_cash numeric := 0;
  _operating json;
  _investing json;
  _financing json;
  _op_total numeric := 0;
  _inv_total numeric := 0;
  _fin_total numeric := 0;
BEGIN
  -- Cash accounts: codes starting with 111 (cash & banks)
  -- Compute opening balance (opening_balances + pre-period movements)
  SELECT COALESCE(SUM(
    COALESCE(ob.ob_net, 0) + COALESCE(pre.pre_net, 0)
  ), 0) INTO _opening_cash
  FROM public.accounts a
  LEFT JOIN (
    SELECT account_id, SUM(debit - credit) AS ob_net
    FROM public.opening_balances WHERE company_id = p_company_id
    GROUP BY account_id
  ) ob ON ob.account_id = a.id
  LEFT JOIN (
    SELECT jel.account_id, SUM(jel.debit - jel.credit) AS pre_net
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.entry_id
    WHERE je.company_id = p_company_id AND je.status = 'posted'
      AND je.entry_date < _start
    GROUP BY jel.account_id
  ) pre ON pre.account_id = a.id
  WHERE a.company_id = p_company_id AND a.is_parent = false AND a.code LIKE '111%';

  -- Get in-period cash movements with counterpart info categorized by type
  -- Category logic:
  --   Operating = counterpart is revenue(4x), expense(5x), receivable(112%), payable(21%)
  --   Investing = counterpart is fixed asset(12%)
  --   Financing = counterpart is equity(3x), loans(22%)
  --   Default   = operating

  WITH cash_movements AS (
    SELECT
      je.id AS entry_id, je.entry_date, je.entry_number, je.description,
      jel.debit - jel.credit AS cash_amount,
      cp.id AS cp_id, cp.name AS counterpart_name, cp.name_en AS counterpart_name_en,
      cp.code AS counterpart_code, cp.type AS cp_type
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.entry_id
    JOIN public.accounts cash_acc ON cash_acc.id = jel.account_id
    -- Find the counterpart (non-cash) line in the same entry
    LEFT JOIN LATERAL (
      SELECT jel2.account_id
      FROM public.journal_entry_lines jel2
      WHERE jel2.entry_id = je.id AND jel2.account_id != jel.account_id
      LIMIT 1
    ) cp_line ON true
    LEFT JOIN public.accounts cp ON cp.id = cp_line.account_id
    WHERE je.company_id = p_company_id AND je.status = 'posted'
      AND cash_acc.code LIKE '111%' AND cash_acc.is_parent = false
      AND je.entry_date >= _start AND je.entry_date <= _end
  ),
  categorized AS (
    SELECT *,
      CASE
        WHEN counterpart_code LIKE '12%' THEN 'investing'
        WHEN counterpart_code LIKE '3%' OR counterpart_code LIKE '22%' THEN 'financing'
        ELSE 'operating'
      END AS category
    FROM cash_movements
  )
  SELECT
    COALESCE((SELECT json_agg(json_build_object(
      'entry_id', c.entry_id, 'entry_date', c.entry_date, 'entry_number', c.entry_number,
      'description', c.description, 'counterpart_name', c.counterpart_name,
      'counterpart_name_en', c.counterpart_name_en, 'counterpart_code', c.counterpart_code,
      'amount', c.cash_amount
    )) FROM categorized c WHERE c.category = 'operating'), '[]'::json),
    COALESCE((SELECT json_agg(json_build_object(
      'entry_id', c.entry_id, 'entry_date', c.entry_date, 'entry_number', c.entry_number,
      'description', c.description, 'counterpart_name', c.counterpart_name,
      'counterpart_name_en', c.counterpart_name_en, 'counterpart_code', c.counterpart_code,
      'amount', c.cash_amount
    )) FROM categorized c WHERE c.category = 'investing'), '[]'::json),
    COALESCE((SELECT json_agg(json_build_object(
      'entry_id', c.entry_id, 'entry_date', c.entry_date, 'entry_number', c.entry_number,
      'description', c.description, 'counterpart_name', c.counterpart_name,
      'counterpart_name_en', c.counterpart_name_en, 'counterpart_code', c.counterpart_code,
      'amount', c.cash_amount
    )) FROM categorized c WHERE c.category = 'financing'), '[]'::json),
    COALESCE((SELECT SUM(c.cash_amount) FROM categorized c WHERE c.category = 'operating'), 0),
    COALESCE((SELECT SUM(c.cash_amount) FROM categorized c WHERE c.category = 'investing'), 0),
    COALESCE((SELECT SUM(c.cash_amount) FROM categorized c WHERE c.category = 'financing'), 0)
  INTO _operating, _investing, _financing, _op_total, _inv_total, _fin_total;

  _closing_cash := _opening_cash + _op_total + _inv_total + _fin_total;

  RETURN json_build_object(
    'start_date', _start,
    'end_date', _end,
    'opening_cash', _opening_cash,
    'closing_cash', _closing_cash,
    'operating', _operating,
    'investing', _investing,
    'financing', _financing,
    'operating_total', _op_total,
    'investing_total', _inv_total,
    'financing_total', _fin_total,
    'net_change', _op_total + _inv_total + _fin_total
  );
END;
$$;

-- ─── Grant access ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_account_balances(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_company_usage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_usage_limit(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_trial_balance(uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cash_flow_report(uuid, date, date) TO authenticated, service_role;
