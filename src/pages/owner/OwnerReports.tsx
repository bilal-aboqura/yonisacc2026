import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const OwnerReports = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {isRTL ? "التقارير" : "Reports"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "تقارير وإحصائيات النظام" : "System reports and statistics"}
        </p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {isRTL ? "التقارير المالية" : "Financial Reports"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">
              {isRTL ? "سيتم إضافة التقارير قريباً" : "Reports coming soon"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerReports;
