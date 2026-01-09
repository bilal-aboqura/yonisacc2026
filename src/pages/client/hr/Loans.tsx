import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Banknote } from "lucide-react";

const Loans = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isRTL ? "السلف و القروض" : "Loans & Advances"}
        </h1>
        <Button>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة سلفة" : "Add Advance"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            {isRTL ? "سجل السلف و القروض" : "Loans & Advances Record"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "لا توجد سلف حالياً" : "No advances yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Loans;
