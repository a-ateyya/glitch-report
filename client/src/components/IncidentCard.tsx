import type { Incident } from "@shared/schema";
import { formatDateArabic } from "@/lib/utils";

// Category icon SVGs
const catIcons: Record<string, JSX.Element> = {
  ai: (
    <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93"/><path d="M8 6a4 4 0 0 1 8 0"/><path d="M12 18v4"/><path d="M8 22h8"/><circle cx="12" cy="14" r="4"/>
    </svg>
  ),
  crypto: (
    <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5"/>
    </svg>
  ),
  iot: (
    <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12z"/>
    </svg>
  ),
};

const catLabels: Record<string, string> = {
  ai: "ذكاء اصطناعي",
  crypto: "كريبتو",
  iot: "إنترنت الأشياء",
};

const catColorClasses: Record<string, { card: string; strip: string; text: string }> = {
  ai: { card: "card-ai", strip: "strip-ai", text: "text-ai" },
  crypto: { card: "card-crypto", strip: "strip-crypto", text: "text-crypto" },
  iot: { card: "card-iot", strip: "strip-iot", text: "text-iot" },
};

// Dollar sign SVG for loss amount
function DollarIcon() {
  return (
    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}

// People icon for jobs lost
function PeopleIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

// X (Twitter) icon
function XIcon() {
  return (
    <svg className="w-2.5 h-2.5 flex-shrink-0 opacity-60" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

// LinkedIn icon
function LinkedInIcon() {
  return (
    <svg className="w-2.5 h-2.5 flex-shrink-0 opacity-60" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Detect if a source URL is a tweet / LinkedIn post */
function getSourceType(url: string): "x" | "linkedin" | "generic" {
  if (/x\.com|twitter\.com/i.test(url)) return "x";
  if (/linkedin\.com/i.test(url)) return "linkedin";
  return "generic";
}

interface IncidentCardProps {
  incident: Incident;
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const cat = incident.category || "ai";
  const colors = catColorClasses[cat] || catColorClasses.ai;

  let sources: Array<{ title: string; url: string }> = [];
  try {
    sources = JSON.parse(incident.sourcesJson || "[]");
  } catch {}

  const lossAmount = incident.lossAmount ? Number(incident.lossAmount) : null;
  const jobsLost = (incident as any).jobsLost ? Number((incident as any).jobsLost) : null;
  const company = (incident as any).company as string | null;

  return (
    <article
      className={`${colors.card} border rounded-md overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg`}
      data-testid={`card-incident-${incident.id}`}
    >
      {/* Category strip — 3px top bar */}
      <div className={`h-[3px] w-full ${colors.strip}`} aria-hidden="true" />

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2 min-w-0 overflow-hidden">
        {/* Top row: category label + company pill */}
        <div className="flex items-center justify-between gap-2">
          <span className={`${colors.text} text-[0.6875rem] font-semibold inline-flex items-center gap-1`}>
            {catIcons[cat]}
            {catLabels[cat]}
          </span>
          {company && (
            <span
              className="font-mono text-[0.6875rem] font-medium text-muted-foreground bg-foreground/[0.04] px-2 py-px rounded-full border border-border whitespace-nowrap tracking-[0.01em]"
              style={{ direction: "ltr", unicodeBidi: "isolate" }}
              data-testid={`company-${incident.id}`}
            >
              {company}
            </span>
          )}
        </div>

        {/* Title */}
        <h2
          className="text-sm font-semibold leading-[1.55] line-clamp-2"
          data-testid={`text-title-${incident.id}`}
        >
          {incident.titleAr}
        </h2>

        {/* Impact metrics: loss + jobs lost */}
        {(lossAmount || jobsLost) && (
          <div className="flex items-center gap-3">
            {lossAmount && lossAmount > 0 && (
              <div
                className="font-mono text-xs font-bold text-destructive inline-flex items-center gap-1"
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
                data-testid={`loss-${incident.id}`}
              >
                <DollarIcon />
                {formatNumber(lossAmount)}
              </div>
            )}
            {jobsLost && jobsLost > 0 && (
              <div
                className="font-mono text-xs font-bold text-ai inline-flex items-center gap-1"
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
                data-testid={`jobs-${incident.id}`}
              >
                <PeopleIcon />
                {formatNumber(jobsLost)}
              </div>
            )}
          </div>
        )}

        {/* Footer: date + sources */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
          <span className="text-[0.6875rem] text-muted-foreground/50">
            {formatDateArabic(incident.date)}
          </span>
          {sources.map((source, i) => {
            const srcType = getSourceType(source.url);
            if (srcType === "x") {
              return (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[0.625rem] text-muted-foreground bg-foreground/[0.04] px-1.5 py-px rounded-sm inline-flex items-center gap-1 hover:text-foreground hover:bg-foreground/[0.08] transition-colors"
                  style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  data-testid={`link-source-${incident.id}-${i}`}
                >
                  <XIcon />
                  {source.title}
                </a>
              );
            }
            if (srcType === "linkedin") {
              return (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[0.625rem] text-muted-foreground bg-foreground/[0.04] px-1.5 py-px rounded-sm inline-flex items-center gap-1 hover:text-foreground hover:bg-foreground/[0.08] transition-colors"
                  style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  data-testid={`link-source-${incident.id}-${i}`}
                >
                  <LinkedInIcon />
                  {source.title}
                </a>
              );
            }
            return (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[0.625rem] text-muted-foreground bg-foreground/[0.04] px-1.5 py-px rounded-sm inline-flex items-center gap-1 hover:text-foreground hover:bg-foreground/[0.08] transition-colors"
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
                data-testid={`link-source-${incident.id}-${i}`}
              >
                {source.title}
              </a>
            );
          })}
        </div>
      </div>
    </article>
  );
}
