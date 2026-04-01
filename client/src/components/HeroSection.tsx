import { ThemeToggle } from "./ThemeToggle";
import { Link } from "wouter";

export function HeroSection() {
  return (
    <header className="border-b border-border" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Logo area */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className="logo-glitch text-xl font-bold leading-tight tracking-tight"
                data-text="تقرير الخلل"
              >
                تقرير الخلل
              </span>
              <span
                className="font-mono text-[0.625rem] text-muted-foreground/50 tracking-[0.1em] uppercase"
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
              >
                THE GLITCH REPORT
              </span>
            </div>
          </div>

          {/* Controls: about link + LIVE + theme toggle */}
          <div className="flex items-center gap-3 flex-shrink-0 pt-1">
            <Link
              href="/about"
              className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
              data-testid="link-about"
            >
              عن الموقع
            </Link>
            <div
              className="flex items-center gap-2 font-mono text-xs text-muted-foreground/50"
              style={{ direction: "ltr", unicodeBidi: "isolate" }}
            >
              <span
                className="live-dot inline-block w-1.5 h-1.5 rounded-full bg-green-500"
                aria-hidden="true"
              />
              <span>LIVE</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
