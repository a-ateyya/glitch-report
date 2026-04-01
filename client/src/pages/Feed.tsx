import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Incident } from "@shared/schema";
import { HeroSection } from "@/components/HeroSection";
import { FilterBar } from "@/components/FilterBar";
import { IncidentCard } from "@/components/IncidentCard";
import { Loader2, AlertCircle, FileWarning } from "lucide-react";

export default function Feed() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);

  const { data, isLoading, error } = useQuery<{ incidents: Incident[]; total: number }>({
    queryKey: ["/api/incidents", category, search, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (search) params.set("search", search);
      params.set("limit", limit.toString());
      const res = await apiRequest("GET", `/api/incidents?${params}`);
      return res.json();
    },
  });

  const incidents = data?.incidents || [];
  const hasMore = incidents.length < (data?.total || 0);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl">
      {/* Ambient glow (dark mode only) */}
      <div className="ambient-glow" aria-hidden="true" />

      <HeroSection />
      <FilterBar
        category={category}
        setCategory={setCategory}
        search={search}
        setSearch={setSearch}
      />

      <main className="max-w-[1440px] mx-auto px-4 py-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <span className="text-sm">جارٍ تحميل الحوادث...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-destructive">
            <AlertCircle className="h-8 w-8 mb-3" />
            <span className="text-sm">حدث خطأ في تحميل البيانات</span>
          </div>
        )}

        {!isLoading && !error && incidents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileWarning className="h-12 w-12 mb-4 opacity-40" />
            <h3 className="text-base font-medium mb-1">لا توجد حوادث</h3>
            <p className="text-sm">لم يتم العثور على حوادث تطابق البحث</p>
          </div>
        )}

        {/* Dense 4-column card grid */}
        <section
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          aria-label="قائمة الحوادث"
        >
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </section>

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mt-6 mb-8">
            <button
              onClick={() => setLimit((l) => l + 50)}
              className="px-4 py-2 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              data-testid="button-load-more"
            >
              تحميل المزيد ({data?.total ? data.total - incidents.length : 0} متبقي)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
