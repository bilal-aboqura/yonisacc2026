-- Landing Page Content Management Tables

-- Hero Section Content
CREATE TABLE public.landing_hero (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title_ar text NOT NULL,
    title_en text NOT NULL,
    subtitle_ar text NOT NULL,
    subtitle_en text NOT NULL,
    badge_ar text,
    badge_en text,
    cta_text_ar text NOT NULL,
    cta_text_en text NOT NULL,
    demo_text_ar text,
    demo_text_en text,
    stat1_value text DEFAULT '+500',
    stat1_label_ar text DEFAULT 'شركة',
    stat1_label_en text DEFAULT 'Companies',
    stat2_value text DEFAULT '+10K',
    stat2_label_ar text DEFAULT 'مستخدم',
    stat2_label_en text DEFAULT 'Users',
    stat3_value text DEFAULT '99.9%',
    stat3_label_ar text DEFAULT 'وقت التشغيل',
    stat3_label_en text DEFAULT 'Uptime',
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_hero ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Hero
CREATE POLICY "Anyone can view active hero" ON public.landing_hero
FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage hero" ON public.landing_hero
FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

-- Landing Features
CREATE TABLE public.landing_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    icon text NOT NULL,
    title_ar text NOT NULL,
    title_en text NOT NULL,
    description_ar text NOT NULL,
    description_en text NOT NULL,
    color text DEFAULT 'from-blue-500 to-blue-600',
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.landing_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active features" ON public.landing_features
FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage features" ON public.landing_features
FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

-- Landing FAQ
CREATE TABLE public.landing_faq (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_ar text NOT NULL,
    question_en text NOT NULL,
    answer_ar text NOT NULL,
    answer_en text NOT NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.landing_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active FAQ" ON public.landing_faq
FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage FAQ" ON public.landing_faq
FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

-- Insert default hero content
INSERT INTO public.landing_hero (
    title_ar, title_en, subtitle_ar, subtitle_en,
    badge_ar, badge_en, cta_text_ar, cta_text_en,
    demo_text_ar, demo_text_en
) VALUES (
    'برنامج محاسبة سحابي متكامل', 'Complete Cloud Accounting Software',
    'أدر أعمالك بكفاءة مع نظام محاسبي شامل يدعم الفوترة الإلكترونية ومتوافق مع متطلبات هيئة الزكاة والضريبة والجمارك',
    'Manage your business efficiently with a comprehensive accounting system that supports e-invoicing and is compliant with ZATCA requirements',
    'جديد! نظام الموارد البشرية المتكامل', 'New! Integrated HR System',
    'ابدأ تجربتك المجانية', 'Start Free Trial',
    'شاهد العرض التوضيحي', 'Watch Demo'
);

-- Insert default features
INSERT INTO public.landing_features (icon, title_ar, title_en, description_ar, description_en, color, sort_order) VALUES
('FileText', 'إدارة الفواتير', 'Invoice Management', 'إنشاء وإدارة فواتير المبيعات والمشتريات بسهولة مع دعم الفوترة الإلكترونية', 'Create and manage sales and purchase invoices easily with e-invoicing support', 'from-blue-500 to-blue-600', 1),
('Package', 'إدارة المخزون', 'Inventory Management', 'تتبع المخزون والمستودعات مع تنبيهات الحد الأدنى', 'Track inventory and warehouses with minimum stock alerts', 'from-amber-500 to-amber-600', 2),
('Calculator', 'المحاسبة العامة', 'General Accounting', 'دليل حسابات متكامل وقيود يومية وتقارير مالية', 'Complete chart of accounts, journal entries, and financial reports', 'from-green-500 to-green-600', 3),
('Users', 'الموارد البشرية', 'Human Resources', 'إدارة الموظفين والرواتب والإجازات والحضور', 'Manage employees, payroll, leaves, and attendance', 'from-purple-500 to-purple-600', 4),
('BarChart3', 'التقارير المالية', 'Financial Reports', 'تقارير شاملة: ميزان المراجعة، قائمة الدخل، الميزانية العمومية', 'Comprehensive reports: trial balance, income statement, balance sheet', 'from-pink-500 to-pink-600', 5),
('UserCheck', 'تعدد المستخدمين', 'Multi-User Access', 'صلاحيات متعددة للمستخدمين مع تتبع العمليات', 'Multiple user permissions with operation tracking', 'from-cyan-500 to-cyan-600', 6),
('Building2', 'تعدد الفروع', 'Multi-Branch Support', 'إدارة عدة فروع ومستودعات من مكان واحد', 'Manage multiple branches and warehouses from one place', 'from-orange-500 to-orange-600', 7),
('Shield', 'أمان عالي', 'High Security', 'تشفير البيانات ونسخ احتياطي تلقائي', 'Data encryption and automatic backup', 'from-red-500 to-red-600', 8);

-- Insert default FAQ
INSERT INTO public.landing_faq (question_ar, question_en, answer_ar, answer_en, sort_order) VALUES
('هل البرنامج متوافق مع متطلبات هيئة الزكاة والضريبة والجمارك؟', 'Is the software compliant with ZATCA requirements?', 'نعم، البرنامج متوافق تماماً مع متطلبات الفوترة الإلكترونية وضريبة القيمة المضافة حسب أنظمة هيئة الزكاة والضريبة والجمارك.', 'Yes, the software is fully compliant with e-invoicing and VAT requirements according to ZATCA regulations.', 1),
('هل يمكنني تجربة البرنامج مجاناً؟', 'Can I try the software for free?', 'نعم، نوفر فترة تجريبية مجانية لمدة 14 يوماً مع جميع المميزات.', 'Yes, we offer a 14-day free trial with all features.', 2),
('هل البيانات آمنة؟', 'Is my data secure?', 'نعم، نستخدم أحدث تقنيات التشفير ونسخ احتياطي يومي للحفاظ على بياناتك.', 'Yes, we use the latest encryption technologies and daily backups to keep your data safe.', 3),
('هل يدعم البرنامج تعدد الفروع؟', 'Does the software support multiple branches?', 'نعم، يمكنك إدارة عدة فروع ومستودعات من حساب واحد.', 'Yes, you can manage multiple branches and warehouses from one account.', 4),
('ما هي طرق الدفع المتاحة؟', 'What payment methods are available?', 'نقبل الدفع بالتحويل البنكي والبطاقات الائتمانية.', 'We accept bank transfer and credit cards.', 5);