import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";

const CostCenters = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isRTL ? "مراكز التكلفة" : "Cost Centers"}
        </h1>
        <Button>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة مركز تكلفة" : "Add Cost Center"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isRTL ? "مراكز التكلفة" : "Cost Centers"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "لا توجد مراكز تكلفة حالياً" : "No cost centers yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostCenters;
