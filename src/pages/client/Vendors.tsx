import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Vendors = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("client.vendors.title")}
        </h1>
        <Button onClick={() => navigate("/client/contacts/new?type=vendor")}>
          <Plus className="h-4 w-4 me-2" />
          {t("client.vendors.addVendor")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("client.vendors.vendorsList")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {t("client.vendors.noVendors")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendors;
