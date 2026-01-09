import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const OperationsLog = () => {
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isRTL ? "سجل العمليات" : "Operations Log"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {isRTL ? "جميع القيود اليومية" : "All Journal Entries"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">{isRTL ? "الكل" : "All"}</TabsTrigger>
              <TabsTrigger value="manual">{isRTL ? "يدوي" : "Manual"}</TabsTrigger>
              <TabsTrigger value="sales">{isRTL ? "مبيعات" : "Sales"}</TabsTrigger>
              <TabsTrigger value="purchases">{isRTL ? "مشتريات" : "Purchases"}</TabsTrigger>
              <TabsTrigger value="inventory">{isRTL ? "مخزون" : "Inventory"}</TabsTrigger>
              <TabsTrigger value="hr">{isRTL ? "موارد بشرية" : "HR"}</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? "لا توجد قيود حالياً" : "No entries yet"}
              </div>
            </TabsContent>
            <TabsContent value="manual">
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? "لا توجد قيود يدوية" : "No manual entries"}
              </div>
            </TabsContent>
            <TabsContent value="sales">
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? "لا توجد قيود مبيعات" : "No sales entries"}
              </div>
            </TabsContent>
            <TabsContent value="purchases">
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? "لا توجد قيود مشتريات" : "No purchase entries"}
              </div>
            </TabsContent>
            <TabsContent value="inventory">
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? "لا توجد قيود مخزون" : "No inventory entries"}
              </div>
            </TabsContent>
            <TabsContent value="hr">
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? "لا توجد قيود موارد بشرية" : "No HR entries"}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsLog;
