import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const OwnerSettings = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {isRTL ? "الإعدادات" : "Settings"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "إعدادات النظام العامة" : "General system settings"}
        </p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {isRTL ? "الإعدادات العامة" : "General Settings"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">
              {isRTL ? "سيتم إضافة الإعدادات قريباً" : "Settings coming soon"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerSettings;
