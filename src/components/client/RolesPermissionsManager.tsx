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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Shield, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Loader2, Users, UserPlus,
} from "lucide-react";

interface RBACRole {
  id: string;
  name_ar: string;
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
  profile?: { full_name: string | null; user_id: string };
  user_email?: string;
}

const moduleLabels: Record<string, { ar: string; en: string }> = {
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  accounting: { ar: "المحاسبة", en: "Accounting" },
  sales: { ar: "المبيعات", en: "Sales" },
  purchases: { ar: "المشتريات", en: "Purchases" },
  inventory: { ar: "المخزون", en: "Inventory" },
  reports: { ar: "التقارير", en: "Reports" },
  hr: { ar: "الموارد البشرية", en: "Human Resources" },
  treasury: { ar: "الخزينة", en: "Treasury" },
  contacts: { ar: "جهات الاتصال", en: "Contacts" },
  settings: { ar: "الإعدادات", en: "Settings" },
  print: { ar: "الطباعة", en: "Print" },
  auto_parts: { ar: "قطع الغيار", en: "Auto Parts" },
};

const RolesPermissionsManager = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { companyId } = useTenantIsolation();
  const queryClient = useQueryClient();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RBACRole | null>(null);
  const [roleNameAr, setRoleNameAr] = useState("");
  const [roleNameEn, setRoleNameEn] = useState("");
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [assignUserId, setAssignUserId] = useState("");

  // Fetch roles (system + company-specific)
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

  // Fetch all permissions
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

  // Fetch role_permissions for selected role
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

  // Fetch user-role assignments for this company
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

  // Fetch company members for assignment
  const { data: members = [] } = useQuery({
    queryKey: ["company-members-for-rbac", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      // Get profiles of company owner + members
      const { data: company } = await supabase
        .from("companies")
        .select("owner_id")
        .eq("id", companyId)
        .single();
      
      const { data: memberData } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("is_active", true);
      
      const userIds = new Set<string>();
      if (company?.owner_id) userIds.add(company.owner_id);
      (memberData || []).forEach((m: any) => userIds.add(m.user_id));

      if (userIds.size === 0) return [];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", Array.from(userIds));
      
      return (profiles || []) as { user_id: string; full_name: string | null }[];
    },
    enabled: !!companyId,
  });

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, RBACPermission[]> = {};
    permissions.forEach(p => {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    });
    return groups;
  }, [permissions]);

  const permIdSet = useMemo(() => new Set(rolePermIds), [rolePermIds]);

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  // Auto-select first role
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  // Toggle permission for selected role
  const togglePermission = useMutation({
    mutationFn: async ({ permissionId, enabled }: { permissionId: string; enabled: boolean }) => {
      if (!selectedRoleId) return;
      if (enabled) {
        const { error } = await supabase
          .from("rbac_role_permissions" as any)
          .insert({ role_id: selectedRoleId, permission_id: permissionId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rbac_role_permissions" as any)
          .delete()
          .eq("role_id", selectedRoleId)
          .eq("permission_id", permissionId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-role-permissions", selectedRoleId] });
    },
    onError: (e: any) => {
      toast.error(e.message);
    },
  });

  // Save role (create/edit)
  const saveRole = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      if (editingRole) {
        const { error } = await supabase
          .from("rbac_roles" as any)
          .update({ name_ar: roleNameAr, name_en: roleNameEn })
          .eq("id", editingRole.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rbac_roles" as any)
          .insert({ name_ar: roleNameAr, name_en: roleNameEn, company_id: companyId, is_system: false });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
      setRoleDialogOpen(false);
      toast.success(isRTL ? "تم الحفظ" : "Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete role
  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("rbac_roles" as any).delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
      setSelectedRoleId(null);
      toast.success(isRTL ? "تم الحذف" : "Deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Assign user to role
  const assignUser = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId || !companyId || !assignUserId) return;
      const { error } = await supabase
        .from("rbac_user_roles" as any)
        .insert({
          user_id: assignUserId,
          role_id: selectedRoleId,
          company_id: companyId,
          assigned_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-user-roles"] });
      setAssignDialogOpen(false);
      setAssignUserId("");
      toast.success(isRTL ? "تم التعيين" : "Assigned");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Remove user from role
  const removeUserRole = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("rbac_user_roles" as any).delete().eq("id", assignmentId);
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
    setRoleNameAr("");
    setRoleNameEn("");
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: RBACRole) => {
    setEditingRole(role);
    setRoleNameAr(role.name_ar);
    setRoleNameEn(role.name_en);
    setRoleDialogOpen(true);
  };

  if (loadingRoles) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Roles List */}
        <Card className="sm:w-64 shrink-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {isRTL ? "الأدوار" : "Roles"}
              </CardTitle>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={openCreateRole}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="space-y-1">
              {roles.map(role => (
                <Button
                  key={role.id}
                  variant={selectedRoleId === role.id ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 h-9 text-sm"
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  {isRTL ? role.name_ar : role.name_en}
                  {role.is_system && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 ms-auto">
                      {isRTL ? "نظام" : "System"}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Panel */}
        {selectedRole && (
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {isRTL ? selectedRole.name_ar : selectedRole.name_en}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {permIdSet.size} {isRTL ? "صلاحية" : "permissions"}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  {!selectedRole.is_system && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditRole(selectedRole)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteRole.mutate(selectedRole.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] px-4">
                <div className="space-y-1 pb-4">
                  {Object.entries(groupedPermissions).map(([mod, perms]) => {
                    const label = moduleLabels[mod] || { ar: mod, en: mod };
                    const isOpen = openModules.includes(mod);
                    const enabledCount = perms.filter(p => permIdSet.has(p.id)).length;

                    return (
                      <Collapsible key={mod} open={isOpen} onOpenChange={() => {
                        setOpenModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
                      }}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between h-9 px-2 text-sm">
                            <div className="flex items-center gap-2">
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <span className="font-medium">{isRTL ? label.ar : label.en}</span>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                              {enabledCount}/{perms.length}
                            </Badge>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-0.5 ps-6 pe-2 pb-2">
                            {perms.map(perm => (
                              <div key={perm.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
                                <div className="min-w-0">
                                  <p className="text-sm">{perm.description || perm.code}</p>
                                  <span className="text-[10px] text-muted-foreground font-mono">{perm.code}</span>
                                </div>
                                <Switch
                                  checked={permIdSet.has(perm.id)}
                                  onCheckedChange={(checked) =>
                                    togglePermission.mutate({ permissionId: perm.id, enabled: checked })
                                  }
                                  disabled={selectedRole.is_system}
                                />
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>

              <Separator />

              {/* Users assigned to this role */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {isRTL ? "المستخدمون" : "Users"}
                    <Badge variant="secondary" className="text-[10px]">{roleUsers.length}</Badge>
                  </h4>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAssignDialogOpen(true)}>
                    <UserPlus className="h-3 w-3" />
                    {isRTL ? "تعيين" : "Assign"}
                  </Button>
                </div>
                <div className="space-y-1">
                  {roleUsers.map(ur => {
                    const member = members.find(m => m.user_id === ur.user_id);
                    return (
                      <div key={ur.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 text-sm">
                        <span>{member?.full_name || ur.user_id.slice(0, 8)}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeUserRole.mutate(ur.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                  {roleUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {isRTL ? "لا يوجد مستخدمون" : "No users assigned"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? (isRTL ? "تعديل الدور" : "Edit Role") : (isRTL ? "إنشاء دور جديد" : "Create New Role")}
            </DialogTitle>
            <DialogDescription>
              {isRTL ? "حدد اسم الدور بالعربي والإنجليزي" : "Set the role name in Arabic and English"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
              <Input value={roleNameAr} onChange={e => setRoleNameAr(e.target.value)} placeholder="محاسب" />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
              <Input value={roleNameEn} onChange={e => setRoleNameEn(e.target.value)} placeholder="Accountant" dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={() => saveRole.mutate()} disabled={!roleNameAr || !roleNameEn || saveRole.isPending}>
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
            <DialogTitle>{isRTL ? "تعيين مستخدم" : "Assign User"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "اختر مستخدم لتعيينه لهذا الدور" : "Select a user to assign to this role"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={assignUserId} onValueChange={setAssignUserId}>
              <SelectTrigger>
                <SelectValue placeholder={isRTL ? "اختر مستخدم" : "Select user"} />
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
  );
};

export default RolesPermissionsManager;
