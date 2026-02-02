import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Search, Building2, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const OwnerSubscribers = () => {
  const { isRTL } = useLanguage();
  const [search, setSearch] = useState("");

  const { data: companies, isLoading } = useQuery({
    queryKey: ["owner-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          subscriptions:subscriptions(
            id,
            status,
            plan:subscription_plans(name_ar, name_en, price)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredCompanies = companies?.filter(
    (company) =>
      company.name?.toLowerCase().includes(search.toLowerCase()) ||
      company.email?.toLowerCase().includes(search.toLowerCase()) ||
      company.phone?.includes(search)
  );

  const getSubscriptionStatus = (subscriptions: any[]) => {
    const active = subscriptions?.find((s) => s.status === "active");
    if (active) return { status: "active", plan: active.plan };
    const pending = subscriptions?.find((s) => s.status === "pending");
    if (pending) return { status: "pending", plan: pending.plan };
    return { status: "none", plan: null };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {isRTL ? "المشتركين" : "Subscribers"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL ? "عرض الشركات المسجلة في النظام" : "View registered companies"}
        </p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث بالاسم أو البريد أو الهاتف..." : "Search by name, email or phone..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">{isRTL ? "الشركة" : "Company"}</TableHead>
                  <TableHead className="min-w-[200px] hidden sm:table-cell">{isRTL ? "التواصل" : "Contact"}</TableHead>
                  <TableHead className="min-w-[100px]">{isRTL ? "الباقة" : "Plan"}</TableHead>
                  <TableHead className="min-w-[100px]">{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">{isRTL ? "تاريخ التسجيل" : "Registration Date"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24 sm:w-32" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-32 sm:w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 sm:w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-14 sm:w-16" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20 sm:w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCompanies?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 sm:py-8 text-muted-foreground">
                      {isRTL ? "لا توجد شركات مسجلة" : "No companies found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies?.map((company) => {
                    const { status, plan } = getSubscriptionStatus(company.subscriptions || []);
                    
                    return (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{company.name}</p>
                              {company.name_en && (
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{company.name_en}</p>
                              )}
                              {/* Mobile contact info */}
                              <div className="sm:hidden mt-1 space-y-0.5">
                                {company.email && (
                                  <p className="text-xs text-muted-foreground truncate">{company.email}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="space-y-1">
                            {company.email && (
                              <div className="flex items-center gap-2 text-xs sm:text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{company.email}</span>
                              </div>
                            )}
                            {company.phone && (
                              <div className="flex items-center gap-2 text-xs sm:text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span>{company.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {plan ? (
                            <span className="font-medium text-xs sm:text-sm">
                              {isRTL ? plan.name_ar : plan.name_en}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {status === "active" && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                              {isRTL ? "نشط" : "Active"}
                            </Badge>
                          )}
                          {status === "pending" && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">
                              {isRTL ? "معلق" : "Pending"}
                            </Badge>
                          )}
                          {status === "none" && (
                            <Badge variant="secondary" className="text-xs">
                              {isRTL ? "بدون" : "None"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {format(new Date(company.created_at), "dd MMM yyyy", {
                            locale: isRTL ? ar : enUS,
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerSubscribers;
