

## خطة: إظهار زر مسح البيانات لليوزر المحدد فقط

### التغيير المطلوب

تعديل `ClientSettings.tsx` لإظهار تبويب "منطقة الخطر" فقط عندما يكون `user.id === "87740311-8413-47eb-b936-b4c96daecaa5"`.

### التفاصيل

في ملف `ClientSettings.tsx`:
1. إضافة شرط: `const isTestOwner = user?.id === "87740311-8413-47eb-b936-b4c96daecaa5"`
2. إخفاء `TabsTrigger value="danger"` بشرط `{isTestOwner && ...}`
3. إخفاء `TabsContent value="danger"` بنفس الشرط
4. تعديل عدد أعمدة `TabsList` ليكون ديناميكي (8 بدل 9 لغير هذا اليوزر)

تغيير بسيط في ملف واحد فقط.

