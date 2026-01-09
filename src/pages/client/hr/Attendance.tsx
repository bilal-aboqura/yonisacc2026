import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

const Attendance = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isRTL ? "الحضور و الانصراف" : "Attendance"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isRTL ? "سجل الحضور" : "Attendance Record"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "لا توجد سجلات حضور حالياً" : "No attendance records yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
