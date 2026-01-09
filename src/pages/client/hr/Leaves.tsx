import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";

const Leaves = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isRTL ? "الإجازات" : "Leaves"}
        </h1>
        <Button>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "طلب إجازة" : "Request Leave"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isRTL ? "سجل الإجازات" : "Leaves Record"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "لا توجد إجازات حالياً" : "No leaves yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaves;
