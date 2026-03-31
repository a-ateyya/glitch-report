import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center">
        <AlertTriangle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="font-mono text-6xl font-bold text-muted-foreground/20 mb-2">404</h1>
        <p className="text-sm text-muted-foreground mb-6 font-arabic">
          الصفحة غير موجودة
        </p>
        <Link href="/">
          <Button variant="outline" className="gap-2 font-arabic" data-testid="link-go-home">
            العودة للرئيسية
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
