import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PurchaseOrders = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isRTL ? "أوامر الشراء" : "Purchase Orders"}
        </h1>
        <Button onClick={() => navigate("/client/purchase-orders/new")}>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إنشاء أمر شراء" : "Create Purchase Order"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isRTL ? "أوامر الشراء" : "Purchase Orders"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "لا توجد أوامر شراء حالياً" : "No purchase orders yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrders;
