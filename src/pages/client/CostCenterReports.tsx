import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const CostCenterReports = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isRTL ? "تقارير مراكز التكلفة" : "Cost Center Reports"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {isRTL ? "تقارير مراكز التكلفة" : "Cost Center Reports"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "اختر مركز تكلفة لعرض تقاريره" : "Select a cost center to view reports"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostCenterReports;
