import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, Clock } from "lucide-react";

const HRDashboard = () => {
  const { isRTL } = useLanguage();

  const stats = [
    { icon: Users, label: isRTL ? "إجمالي الموظفين" : "Total Employees", value: "0" },
    { icon: Calendar, label: isRTL ? "الإجازات اليوم" : "Leaves Today", value: "0" },
    { icon: Clock, label: isRTL ? "الحاضرين" : "Present Today", value: "0" },
    { icon: DollarSign, label: isRTL ? "إجمالي الرواتب" : "Total Payroll", value: "0" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isRTL ? "لوحة تحكم الموارد البشرية" : "HR Dashboard"}
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HRDashboard;
