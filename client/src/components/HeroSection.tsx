import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GlitchLogo } from "./GlitchLogo";
import { formatLoss } from "@/lib/utils";

export function HeroSection() {
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
  });

  return (
    <div className="relative overflow-hidden bg-foreground text-background" dir="rtl">
      {/* Glitch pattern background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, currentColor 2px, currentColor 3px)`,
          backgroundSize: '100% 20px',
        }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="flex flex-col items-center text-center">
          {/* Logo + Title */}
          <div className="flex items-center gap-3 mb-4">
            <GlitchLogo />
            <div>
              <h1 className="font-mono font-bold text-xl md:text-2xl glitch-text tracking-tight">
                تقرير الخلل
              </h1>
              <p className="font-mono text-xs text-background/50 tracking-wider">
                THE GLITCH REPORT
              </p>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-sm text-background/70 max-w-md font-arabic leading-relaxed mb-6">
            توثيق إخفاقات الذكاء الاصطناعي، احتيالات العملات المشفرة، وأعطال إنترنت الأشياء
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-6 md:gap-10 font-mono">
            <div className="text-center">
              <div className="text-xs text-background/40 mb-1">🤖 AI</div>
              <div className="text-sm font-bold text-purple-400">
                {formatLoss(stats?.totalLossAi || 0)}
              </div>
            </div>
            <div className="w-px h-8 bg-background/10" />
            <div className="text-center">
              <div className="text-xs text-background/40 mb-1">💰 Crypto</div>
              <div className="text-sm font-bold text-amber-400">
                {formatLoss(stats?.totalLossCrypto || 0)}
              </div>
            </div>
            <div className="w-px h-8 bg-background/10" />
            <div className="text-center">
              <div className="text-xs text-background/40 mb-1">📡 IoT</div>
              <div className="text-sm font-bold text-cyan-400">
                {formatLoss(stats?.totalLossIot || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
