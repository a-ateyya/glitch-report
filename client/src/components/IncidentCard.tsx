import { useState } from "react";
import type { Incident } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  categoryInfo,
  severityInfo,
  formatDateArabic,
  formatDateRelative,
  formatLossArabic,
} from "@/lib/utils";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Star,
  AlertTriangle,
} from "lucide-react";

interface IncidentCardProps {
  incident: Incident;
  index: number;
}

export function IncidentCard({ incident, index }: IncidentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const category = categoryInfo[incident.category];
  const severity = severityInfo[incident.severity];

  let sources: Array<{ title: string; url: string; archiveUrl?: string }> = [];
  try {
    sources = JSON.parse(incident.sourcesJson || "[]");
  } catch {}

  let tags: string[] = [];
  try {
    tags = JSON.parse(incident.tagsJson || "[]");
  } catch {}

  const isLong = incident.descriptionAr.length > 300;
  const displayText = isLong && !expanded
    ? incident.descriptionAr.slice(0, 300) + "..."
    : incident.descriptionAr;

  return (
    <div className="relative flex items-start gap-4 mb-6" data-testid={`card-incident-${incident.id}`}>
      {/* Timeline node */}
      <div className="hidden md:flex flex-col items-center flex-shrink-0 pt-4">
        <div className="w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center text-lg shadow-sm">
          {category?.emoji || "⚠️"}
        </div>
        <div className="w-0.5 flex-1 bg-border mt-2" />
      </div>

      {/* Card */}
      <Card className="flex-1 overflow-hidden border border-border/60 hover:border-border transition-colors">
        <div className="p-4 md:p-5">
          {/* Header: date + badges */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground" data-testid={`text-date-${incident.id}`}>
                {formatDateArabic(incident.date)}
              </span>
              <span className="text-muted-foreground/40 text-xs">
                ({formatDateRelative(incident.date)})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {incident.isStarred === 1 && (
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              )}
              <span className={`${category?.colorClass} text-xs font-medium px-2 py-0.5 rounded-full`}>
                {category?.emoji} {category?.labelAr}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-mono font-bold text-base md:text-lg mb-2 leading-relaxed" data-testid={`text-title-${incident.id}`}>
            {incident.lossAmount ? (
              <span className="text-red-500 dark:text-red-400">
                {formatLossArabic(incident.lossAmount)}{" — "}
              </span>
            ) : null}
            {incident.titleAr}
          </h3>

          {/* Severity */}
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle className={`h-3.5 w-3.5 ${severity?.colorClass}`} />
            <span className={`text-xs font-medium ${severity?.colorClass}`}>
              {severity?.emoji} {severity?.labelAr}
            </span>
          </div>

          {/* Description */}
          <div className="text-sm text-muted-foreground leading-relaxed mb-3 font-arabic">
            {displayText}
          </div>

          {isLong && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:text-primary/80 -mr-2 mb-2"
              data-testid={`button-expand-${incident.id}`}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 ml-1" />
                  تقليص
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 ml-1" />
                  قراءة المزيد
                </>
              )}
            </Button>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div className="border-t border-border/40 pt-3 mt-2">
              <span className="text-xs text-muted-foreground font-medium mb-1.5 block">المصادر:</span>
              <div className="flex flex-wrap gap-2">
                {sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-primary/80 hover:text-primary underline-offset-2 hover:underline"
                    data-testid={`link-source-${incident.id}-${i}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-mono">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
