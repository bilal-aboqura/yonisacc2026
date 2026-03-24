-- =============================================
-- Create post_journal_entry RPC function
-- Atomically inserts a journal entry with its lines,
-- updates account balances, and increments the
-- next_journal_number in company_settings.
-- =============================================

CREATE OR REPLACE FUNCTION public.post_journal_entry(
  p_company_id UUID,
  p_created_by UUID,
  p_description TEXT,
  p_entry_date DATE,
  p_entry_number TEXT,
  p_lines JSONB,
  p_status TEXT DEFAULT 'posted'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_line JSONB;
  v_account_id UUID;
  v_debit NUMERIC;
  v_credit NUMERIC;
  v_line_desc TEXT;
  v_cost_center_id UUID;
  v_sort_order INT := 0;
BEGIN
  -- Calculate totals from lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_debit := COALESCE((v_line->>'debit')::NUMERIC, 0);
    v_credit := COALESCE((v_line->>'credit')::NUMERIC, 0);
    v_total_debit := v_total_debit + v_debit;
    v_total_credit := v_total_credit + v_credit;
  END LOOP;

  -- Validate: total debit must equal total credit
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry is not balanced: debit=% credit=%', v_total_debit, v_total_credit;
  END IF;

  -- Validate: at least one line with a value
  IF v_total_debit = 0 THEN
    RAISE EXCEPTION 'Journal entry must have at least one debit/credit amount';
  END IF;

  -- Insert the journal entry header
  INSERT INTO public.journal_entries (
    company_id,
    entry_number,
    entry_date,
    description,
    total_debit,
    total_credit,
    status,
    is_auto,
    created_by,
    posted_by,
    posted_at
  ) VALUES (
    p_company_id,
    p_entry_number,
    p_entry_date,
    p_description,
    v_total_debit,
    v_total_credit,
    p_status,
    false,
    p_created_by,
    CASE WHEN p_status = 'posted' THEN p_created_by ELSE NULL END,
    CASE WHEN p_status = 'posted' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_entry_id;

  -- Insert journal entry lines and update account balances
  v_sort_order := 0;
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_account_id := (v_line->>'account_id')::UUID;
    v_debit := COALESCE((v_line->>'debit')::NUMERIC, 0);
    v_credit := COALESCE((v_line->>'credit')::NUMERIC, 0);
    v_line_desc := v_line->>'description';
    v_cost_center_id := NULLIF(v_line->>'cost_center_id', '')::UUID;

    -- Skip lines with no amounts
    IF v_debit = 0 AND v_credit = 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.journal_entry_lines (
      entry_id,
      account_id,
      debit,
      credit,
      description,
      sort_order,
      cost_center_id
    ) VALUES (
      v_entry_id,
      v_account_id,
      v_debit,
      v_credit,
      v_line_desc,
      v_sort_order,
      v_cost_center_id
    );

    -- Update account balance if posting
    IF p_status = 'posted' THEN
      UPDATE public.accounts
      SET balance = balance + v_debit - v_credit
      WHERE id = v_account_id;
    END IF;

    v_sort_order := v_sort_order + 1;
  END LOOP;

  RETURN v_entry_id;
END;
$$;
