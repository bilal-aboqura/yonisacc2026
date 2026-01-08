import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Users, UserCheck, Truck } from "lucide-react";

const ClientContacts = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "العملاء والموردين" : "Customers & Vendors"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة بيانات العملاء والموردين" : "Manage customers and vendors data"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/client/contacts/new")}>
          <Plus className="h-4 w-4" />
          {isRTL ? "إضافة جهة" : "Add Contact"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الجهات" : "Total Contacts"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">{isRTL ? "العملاء" : "Customers"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Truck className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">{isRTL ? "الموردين" : "Vendors"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            {isRTL ? "الكل" : "All"}
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <UserCheck className="h-4 w-4" />
            {isRTL ? "العملاء" : "Customers"}
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2">
            <Truck className="h-4 w-4" />
            {isRTL ? "الموردين" : "Vendors"}
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث بالاسم أو رقم الهاتف..." : "Search by name or phone..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="all" className="m-0">
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {isRTL ? "لا توجد جهات بعد" : "No contacts yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {isRTL ? "ابدأ بإضافة أول عميل أو مورد" : "Start by adding your first customer or vendor"}
                </p>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {isRTL ? "إضافة جهة" : "Add Contact"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="customers" className="m-0">
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {isRTL ? "لا يوجد عملاء بعد" : "No customers yet"}
                </h3>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {isRTL ? "إضافة عميل" : "Add Customer"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="vendors" className="m-0">
              <div className="text-center py-12">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {isRTL ? "لا يوجد موردين بعد" : "No vendors yet"}
                </h3>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {isRTL ? "إضافة مورد" : "Add Vendor"}
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default ClientContacts;
