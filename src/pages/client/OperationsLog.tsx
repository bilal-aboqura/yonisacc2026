import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const OperationsLog = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t("client.operationsLog.title")}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {t("client.operationsLog.allEntries")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t("client.operationsLog.tabs.all")}</TabsTrigger>
              <TabsTrigger value="manual">{t("client.operationsLog.tabs.manual")}</TabsTrigger>
              <TabsTrigger value="sales">{t("client.operationsLog.tabs.sales")}</TabsTrigger>
              <TabsTrigger value="purchases">{t("client.operationsLog.tabs.purchases")}</TabsTrigger>
              <TabsTrigger value="inventory">{t("client.operationsLog.tabs.inventory")}</TabsTrigger>
              <TabsTrigger value="hr">{t("client.operationsLog.tabs.hr")}</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <div className="text-center py-12 text-muted-foreground">
                {t("client.operationsLog.noEntries")}
              </div>
            </TabsContent>
            <TabsContent value="manual">
              <div className="text-center py-12 text-muted-foreground">
                {t("client.operationsLog.noManualEntries")}
              </div>
            </TabsContent>
            <TabsContent value="sales">
              <div className="text-center py-12 text-muted-foreground">
                {t("client.operationsLog.noSalesEntries")}
              </div>
            </TabsContent>
            <TabsContent value="purchases">
              <div className="text-center py-12 text-muted-foreground">
                {t("client.operationsLog.noPurchaseEntries")}
              </div>
            </TabsContent>
            <TabsContent value="inventory">
              <div className="text-center py-12 text-muted-foreground">
                {t("client.operationsLog.noInventoryEntries")}
              </div>
            </TabsContent>
            <TabsContent value="hr">
              <div className="text-center py-12 text-muted-foreground">
                {t("client.operationsLog.noHREntries")}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsLog;
