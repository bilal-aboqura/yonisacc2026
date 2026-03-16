-- =============================================
-- MIGRATION: Add missing permissions for specialized modules
-- Adds rbac_permissions entries for: autoparts, gold, clinic,
-- realestate, delivery, assets, fuelstation
-- =============================================

INSERT INTO public.rbac_permissions (code, module, description, description_ar) VALUES
  -- Auto Parts (قطع السيارات / قطع الغيار)
  ('autoparts.view',         'auto_parts',   'View auto parts module',             'عرض وحدة قطع الغيار'),
  ('autoparts.products',     'auto_parts',   'Manage auto parts products',         'إدارة منتجات قطع الغيار'),
  ('autoparts.sales',        'auto_parts',   'Process auto parts sales',           'إجراء مبيعات قطع الغيار'),

  -- Gold & Jewelry (الذهب والمجوهرات)
  ('gold.view',              'gold',         'View gold & jewelry module',         'عرض وحدة الذهب والمجوهرات'),
  ('gold.products',          'gold',         'Manage gold products',               'إدارة منتجات الذهب'),
  ('gold.pricing',           'gold',         'Manage gold pricing',                'إدارة أسعار الذهب'),
  ('gold.sales',             'gold',         'Process gold sales',                 'إجراء مبيعات الذهب'),

  -- Clinic (العيادة)
  ('clinic.view',            'clinic',       'View clinic module',                 'عرض وحدة العيادة'),
  ('clinic.patients',        'clinic',       'Manage patients',                    'إدارة المرضى'),
  ('clinic.appointments',    'clinic',       'Manage appointments',                'إدارة المواعيد'),
  ('clinic.billing',         'clinic',       'Manage clinic billing',              'إدارة فواتير العيادة'),

  -- Real Estate (العقارات)
  ('realestate.view',        'realestate',   'View real estate module',            'عرض وحدة العقارات'),
  ('realestate.properties',  'realestate',   'Manage properties',                  'إدارة العقارات'),
  ('realestate.contracts',   'realestate',   'Manage contracts',                   'إدارة العقود'),
  ('realestate.payments',    'realestate',   'Manage real estate payments',        'إدارة مدفوعات العقارات'),

  -- Delivery (التوصيل)
  ('delivery.view',          'delivery',     'View delivery module',               'عرض وحدة التوصيل'),
  ('delivery.orders',        'delivery',     'Manage delivery orders',             'إدارة طلبات التوصيل'),
  ('delivery.drivers',       'delivery',     'Manage drivers',                     'إدارة السائقين'),
  ('delivery.tracking',      'delivery',     'Track deliveries',                   'تتبع عمليات التوصيل'),

  -- Fixed Assets (الأصول الثابتة)
  ('assets.view',            'assets',       'View fixed assets module',           'عرض وحدة الأصول الثابتة'),
  ('assets.manage',          'assets',       'Manage fixed assets',                'إدارة الأصول الثابتة'),
  ('assets.depreciation',    'assets',       'Manage asset depreciation',          'إدارة إهلاك الأصول'),

  -- Fuel Station (محطات الوقود)
  ('fuelstation.view',       'fuelstation',  'View fuel station module',           'عرض وحدة محطات الوقود'),
  ('fuelstation.sales',      'fuelstation',  'Process fuel sales',                 'إجراء مبيعات الوقود'),
  ('fuelstation.pumps',      'fuelstation',  'Manage fuel pumps',                  'إدارة مضخات الوقود'),
  ('fuelstation.inventory',  'fuelstation',  'Manage fuel inventory',              'إدارة مخزون الوقود')

ON CONFLICT (code) DO NOTHING;
