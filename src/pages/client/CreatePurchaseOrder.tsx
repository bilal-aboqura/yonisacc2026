import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreatePurchaseOrder = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/purchase-orders")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isRTL ? "إنشاء أمر شراء جديد" : "Create New Purchase Order"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isRTL ? "بيانات أمر الشراء" : "Purchase Order Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "نموذج إنشاء أمر الشراء" : "Purchase order creation form"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatePurchaseOrder;
