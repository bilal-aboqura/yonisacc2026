import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Validation schemas
const loginSchema = z.object({
  email: z.string().trim().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
  email: z.string().trim().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

const Auth = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  
  // Password visibility
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  
  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const Arrow = isRTL ? ArrowRight : ArrowLeft;

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/client");
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      toast({
        title: isRTL ? "خطأ في البيانات" : "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      let errorMessage = isRTL ? "حدث خطأ أثناء تسجيل الدخول" : "Login failed";
      
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = isRTL ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = isRTL ? "يرجى تأكيد بريدك الإلكتروني أولاً" : "Please confirm your email first";
      }

      toast({
        title: isRTL ? "خطأ" : "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isRTL ? "مرحباً!" : "Welcome!",
      description: isRTL ? "تم تسجيل الدخول بنجاح" : "Successfully logged in",
    });
    
    navigate("/client");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const result = signupSchema.safeParse({
      fullName: signupName,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });
    
    if (!result.success) {
      toast({
        title: isRTL ? "خطأ في البيانات" : "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // Don't create account yet — pass data to wizard
    navigate("/register-company", {
      state: {
        full_name: signupName,
        email: signupEmail,
        password: signupPassword,
      },
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotEmail.trim()) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email",
        variant: "destructive",
      });
      return;
    }

    setIsForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setIsForgotLoading(false);

    if (error) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "حدث خطأ أثناء إرسال رابط إعادة التعيين" : "Failed to send reset link",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isRTL ? "تم الإرسال!" : "Email Sent!",
      description: isRTL ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني" : "A password reset link has been sent to your email",
    });
    setShowForgotPassword(false);
    setForgotEmail("");
  };




  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="p-3 sm:p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 sm:gap-2 text-sm">
          <Arrow className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {isRTL ? "الرئيسية" : "Home"}
        </Button>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Auth Form */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardHeader className="text-center pb-2 px-4 sm:px-6">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-gradient">
              {t("common.appName")}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {isRTL ? "أدر أعمالك بكفاءة واحترافية" : "Manage your business efficiently"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                <TabsTrigger value="login" className="text-sm sm:text-base">{t("auth.login.title")}</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm sm:text-base">{t("auth.register.title")}</TabsTrigger>
              </TabsList>
              
              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t("auth.login.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="example@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="ps-10 h-12"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">{t("auth.login.password")}</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {isRTL ? "نسيت كلمة المرور؟" : "Forgot password?"}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="ps-10 pe-10 h-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 gradient-primary text-white text-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      t("auth.login.submit")
                    )}
                  </Button>
                </form>
                



                <p className="text-center text-sm text-muted-foreground mt-6">
                  {t("auth.login.noAccount")}{" "}
                  <button 
                    onClick={() => setActiveTab("signup")}
                    className="text-primary hover:underline font-medium"
                  >
                    {t("auth.login.register")}
                  </button>
                </p>
              </TabsContent>
              
              {/* Signup Tab */}
              <TabsContent value="signup">
                {/* Onboarding journey preview */}
                <div className="mb-5 p-3 rounded-xl bg-muted/40 border border-border/60">
                  <p className="text-xs font-semibold text-muted-foreground mb-2.5 text-center">
                    {isRTL ? "رحلة الإعداد بعد التسجيل" : "Setup journey after registration"}
                  </p>
                  <div className="flex items-center justify-between">
                    {[
                      { num: 1, labelAr: "الحساب", labelEn: "Account", active: true },
                      { num: 2, labelAr: "الشركة", labelEn: "Company", active: false },
                      { num: 3, labelAr: "التفضيلات", labelEn: "Preferences", active: false },
                      { num: 4, labelAr: "الوحدات", labelEn: "Modules", active: false },
                    ].map((s, i, arr) => (
                      <div key={s.num} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                            s.active
                              ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/30"
                              : "bg-background border-border text-muted-foreground"
                          }`}>
                            {s.num}
                          </div>
                          <span className={`text-[10px] font-medium hidden sm:block ${s.active ? "text-primary" : "text-muted-foreground"}`}>
                            {isRTL ? s.labelAr : s.labelEn}
                          </span>
                        </div>
                        {i < arr.length - 1 && (
                          <div className="flex-1 h-px bg-border mx-1" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    {isRTL
                      ? "✦ بعد التسجيل ستكمل إعداد شركتك في 3 خطوات إضافية"
                      : "✦ After signing up, complete your company setup in 3 more steps"}
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t("auth.register.fullName")}</Label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder={isRTL ? "الاسم الكامل" : "Full Name"}
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="ps-10 h-12"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t("auth.register.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="example@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="ps-10 h-12"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t("auth.register.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="ps-10 pe-10 h-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">{t("auth.register.confirmPassword")}</Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type={showSignupConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        className="ps-10 pe-10 h-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showSignupConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 gradient-primary text-white text-lg"
                  >
                    {isRTL ? "متابعة لإعداد الشركة ←" : "Continue to Setup →"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  {t("auth.register.hasAccount")}{" "}
                  <button 
                    onClick={() => setActiveTab("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    {t("auth.register.login")}
                  </button>
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForgotPassword(false)}>
          <Card className="w-full max-w-sm border-0 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-bold">
                {isRTL ? "استعادة كلمة المرور" : "Reset Password"}
              </CardTitle>
              <CardDescription className="text-sm">
                {isRTL ? "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين" : "Enter your email and we'll send you a reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="example@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="ps-10 h-12"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 gradient-primary text-white"
                  disabled={isForgotLoading}
                >
                  {isForgotLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    isRTL ? "إرسال رابط إعادة التعيين" : "Send Reset Link"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  {isRTL ? "رجوع" : "Back"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Auth;
