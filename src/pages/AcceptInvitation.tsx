import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock, Building2 } from "lucide-react";

type InviteState = "loading" | "valid" | "expired" | "revoked" | "accepted" | "invalid" | "success";

interface InviteInfo {
  email: string;
  role: string;
  companyName: string;
  companyNameAr: string;
}

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const token = searchParams.get("token");

  const [state, setState] = useState<InviteState>("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation?token=${token}`,
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.ok) {
        const data = await response.json();
        setInviteInfo(data);
        setState("valid");
      } else {
        const error = await response.json();
        if (error.status === "expired") setState("expired");
        else if (error.status === "revoked") setState("revoked");
        else if (error.status === "accepted") setState("accepted");
        else setState("invalid");
      }
    } catch {
      setState("invalid");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "كلمات المرور غير متطابقة" : "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, fullName, phone, password }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to accept invitation");
      }

      setState("success");

      if (result.existingUser) {
        toast({
          title: isRTL ? "تم إضافتك للشركة" : "Added to Company",
          description: isRTL ? "يرجى تسجيل الدخول" : "Please sign in with your credentials",
        });
        setTimeout(() => navigate("/auth"), 2000);
      } else {
        // Auto-login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: inviteInfo!.email,
          password,
        });

        if (signInError) {
          toast({
            title: isRTL ? "تم إنشاء الحساب" : "Account Created",
            description: isRTL ? "يرجى تسجيل الدخول" : "Please sign in",
          });
          setTimeout(() => navigate("/auth"), 2000);
        } else {
          toast({
            title: isRTL ? "مرحباً!" : "Welcome!",
            description: isRTL ? "تم إنشاء حسابك بنجاح" : "Your account has been created successfully",
          });
          setTimeout(() => navigate("/client"), 1500);
        }
      }
    } catch (error: any) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">
              {isRTL ? "جاري التحقق من الدعوة..." : "Verifying invitation..."}
            </p>
          </div>
        );

      case "expired":
        return (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isRTL ? "انتهت صلاحية الدعوة" : "Invitation Expired"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isRTL
                ? "هذه الدعوة لم تعد صالحة. يرجى التواصل مع مدير الشركة لإرسال دعوة جديدة."
                : "This invitation is no longer valid. Please contact the company admin for a new invitation."}
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              {isRTL ? "الصفحة الرئيسية" : "Go Home"}
            </Button>
          </div>
        );

      case "revoked":
        return (
          <div className="text-center py-12">
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isRTL ? "تم إلغاء الدعوة" : "Invitation Cancelled"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isRTL
                ? "تم إلغاء هذه الدعوة من قبل المسؤول."
                : "This invitation has been cancelled by the admin."}
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              {isRTL ? "الصفحة الرئيسية" : "Go Home"}
            </Button>
          </div>
        );

      case "accepted":
        return (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isRTL ? "تم قبول الدعوة مسبقاً" : "Invitation Already Accepted"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isRTL ? "يمكنك تسجيل الدخول الآن." : "You can sign in now."}
            </p>
            <Button onClick={() => navigate("/auth")}>
              {isRTL ? "تسجيل الدخول" : "Sign In"}
            </Button>
          </div>
        );

      case "invalid":
        return (
          <div className="text-center py-12">
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isRTL ? "رابط غير صالح" : "Invalid Link"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isRTL
                ? "رابط الدعوة غير صالح أو منتهي الصلاحية."
                : "This invitation link is invalid or has expired."}
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              {isRTL ? "الصفحة الرئيسية" : "Go Home"}
            </Button>
          </div>
        );

      case "success":
        return (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isRTL ? "تم بنجاح!" : "Success!"}
            </h2>
            <p className="text-muted-foreground">
              {isRTL ? "جاري التحويل..." : "Redirecting..."}
            </p>
          </div>
        );

      case "valid":
        return (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company Info */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Building2 className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="font-semibold">
                  {isRTL ? inviteInfo?.companyNameAr : inviteInfo?.companyName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "دور: " : "Role: "}
                  <span className="font-medium capitalize">{inviteInfo?.role}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
              <Input value={inviteInfo?.email || ""} disabled dir="ltr" />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "الاسم الكامل" : "Full Name"} *</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isRTL ? "أدخل اسمك الكامل" : "Enter your full name"}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "رقم الهاتف" : "Phone Number"}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 5x xxx xxxx"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "كلمة المرور" : "Password"} *</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "تأكيد كلمة المرور" : "Confirm Password"} *</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "إنشاء الحساب والانضمام" : "Create Account & Join"}
            </Button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isRTL ? "قبول الدعوة" : "Accept Invitation"}
          </CardTitle>
          {state === "valid" && (
            <CardDescription>
              {isRTL
                ? "أنشئ حسابك للانضمام إلى فريق العمل"
                : "Create your account to join the team"}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
