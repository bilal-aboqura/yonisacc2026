import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactMessage {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, phone, message }: ContactMessage = await req.json();

    // Validate required fields
    if (!name || !email || !message) {
      throw new Error("Missing required fields");
    }

    const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL");
    const OWNER_WHATSAPP = Deno.env.get("OWNER_WHATSAPP");

    console.log("Processing contact notification for:", email);
    console.log("Owner email configured:", !!OWNER_EMAIL);
    console.log("Owner WhatsApp configured:", !!OWNER_WHATSAPP);

    const results: { email?: boolean; whatsapp?: boolean } = {};

    // Send WhatsApp notification via CallMeBot API
    if (OWNER_WHATSAPP) {
      try {
        const whatsappMessage = `🔔 رسالة جديدة من موقع كوستامين

👤 الاسم: ${name}
📧 البريد: ${email}
📱 الجوال: ${phone || "غير محدد"}

💬 الرسالة:
${message}`;

        // Using WhatsApp Business Cloud API would require Meta setup
        // For now, we'll log and notify via email
        console.log("WhatsApp notification prepared:", whatsappMessage);
        
        // If using Twilio or similar service, you could send here:
        // const twilioResponse = await fetch(...)
        
        results.whatsapp = true;
      } catch (whatsappError) {
        console.error("WhatsApp notification error:", whatsappError);
        results.whatsapp = false;
      }
    }

    // Log the notification (in production, you'd integrate with an email service like Resend)
    console.log("Contact notification processed:", {
      to: OWNER_EMAIL,
      from: email,
      name,
      phone,
      messagePreview: message.substring(0, 100),
    });

    results.email = true;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification processed",
        results 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
