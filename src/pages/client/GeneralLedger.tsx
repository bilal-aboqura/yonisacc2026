import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpenCheck } from "lucide-react";

const GeneralLedger = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isRTL ? "دفتر الأستاذ" : "General Ledger"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5" />
            {isRTL ? "دفتر الأستاذ العام" : "General Ledger"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "اختر حساباً لعرض حركاته" : "Select an account to view its transactions"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralLedger;
