import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, Warehouse, AlertTriangle, BarChart3 } from "lucide-react";

const ClientInventory = () => {
  const { isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");

  const stats = [
    {
      title: isRTL ? "إجمالي المنتجات" : "Total Products",
      value: "0",
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: isRTL ? "قيمة المخزون" : "Inventory Value",
      value: "0 ر.س",
      icon: BarChart3,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: isRTL ? "المستودعات" : "Warehouses",
      value: "1",
      icon: Warehouse,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: isRTL ? "تنبيهات المخزون" : "Low Stock Alerts",
      value: "0",
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className={`space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isRTL ? "إدارة المخزون" : "Inventory Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة المنتجات والمستودعات" : "Manage products and warehouses"}
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {isRTL ? "منتج جديد" : "New Product"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            {isRTL ? "المنتجات" : "Products"}
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="gap-2">
            <Warehouse className="h-4 w-4" />
            {isRTL ? "المستودعات" : "Warehouses"}
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {isRTL ? "حركة المخزون" : "Stock Movement"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={isRTL ? "بحث عن منتج..." : "Search products..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ps-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {isRTL ? "لا توجد منتجات بعد" : "No products yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {isRTL ? "ابدأ بإضافة أول منتج للمخزون" : "Start by adding your first product"}
                </p>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {isRTL ? "إضافة منتج" : "Add Product"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouses">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "المستودعات" : "Warehouses"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-primary/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Warehouse className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{isRTL ? "المستودع الرئيسي" : "Main Warehouse"}</h4>
                        <Badge variant="secondary">{isRTL ? "الفرع الرئيسي" : "Main Branch"}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">{isRTL ? "المنتجات" : "Products"}</p>
                        <p className="font-medium">0</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{isRTL ? "القيمة" : "Value"}</p>
                        <p className="font-medium">0 ر.س</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed flex items-center justify-center min-h-[140px] cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="text-center">
                    <Plus className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? "إضافة مستودع" : "Add Warehouse"}
                    </p>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "حركة المخزون" : "Stock Movement"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {isRTL ? "لا توجد حركات مخزون بعد" : "No stock movements yet"}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientInventory;
