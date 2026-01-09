import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

const EndOfService = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isRTL ? "نهاية الخدمة" : "End of Service"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {isRTL ? "حسابات نهاية الخدمة" : "End of Service Calculations"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "اختر موظف لحساب مستحقاته" : "Select an employee to calculate benefits"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EndOfService;
