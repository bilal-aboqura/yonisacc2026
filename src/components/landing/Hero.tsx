import { Link } from "react-router-dom";
import { ArrowLeft, Play, Calculator, Users, ShoppingCart, Package, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const featurePills = [
  { icon: Calculator, label: "محاسبة متكاملة" },
  { icon: Users, label: "إدارة الموارد البشرية" },
  { icon: ShoppingCart, label: "نقاط البيع" },
  { icon: Package, label: "إدارة المخزون" },
];

const stats = [
  { value: "1000+", label: "شركة" },
  { value: "50K+", label: "مستخدم" },
  { value: "99.9%", label: "وقت التشغيل" },
];

export const Hero = () => {
  return (
    <section className="relative min-h-screen pt-24 pb-16 overflow-hidden gradient-hero">
      {/* Background Decorations */}
      <div className="absolute top-20 right-0 w-[600px] h-[600px] blob-primary rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] blob-accent rounded-full blur-3xl opacity-40 pointer-events-none" />

      <div className="container-custom px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-6rem)]">
          {/* Content */}
          <div className="space-y-8 animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-primary">نظام ERP سحابي متكامل</span>
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                أدر شركتك بالكامل{" "}
                <span className="gradient-text">من مكان واحد</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
                نظام ERP سحابي عربي متكامل للمحاسبة، الموارد البشرية، المخزون، ونقاط البيع.
                مصمم خصيصاً للشركات الصغيرة والمتوسطة في العالم العربي.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              {featurePills.map((pill, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm"
                >
                  <pill.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{pill.label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register-company">
                <Button size="lg" className="gradient-primary text-white btn-primary-shadow text-lg px-8 h-14 rounded-xl group w-full sm:w-auto">
                  ابدأ تجربتك المجانية
                  <ArrowLeft className="ms-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 rounded-xl group"
                onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="me-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                شاهد العرض التوضيحي
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2 space-x-reverse">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-background flex items-center justify-center text-xs font-bold text-primary"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">+1000</span> شركة عربية تثق بنا
              </div>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative animate-slide-in-left">
            {/* Main Dashboard Card */}
            <div className="glass-card rounded-3xl p-1 shadow-2xl">
              {/* Browser Bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    nizam.app/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center p-4 rounded-xl bg-muted/30">
                      <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Chart Placeholder */}
                <div className="h-40 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border/50 flex items-end justify-around p-4">
                  {[60, 80, 45, 90, 70, 85, 95].map((height, i) => (
                    <div
                      key={i}
                      className="w-8 rounded-t-lg gradient-primary opacity-70"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                  <div className="flex-1 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">فاتورة جديدة</span>
                    </div>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-accent/10 border border-accent/20">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">تقرير المبيعات</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -top-4 -left-4 glass-card rounded-2xl p-4 shadow-xl animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">نمو المبيعات</div>
                  <div className="text-lg font-bold text-green-500">+24%</div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 glass-card rounded-2xl p-4 shadow-xl animate-float-delayed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">فاتورة جديدة</div>
                  <div className="text-sm font-bold">INV-2024-0158</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
