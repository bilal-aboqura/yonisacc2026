import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CompanyLogoUploadProps {
  companyId: string;
  currentLogoUrl: string | null;
  isRTL: boolean;
  onLogoUpdated: (url: string | null) => void;
}

const CompanyLogoUpload = ({ companyId, currentLogoUrl, isRTL, onLogoUpdated }: CompanyLogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(isRTL ? "يرجى اختيار ملف صورة" : "Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(isRTL ? "حجم الصورة يجب أن يكون أقل من 2 ميجابايت" : "Image must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${companyId}/logo.${ext}`;

      // Remove old logo if exists
      await supabase.storage.from("company-logos").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", companyId);

      if (updateError) throw updateError;

      onLogoUpdated(publicUrl);
      toast.success(isRTL ? "تم رفع الشعار بنجاح" : "Logo uploaded successfully");
    } catch (err) {
      console.error(err);
      toast.error(isRTL ? "فشل في رفع الشعار" : "Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // List and remove all files in company folder
      const { data: files } = await supabase.storage
        .from("company-logos")
        .list(companyId);

      if (files?.length) {
        await supabase.storage
          .from("company-logos")
          .remove(files.map((f) => `${companyId}/${f.name}`));
      }

      const { error } = await supabase
        .from("companies")
        .update({ logo_url: null })
        .eq("id", companyId);

      if (error) throw error;

      onLogoUpdated(null);
      toast.success(isRTL ? "تم حذف الشعار" : "Logo removed");
    } catch {
      toast.error(isRTL ? "فشل في حذف الشعار" : "Failed to remove logo");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20 rounded-lg border-2 border-border">
        <AvatarImage src={currentLogoUrl || undefined} alt="Company logo" className="object-cover" />
        <AvatarFallback className="rounded-lg bg-muted">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {isRTL ? "PNG, JPG أو SVG - الحد الأقصى 2 ميجابايت" : "PNG, JPG or SVG - max 2MB"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin me-1" />
            ) : (
              <Upload className="h-4 w-4 me-1" />
            )}
            {isRTL ? "رفع شعار" : "Upload Logo"}
          </Button>
          {currentLogoUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin me-1" />
              ) : (
                <Trash2 className="h-4 w-4 me-1" />
              )}
              {isRTL ? "حذف" : "Remove"}
            </Button>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
};

export default CompanyLogoUpload;
