import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building } from "lucide-react";

const Departments = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isRTL ? "الأقسام" : "Departments"}
        </h1>
        <Button>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة قسم" : "Add Department"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {isRTL ? "قائمة الأقسام" : "Departments List"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "لا يوجد أقسام حالياً" : "No departments yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Departments;
