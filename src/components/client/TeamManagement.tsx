import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Mail, RefreshCw, XCircle, Users, Loader2, Copy, Check } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "admin", labelAr: "مدير", labelEn: "Admin" },
  { value: "accountant", labelAr: "محاسب", labelEn: "Accountant" },
  { value: "sales", labelAr: "مبيعات", labelEn: "Sales" },
  { value: "hr", labelAr: "موارد بشرية", labelEn: "HR" },
];

const TeamManagement = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { companyId, company } = useTenantIsolation();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("accountant");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Fetch team members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["company-members", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from("company_members")
        .select("*, profiles:user_id(full_name, phone)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch pending invitations
  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ["company-invitations", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from("invitations")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Send invitation mutation
  const sendInviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email, role, companyId }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to send invitation");
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-invitations"] });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("accountant");

      if (data.emailSent) {
        toast({
          title: isRTL ? "تم إرسال الدعوة" : "Invitation Sent",
          description: isRTL ? "تم إرسال رابط الدعوة بالبريد الإلكتروني" : "Invitation link sent via email",
        });
      } else {
        toast({
          title: isRTL ? "تم إنشاء الدعوة" : "Invitation Created",
          description: isRTL
            ? "تم إنشاء الدعوة ولكن لم يتم إرسال البريد. انسخ الرابط يدوياً"
            : "Invitation created but email not sent. Copy the link manually.",
        });
      }

      if (data.inviteLink) {
        setCopiedLink(data.inviteLink);
      }
    },
    onError: (error: Error) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revoke invitation
  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await (supabase as any)
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-invitations"] });
      toast({
        title: isRTL ? "تم إلغاء الدعوة" : "Invitation Revoked",
      });
    },
  });

  // Resend invitation
  const resendMutation = useMutation({
    mutationFn: async (invitation: any) => {
      // Revoke old, send new
      await (supabase as any)
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", invitation.id);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: invitation.email,
            role: invitation.role,
            companyId,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-invitations"] });
      toast({
        title: isRTL ? "تم إعادة إرسال الدعوة" : "Invitation Resent",
      });
    },
  });

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 3000);
    toast({ title: isRTL ? "تم النسخ" : "Copied!" });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; labelAr: string }> = {
      pending: { variant: "secondary", label: "Pending", labelAr: "معلقة" },
      accepted: { variant: "default", label: "Accepted", labelAr: "مقبولة" },
      expired: { variant: "destructive", label: "Expired", labelAr: "منتهية" },
      revoked: { variant: "outline", label: "Revoked", labelAr: "ملغاة" },
    };
    const s = variants[status] || variants.pending;
    return <Badge variant={s.variant}>{isRTL ? s.labelAr : s.label}</Badge>;
  };

  const getRoleLabel = (role: string) => {
    const r = ROLE_OPTIONS.find((o) => o.value === role);
    return r ? (isRTL ? r.labelAr : r.labelEn) : role;
  };

  return (
    <div className="space-y-6">
      {/* Header with Invite Button */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {isRTL ? "فريق العمل" : "Team Members"}
            </CardTitle>
            <CardDescription>
              {isRTL
                ? "إدارة أعضاء الفريق والدعوات"
                : "Manage team members and invitations"}
            </CardDescription>
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                {isRTL ? "دعوة مستخدم" : "Invite User"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isRTL ? "دعوة مستخدم جديد" : "Invite New User"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "الدور" : "Role"}</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {isRTL ? r.labelAr : r.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                </DialogClose>
                <Button
                  onClick={() => sendInviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
                  disabled={!inviteEmail || sendInviteMutation.isPending}
                >
                  {sendInviteMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  )}
                  {isRTL ? "إرسال الدعوة" : "Send Invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {/* Active Members */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              {isRTL ? "الأعضاء النشطون" : "Active Members"}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isRTL ? "الدور" : "Role"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Company owner row */}
                <TableRow>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user?.email?.split("@")[0]}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {isRTL ? "مالك" : "Owner"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                      {isRTL ? "نشط" : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>

                {members?.map((member: any) => {
                  const profile = member.profiles as any;
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{profile?.full_name || "—"}</p>
                          <p className="text-sm text-muted-foreground">{profile?.phone || ""}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleLabel(member.role)}</TableCell>
                      <TableCell>
                        <Badge className={member.is_active
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                          : "bg-red-500/10 text-red-600 border-red-200"
                        }>
                          {member.is_active
                            ? (isRTL ? "نشط" : "Active")
                            : (isRTL ? "معلق" : "Suspended")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!membersLoading && (!members || members.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      {isRTL ? "لا يوجد أعضاء إضافيين" : "No additional members"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Invitations */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              {isRTL ? "الدعوات" : "Invitations"}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "البريد" : "Email"}</TableHead>
                  <TableHead>{isRTL ? "الدور" : "Role"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations?.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>{getRoleLabel(inv.role)}</TableCell>
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell>
                      {inv.status === "pending" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isRTL ? "start" : "end"}>
                            <DropdownMenuItem
                              onClick={() => resendMutation.mutate(inv)}
                              className="gap-2"
                            >
                              <RefreshCw className="h-4 w-4" />
                              {isRTL ? "إعادة إرسال" : "Resend"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => revokeMutation.mutate(inv.id)}
                              className="gap-2 text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                              {isRTL ? "إلغاء الدعوة" : "Revoke"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {!invitationsLoading && (!invitations || invitations.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      {isRTL ? "لا توجد دعوات" : "No invitations"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamManagement;
