import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const systemPrompt = `أنت مساعد محاسبي ذكي متخصص في المحاسبة والمالية. مهمتك هي مساعدة المستخدمين في:

1. **الاستفسارات المحاسبية**: شرح المفاهيم المحاسبية مثل الأصول، الخصوم، حقوق الملكية، الإيرادات، والمصروفات.

2. **القيود المحاسبية**: المساعدة في إنشاء القيود اليومية الصحيحة لأي عملية مالية.

3. **التقارير المالية**: شرح كيفية قراءة وتحليل القوائم المالية (قائمة الدخل، الميزانية العمومية، قائمة التدفقات النقدية).

4. **ضريبة القيمة المضافة (VAT)**: المساعدة في حساب الضريبة وفهم متطلبات ZATCA في السعودية.

5. **المعايير المحاسبية**: توضيح المعايير المحاسبية السعودية والدولية (IFRS).

6. **إدارة التدفق النقدي**: نصائح لتحسين إدارة السيولة.

7. **تحليل النسب المالية**: شرح وحساب النسب المالية المختلفة.

قواعد مهمة:
- أجب دائماً باللغة العربية إلا إذا سأل المستخدم بالإنجليزية.
- كن دقيقاً ومختصراً في إجاباتك.
- استخدم الأمثلة العملية لتوضيح المفاهيم.
- إذا كان السؤال يتطلب معلومات إضافية، اطلبها من المستخدم.
- لا تقدم نصائح ضريبية أو قانونية محددة، وانصح بالرجوع لمختص.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling Lovable AI Gateway with messages:", JSON.stringify(messages).slice(0, 200));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد الأقصى للطلبات، يرجى المحاولة لاحقاً." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للحساب لاستخدام المساعد الذكي." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "حدث خطأ في الاتصال بالمساعد الذكي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Successfully received response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Accounting assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
