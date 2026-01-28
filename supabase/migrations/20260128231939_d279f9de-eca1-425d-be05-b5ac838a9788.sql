-- Create owner_settings table for system-wide settings
CREATE TABLE public.owner_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.owner_settings ENABLE ROW LEVEL SECURITY;

-- Only owners can view settings
CREATE POLICY "Owners can view settings"
  ON public.owner_settings
  FOR SELECT
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Only owners can manage settings
CREATE POLICY "Owners can manage settings"
  ON public.owner_settings
  FOR ALL
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Anyone can view public settings (like bank account for payments)
CREATE POLICY "Anyone can view public settings"
  ON public.owner_settings
  FOR SELECT
  USING (setting_key IN ('bank_account', 'payment_settings'));

-- Insert default settings
INSERT INTO public.owner_settings (setting_key, setting_value) VALUES
('bank_account', '{"bank_name": "", "bank_name_en": "", "account_name": "", "account_number": "", "iban": "", "is_visible": false}'),
('payment_settings', '{"show_bank_transfer": true, "transfer_instructions_ar": "يرجى التحويل على الحساب البنكي التالي", "transfer_instructions_en": "Please transfer to the following bank account"}');

-- Create trigger for updated_at
CREATE TRIGGER update_owner_settings_updated_at
  BEFORE UPDATE ON public.owner_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();