import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";

const Periods = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isRTL ? "الفترات" : "Periods"}
        </h1>
        <Button>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة فترة" : "Add Period"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isRTL ? "فترات العمل" : "Work Periods"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "لا توجد فترات حالياً" : "No periods yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Periods;
