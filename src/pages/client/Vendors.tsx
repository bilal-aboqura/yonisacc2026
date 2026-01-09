import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Vendors = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isRTL ? "الموردين" : "Vendors"}
        </h1>
        <Button onClick={() => navigate("/client/contacts/new?type=vendor")}>
          <Plus className="h-4 w-4 me-2" />
          {isRTL ? "إضافة مورد" : "Add Vendor"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {isRTL ? "قائمة الموردين" : "Vendors List"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "لا يوجد موردين حالياً" : "No vendors yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendors;
