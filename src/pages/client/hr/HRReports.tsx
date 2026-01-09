import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const HRReports = () => {
  const { isRTL } = useLanguage();

  const reports = [
    { label: isRTL ? "تقرير الحضور الشهري" : "Monthly Attendance Report" },
    { label: isRTL ? "تقرير الإجازات" : "Leaves Report" },
    { label: isRTL ? "تقرير الرواتب" : "Payroll Report" },
    { label: isRTL ? "تقرير السلف" : "Advances Report" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isRTL ? "تقارير الموارد البشرية" : "HR Reports"}
      </h1>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report, index) => (
          <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                {report.label}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HRReports;
