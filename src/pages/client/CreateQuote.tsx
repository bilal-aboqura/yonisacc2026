import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreateQuote = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/client/quotes")}>
          <BackIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isRTL ? "إنشاء عرض سعر جديد" : "Create New Quote"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isRTL ? "بيانات عرض السعر" : "Quote Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isRTL ? "نموذج إنشاء عرض السعر" : "Quote creation form"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateQuote;
