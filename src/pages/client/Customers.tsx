import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Customers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("client.customers.title")}
        </h1>
        <Button onClick={() => navigate("/client/contacts/new?type=customer")}>
          <Plus className="h-4 w-4 me-2" />
          {t("client.customers.addCustomer")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("client.customers.customersList")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {t("client.customers.noCustomers")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
