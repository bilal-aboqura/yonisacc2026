import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, Mail, Phone, Check, X } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const OwnerMessages = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
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
      const { error } = await supabase
        .from("contact_messages")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-messages"] });
    },
  });

  const openMessage = (message: any) => {
    setSelectedMessage(message);
    setIsDialogOpen(true);
    if (!message.is_read) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const filteredMessages = messages?.filter(
    (msg) =>
      msg.name.toLowerCase().includes(search.toLowerCase()) ||
      msg.email.toLowerCase().includes(search.toLowerCase()) ||
      msg.message.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = messages?.filter((m) => !m.is_read).length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {isRTL ? "رسائل التواصل" : "Contact Messages"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "عرض رسائل العملاء من صفحة التواصل" : "View customer messages from contact form"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-primary text-primary-foreground">
            {unreadCount} {isRTL ? "غير مقروءة" : "unread"}
          </Badge>
        )}
      </div>

      {/* Search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث في الرسائل..." : "Search messages..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>{isRTL ? "المرسل" : "Sender"}</TableHead>
                <TableHead>{isRTL ? "الرسالة" : "Message"}</TableHead>
                <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isRTL ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredMessages?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {isRTL ? "لا توجد رسائل" : "No messages found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMessages?.map((msg) => (
                  <TableRow
                    key={msg.id}
                    className={!msg.is_read ? "bg-primary/5" : ""}
                  >
                    <TableCell>
                      {!msg.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className={`font-medium ${!msg.is_read ? "font-bold" : ""}`}>
                          {msg.name}
                        </p>
                        <p className="text-sm text-muted-foreground">{msg.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="truncate max-w-[300px]">{msg.message}</p>
                    </TableCell>
                    <TableCell>
                      {format(new Date(msg.created_at), "dd MMM yyyy HH:mm", {
                        locale: isRTL ? ar : enUS,
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openMessage(msg)}
                      >
                        <Eye className="h-4 w-4 me-1" />
                        {isRTL ? "عرض" : "View"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Message Details Dialog */}
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
                      <a href={`mailto:${selectedMessage.email}`} className="hover:text-primary">
                        {selectedMessage.email}
                      </a>
                    </div>
                    {selectedMessage.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${selectedMessage.phone}`} className="hover:text-primary">
                          {selectedMessage.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  {format(new Date(selectedMessage.created_at), "dd MMMM yyyy - HH:mm", {
                    locale: isRTL ? ar : enUS,
                  })}
                </p>
                <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(`mailto:${selectedMessage.email}`, "_blank")}
                >
                  <Mail className="h-4 w-4 me-2" />
                  {isRTL ? "رد بالبريد" : "Reply by Email"}
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
