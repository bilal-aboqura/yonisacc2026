import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { DataTable } from "@/components/ui/data-table";

const OwnerMessages = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["owner-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_messages").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["owner-messages"] }); },
  });

  const openMessage = (message: any) => {
    setSelectedMessage(message);
    setIsDialogOpen(true);
    if (!message.is_read) markAsReadMutation.mutate(message.id);
  };

  const unreadCount = messages?.filter((m) => !m.is_read).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{isRTL ? "رسائل التواصل" : "Contact Messages"}</h1>
          <p className="text-muted-foreground mt-1">{isRTL ? "عرض رسائل العملاء من صفحة التواصل" : "View customer messages from contact form"}</p>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-primary text-primary-foreground">{unreadCount} {isRTL ? "غير مقروءة" : "unread"}</Badge>
        )}
      </div>

      <DataTable
        title={isRTL ? "الرسائل" : "Messages"}
        icon={<Mail className="h-5 w-5" />}
        columns={[
          { key: "indicator", header: "", width: 40, render: (msg: any) => !msg.is_read ? <div className="w-2 h-2 rounded-full bg-primary" /> : null },
          { key: "sender", header: isRTL ? "المرسل" : "Sender", render: (msg: any) => (
            <div>
              <p className={`font-medium ${!msg.is_read ? "font-bold" : ""}`}>{msg.name}</p>
              <p className="text-sm text-muted-foreground">{msg.email}</p>
            </div>
          )},
          { key: "message", header: isRTL ? "الرسالة" : "Message", render: (msg: any) => <p className="truncate max-w-[300px]">{msg.message}</p>, hideOnMobile: true },
          { key: "date", header: isRTL ? "التاريخ" : "Date", render: (msg: any) => format(new Date(msg.created_at), "dd MMM yyyy HH:mm", { locale: isRTL ? ar : enUS }), hideOnMobile: true },
        ]}
        data={messages || []}
        isLoading={isLoading}
        rowKey={(msg: any) => msg.id}
        actions={[
          { label: isRTL ? "عرض" : "View", icon: <Eye className="h-4 w-4" />, onClick: (msg: any) => openMessage(msg) },
        ]}
        searchPlaceholder={isRTL ? "بحث في الرسائل..." : "Search messages..."}
        onSearch={(msg: any, term: string) => msg.name.toLowerCase().includes(term) || msg.email.toLowerCase().includes(term) || msg.message.toLowerCase().includes(term)}
        emptyState={{ icon: <Mail className="h-10 w-10 text-muted-foreground/60" />, title: isRTL ? "لا توجد رسائل" : "No messages found" }}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isRTL ? "تفاصيل الرسالة" : "Message Details"}</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {selectedMessage.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{selectedMessage.name}</h4>
                  <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${selectedMessage.email}`} className="hover:text-primary">{selectedMessage.email}</a>
                    </div>
                    {selectedMessage.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${selectedMessage.phone}`} className="hover:text-primary">{selectedMessage.phone}</a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  {format(new Date(selectedMessage.created_at), "dd MMMM yyyy - HH:mm", { locale: isRTL ? ar : enUS })}
                </p>
                <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => window.open(`mailto:${selectedMessage.email}`, "_blank")}>
                  <Mail className="h-4 w-4 me-2" />{isRTL ? "رد بالبريد" : "Reply by Email"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerMessages;