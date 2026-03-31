import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatLoss } from "@/lib/utils";
import { Flame, ChevronUp } from "lucide-react";

export function LossCounter() {
  const { data: stats } = useQuery<{
    totalLossAi: number;
    totalLossCrypto: number;
    totalLossIot: number;
    totalIncidents: number;
  }>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stats");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const totalLoss = (stats?.totalLossAi || 0) + (stats?.totalLossCrypto || 0) + (stats?.totalLossIot || 0);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-foreground/95 backdrop-blur-sm border-t border-border" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="h-5 w-5 text-red-500 fire-icon" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-background/60 font-arabic">إجمالي الخسائر المسجلة:</span>
            <span className="font-mono text-sm font-bold text-red-400 counter-animate" data-testid="text-total-loss">
              {formatLoss(totalLoss)}
            </span>
          </div>
          <span className="text-background/30 mx-2">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-background/60 font-arabic">الحوادث:</span>
            <span className="font-mono text-sm font-bold text-background/90" data-testid="text-total-incidents">
              {stats?.totalIncidents || 0}
            </span>
          </div>
        </div>
        <button 
          onClick={scrollToTop}
          className="p-1.5 rounded-md hover:bg-background/10 transition-colors text-background/60 hover:text-background"
          aria-label="العودة للأعلى"
          data-testid="button-scroll-top"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
