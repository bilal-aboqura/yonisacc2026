import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Shield, ShieldCheck, ShieldAlert, Plus, Pencil, Trash2, Loader2, Users, UserPlus,
  Check, X, Lock, Building2, Cog, BarChart3, ShoppingCart, Package, Wallet, BookOpen,
  Contact, Printer, Car, UserCog,
} from "lucide-react";

interface RBACRole {
  id: string;
  name: string;
  name_en: string;
  is_system: boolean;
  company_id: string | null;
}

interface RBACPermission {
  id: string;
  code: string;
  module: string;
  description: string;
  description_ar: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  company_id: string;
}

const moduleConfig: Record<string, { ar: string; en: string; icon: any; color: string }> = {
  dashboard: { ar: "لوحة التحكم", en: "Dashboard", icon: BarChart3, color: "text-blue-500" },
  accounting: { ar: "المحاسبة", en: "Accounting", icon: BookOpen, color: "text-emerald-500" },
  sales: { ar: "المبيعات", en: "Sales", icon: ShoppingCart, color: "text-primary" },
  purchases: { ar: "المشتريات", en: "Purchases", icon: Package, color: "text-amber-500" },
  inventory: { ar: "المخزون", en: "Inventory", icon: Package, color: "text-cyan-500" },
  treasury: { ar: "الخزينة", en: "Treasury", icon: Wallet, color: "text-violet-500" },
  contacts: { ar: "جهات الاتصال", en: "Contacts", icon: Contact, color: "text-pink-500" },
  reports: { ar: "التقارير", en: "Reports", icon: BarChart3, color: "text-orange-500" },
  hr: { ar: "الموارد البشرية", en: "Human Resources", icon: Users, color: "text-teal-500" },
  pos: { ar: "نقاط البيع", en: "Point of Sale", icon: ShoppingCart, color: "text-indigo-500" },
  settings: { ar: "الإعدادات", en: "Settings", icon: Cog, color: "text-slate-500" },
  print: { ar: "الطباعة", en: "Print", icon: Printer, color: "text-gray-500" },
  auto_parts: { ar: "قطع الغيار", en: "Auto Parts", icon: Car, color: "text-red-500" },
};

// Action type extraction from permission code for matrix view
const actionTypes = [
  { key: "VIEW", ar: "عرض", en: "View" },
  { key: "CREATE", ar: "إنشاء", en: "Create" },
  { key: "EDIT", ar: "تعديل", en: "Edit" },
  { key: "DELETE", ar: "حذف", en: "Delete" },
  { key: "POST", ar: "ترحيل", en: "Post" },
  { key: "MANAGE", ar: "إدارة", en: "Manage" },
  { key: "EXPORT", ar: "تصدير", en: "Export" },
  { key: "APPROVE", ar: "اعتماد", en: "Approve" },
  { key: "PRINT", ar: "طباعة", en: "Print" },
];

const RolesPermissionsManager = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RBACRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleNameEn, setRoleNameEn] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [activeTab, setActiveTab] = useState("matrix");
  const [activeModule, setActiveModule] = useState<string | null>(null);

  // Fetch roles
  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["rbac-roles", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rbac_roles" as any)
        .select("*")
        .or(`company_id.is.null,company_id.eq.${companyId}`)
        .order("is_system", { ascending: false });
      if (error) throw error;
      return (data as any) as RBACRole[];
    },
    enabled: !!companyId,
  });

  // Fetch permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ["rbac-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rbac_permissions" as any)
        .select("*")
        .order("module, code");
      if (error) throw error;
      return (data as any) as RBACPermission[];
    },
  });

  // Fetch role permissions
  const { data: rolePermIds = [] } = useQuery({
    queryKey: ["rbac-role-permissions", selectedRoleId],
    queryFn: async () => {
      if (!selectedRoleId) return [];
      const { data, error } = await supabase
        .from("rbac_role_permissions" as any)
        .select("permission_id")
        .eq("role_id", selectedRoleId);
      if (error) throw error;
      return ((data as any) || []).map((r: any) => r.permission_id as string);
    },
    enabled: !!selectedRoleId,
  });

  // Fetch user-role assignments
  const { data: userRoles = [] } = useQuery({
    queryKey: ["rbac-user-roles", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("rbac_user_roles" as any)
        .select("id, user_id, role_id, company_id")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data as any) as UserRole[];
    },
    enabled: !!companyId,
  });

  // Fetch members
  const { data: members = [] } = useQuery({
    queryKey: ["company-members-for-rbac", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data: company } = await supabase
        .from("companies").select("owner_id").eq("id", companyId).single();
      const { data: memberData } = await supabase
        .from("company_members").select("user_id").eq("company_id", companyId).eq("is_active", true);
      const userIds = new Set<string>();
      if (company?.owner_id) userIds.add(company.owner_id);
      (memberData || []).forEach((m: any) => userIds.add(m.user_id));
      if (userIds.size === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, full_name").in("user_id", Array.from(userIds));
      return (profiles || []) as { user_id: string; full_name: string | null }[];
    },
    enabled: !!companyId,
  });

  // Derived data
  const permIdSet = useMemo(() => new Set(rolePermIds), [rolePermIds]);
  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const systemRoles = roles.filter(r => r.is_system);
  const customRoles = roles.filter(r => !r.is_system);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, RBACPermission[]> = {};
    permissions.forEach(p => {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    });
    return groups;
  }, [permissions]);

  const modules = useMemo(() => Object.keys(groupedPermissions), [groupedPermissions]);

  // Build matrix data: for each module, map action types to permission
  const matrixData = useMemo(() => {
    return modules.map(mod => {
      const perms = groupedPermissions[mod];
      const actionMap: Record<string, RBACPermission | null> = {};
      actionTypes.forEach(at => {
        actionMap[at.key] = perms.find(p => p.code.startsWith(at.key + "_")) || null;
      });
      // Also collect "other" permissions not matching standard actions
      const matchedCodes = new Set(
        actionTypes.flatMap(at => perms.filter(p => p.code.startsWith(at.key + "_")).map(p => p.code))
      );
      const others = perms.filter(p => !matchedCodes.has(p.code));
      return { module: mod, actionMap, others, totalPerms: perms.length };
    });
  }, [modules, groupedPermissions]);

  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) setSelectedRoleId(roles[0].id);
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (modules.length > 0 && !activeModule) setActiveModule(modules[0]);
  }, [modules, activeModule]);

  // Mutations
  const togglePermission = useMutation({
    mutationFn: async ({ permissionId, enabled }: { permissionId: string; enabled: boolean }) => {
      if (!selectedRoleId) return;
      if (enabled) {
        await supabase.from("rbac_role_permissions" as any).insert({ role_id: selectedRoleId, permission_id: permissionId });
      } else {
        await supabase.from("rbac_role_permissions" as any).delete().eq("role_id", selectedRoleId).eq("permission_id", permissionId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rbac-role-permissions", selectedRoleId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const toggleModuleAll = useMutation({
    mutationFn: async ({ mod, enable }: { mod: string; enable: boolean }) => {
      if (!selectedRoleId) return;
      const perms = groupedPermissions[mod] || [];
      if (enable) {
        const toInsert = perms.filter(p => !permIdSet.has(p.id)).map(p => ({ role_id: selectedRoleId, permission_id: p.id }));
        if (toInsert.length > 0) {
          const { error } = await supabase.from("rbac_role_permissions" as any).insert(toInsert);
          if (error) throw error;
        }
      } else {
        const ids = perms.map(p => p.id);
        const { error } = await supabase.from("rbac_role_permissions" as any).delete().eq("role_id", selectedRoleId).in("permission_id", ids);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rbac-role-permissions", selectedRoleId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const saveRole = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      if (editingRole) {
        const { error } = await supabase.from("rbac_roles" as any)
          .update({ name: roleName, name_en: roleNameEn }).eq("id", editingRole.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rbac_roles" as any)
          .insert({ name: roleName, name_en: roleNameEn, company_id: companyId, is_system: false });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
      setRoleDialogOpen(false);
      toast.success(isRTL ? "تم الحفظ بنجاح" : "Saved successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("rbac_roles" as any).delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
      setSelectedRoleId(null);
      toast.success(isRTL ? "تم حذف الدور" : "Role deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignUser = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId || !companyId || !assignUserId) return;
      const { error } = await supabase.from("rbac_user_roles" as any)
        .insert({ user_id: assignUserId, role_id: selectedRoleId, company_id: companyId, assigned_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-user-roles"] });
      setAssignDialogOpen(false);
      setAssignUserId("");
      toast.success(isRTL ? "تم التعيين بنجاح" : "User assigned");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeUserRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rbac_user_roles" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-user-roles"] });
      toast.success(isRTL ? "تمت الإزالة" : "Removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const roleUsers = userRoles.filter(ur => ur.role_id === selectedRoleId);

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleNameEn("");
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: RBACRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleNameEn(role.name_en);
    setRoleDialogOpen(true);
  };

  const getRoleName = (role: RBACRole) => isRTL ? role.name : role.name_en;

  const getPermLabel = (perm: RBACPermission) => isRTL ? (perm.description_ar || perm.description) : perm.description;

  const getModuleLabel = (mod: string) => {
    const cfg = moduleConfig[mod];
    return cfg ? (isRTL ? cfg.ar : cfg.en) : mod;
  };

  if (loadingRoles) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              {isRTL ? "الأدوار والصلاحيات" : "Roles & Permissions"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isRTL ? "إدارة أدوار المستخدمين وتحديد صلاحيات الوصول لكل دور" : "Manage user roles and define access permissions for each role"}
            </p>
          </div>
          <Button onClick={openCreateRole} className="gap-2">
            <Plus className="h-4 w-4" />
            {isRTL ? "إنشاء دور جديد" : "Create New Role"}
          </Button>
        </div>

        {/* Roles Cards */}
        <div className="space-y-4">
          {/* System Roles */}
          {systemRoles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                {isRTL ? "الأدوار الافتراضية" : "System Roles"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {systemRoles.map(role => {
                  const assignedCount = userRoles.filter(ur => ur.role_id === role.id).length;
                  const isSelected = selectedRoleId === role.id;
                  return (
                    <Card
                      key={role.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"}`}
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="rounded-xl p-2.5 bg-primary/10 text-primary shrink-0">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{getRoleName(role)}</p>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {isRTL ? "نظام" : "System"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {assignedCount} {isRTL ? "مستخدم" : "users"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Roles */}
          {customRoles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <UserCog className="h-3.5 w-3.5" />
                {isRTL ? "الأدوار المخصصة" : "Custom Roles"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {customRoles.map(role => {
                  const assignedCount = userRoles.filter(ur => ur.role_id === role.id).length;
                  const permCount = rolePermIds.length; // Will update when selected
                  const isSelected = selectedRoleId === role.id;
                  return (
                    <Card
                      key={role.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"}`}
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="rounded-xl p-2.5 bg-secondary text-secondary-foreground shrink-0">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{getRoleName(role)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {assignedCount} {isRTL ? "مستخدم" : "users"}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditRole(role); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteRole.mutate(role.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Permissions & Users Panel */}
        {selectedRole && (
          <Card className="shadow-sm">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {selectedRole.is_system ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldAlert className="h-5 w-5" />}
                    {getRoleName(selectedRole)}
                    {selectedRole.is_system && (
                      <Badge variant="outline" className="text-xs">{isRTL ? "للقراءة فقط" : "Read-only"}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {permIdSet.size} / {permissions.length} {isRTL ? "صلاحية مفعلة" : "permissions enabled"}
                  </CardDescription>
                </div>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList>
                  <TabsTrigger value="matrix" className="gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {isRTL ? "مصفوفة الصلاحيات" : "Permissions Matrix"}
                  </TabsTrigger>
                  <TabsTrigger value="module" className="gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    {isRTL ? "حسب الوحدة" : "By Module"}
                  </TabsTrigger>
                  <TabsTrigger value="users" className="gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {isRTL ? "المستخدمون" : "Users"}
                    <Badge variant="secondary" className="text-[10px] px-1.5">{roleUsers.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Matrix View */}
              {activeTab === "matrix" && (
                <ScrollArea className="w-full">
                  <div className="min-w-[700px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-48 font-bold sticky start-0 bg-muted/30 z-10">
                            {isRTL ? "الوحدة" : "Module"}
                          </TableHead>
                          {actionTypes.map(at => (
                            <TableHead key={at.key} className="text-center w-20 text-xs font-medium">
                              {isRTL ? at.ar : at.en}
                            </TableHead>
                          ))}
                          <TableHead className="text-center w-20 text-xs">
                            {isRTL ? "الكل" : "All"}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matrixData.map(({ module: mod, actionMap, others, totalPerms }) => {
                          const cfg = moduleConfig[mod];
                          const Icon = cfg?.icon || Package;
                          const modPerms = groupedPermissions[mod] || [];
                          const enabledInMod = modPerms.filter(p => permIdSet.has(p.id)).length;
                          const allEnabled = enabledInMod === totalPerms && totalPerms > 0;

                          return (
                            <TableRow key={mod} className="hover:bg-muted/20">
                              <TableCell className="sticky start-0 bg-background z-10">
                                <div className="flex items-center gap-2">
                                  <Icon className={`h-4 w-4 ${cfg?.color || "text-muted-foreground"}`} />
                                  <span className="font-medium text-sm">{getModuleLabel(mod)}</span>
                                  <Badge variant="secondary" className="text-[10px]">{enabledInMod}/{totalPerms}</Badge>
                                </div>
                              </TableCell>
                              {actionTypes.map(at => {
                                const perm = actionMap[at.key];
                                if (!perm) return <TableCell key={at.key} className="text-center"><span className="text-muted-foreground/20">—</span></TableCell>;
                                const isEnabled = permIdSet.has(perm.id);
                                return (
                                  <TableCell key={at.key} className="text-center">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isEnabled}
                                            onCheckedChange={(checked) =>
                                              togglePermission.mutate({ permissionId: perm.id, enabled: !!checked })
                                            }
                                            disabled={selectedRole.is_system}
                                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                          />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        {getPermLabel(perm)}
                                        <br />
                                        <span className="text-muted-foreground font-mono">{perm.code}</span>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={allEnabled}
                                  onCheckedChange={(checked) =>
                                    toggleModuleAll.mutate({ mod, enable: !!checked })
                                  }
                                  disabled={selectedRole.is_system}
                                  className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              )}

              {/* Module Detail View */}
              {activeTab === "module" && (
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Module sidebar */}
                  <div className="sm:w-56 shrink-0 space-y-1">
                    {modules.map(mod => {
                      const cfg = moduleConfig[mod];
                      const Icon = cfg?.icon || Package;
                      const modPerms = groupedPermissions[mod] || [];
                      const enabledCount = modPerms.filter(p => permIdSet.has(p.id)).length;
                      return (
                        <Button
                          key={mod}
                          variant={activeModule === mod ? "secondary" : "ghost"}
                          className="w-full justify-between h-9 text-sm"
                          onClick={() => setActiveModule(mod)}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${cfg?.color || ""}`} />
                            <span>{getModuleLabel(mod)}</span>
                          </div>
                          <Badge variant={enabledCount === modPerms.length ? "default" : "secondary"} className="text-[10px]">
                            {enabledCount}/{modPerms.length}
                          </Badge>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Permission list for selected module */}
                  <div className="flex-1">
                    {activeModule && (
                      <Card className="border-border/50">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{getModuleLabel(activeModule)}</CardTitle>
                            {!selectedRole.is_system && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => toggleModuleAll.mutate({ mod: activeModule, enable: true })}
                                >
                                  <Check className="h-3 w-3 me-1" />
                                  {isRTL ? "تفعيل الكل" : "Enable All"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => toggleModuleAll.mutate({ mod: activeModule, enable: false })}
                                >
                                  <X className="h-3 w-3 me-1" />
                                  {isRTL ? "إلغاء الكل" : "Disable All"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{isRTL ? "الصلاحية" : "Permission"}</TableHead>
                                <TableHead className="w-24">{isRTL ? "الكود" : "Code"}</TableHead>
                                <TableHead className="w-20 text-center">{isRTL ? "مفعل" : "Enabled"}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(groupedPermissions[activeModule] || []).map(perm => (
                                <TableRow key={perm.id}>
                                  <TableCell>
                                    <div>
                                      <p className="text-sm font-medium">{getPermLabel(perm)}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {isRTL ? perm.description : (perm.description_ar || "")}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono text-[10px]">{perm.code}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={permIdSet.has(perm.id)}
                                      onCheckedChange={(checked) =>
                                        togglePermission.mutate({ permissionId: perm.id, enabled: !!checked })
                                      }
                                      disabled={selectedRole.is_system}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === "users" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? `المستخدمون المعينون لدور "${getRoleName(selectedRole)}"` : `Users assigned to "${getRoleName(selectedRole)}" role`}
                    </p>
                    <Button size="sm" className="gap-2" onClick={() => setAssignDialogOpen(true)}>
                      <UserPlus className="h-4 w-4" />
                      {isRTL ? "تعيين مستخدم" : "Assign User"}
                    </Button>
                  </div>
                  {roleUsers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{isRTL ? "لم يتم تعيين مستخدمين لهذا الدور بعد" : "No users assigned to this role yet"}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isRTL ? "المستخدم" : "User"}</TableHead>
                          <TableHead className="w-24 text-center">{isRTL ? "إجراء" : "Action"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roleUsers.map(ur => {
                          const member = members.find(m => m.user_id === ur.user_id);
                          return (
                            <TableRow key={ur.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                                    {(member?.full_name || "?")[0]}
                                  </div>
                                  <span className="font-medium">{member?.full_name || ur.user_id.slice(0, 8)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => removeUserRole.mutate(ur.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Role Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? (isRTL ? "تعديل الدور" : "Edit Role") : (isRTL ? "إنشاء دور جديد" : "Create New Role")}
              </DialogTitle>
              <DialogDescription>
                {isRTL ? "حدد اسم الدور باللغتين العربية والإنجليزية" : "Set the role name in Arabic and English"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم بالعربية" : "Arabic Name"}</Label>
                <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="مثال: محاسب" dir="rtl" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم بالإنجليزية" : "English Name"}</Label>
                <Input value={roleNameEn} onChange={e => setRoleNameEn(e.target.value)} placeholder="e.g. Accountant" dir="ltr" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={() => saveRole.mutate()} disabled={!roleName || !roleNameEn || saveRole.isPending}>
                {saveRole.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {isRTL ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign User Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isRTL ? "تعيين مستخدم للدور" : "Assign User to Role"}</DialogTitle>
              <DialogDescription>
                {isRTL
                  ? `اختر مستخدم لتعيينه لدور "${selectedRole ? getRoleName(selectedRole) : ""}"`
                  : `Select a user to assign to the "${selectedRole ? getRoleName(selectedRole) : ""}" role`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "اختر مستخدم..." : "Select a user..."} />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter(m => !roleUsers.some(ur => ur.user_id === m.user_id))
                    .map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.full_name || m.user_id.slice(0, 8)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={() => assignUser.mutate()} disabled={!assignUserId || assignUser.isPending}>
                {assignUser.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {isRTL ? "تعيين" : "Assign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default RolesPermissionsManager;
