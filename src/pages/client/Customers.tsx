import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Customers = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isRTL ? "العملاء" : "Customers"}
        </h1>
        <Button onClick={() => navigate("/client/contacts/new?type=customer")}>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة عميل" : "Add Customer"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isRTL ? "قائمة العملاء" : "Customers List"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "لا يوجد عملاء حالياً" : "No customers yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
