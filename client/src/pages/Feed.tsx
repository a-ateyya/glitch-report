import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Incident } from "@shared/schema";
import { HeroSection } from "@/components/HeroSection";
import { FilterBar } from "@/components/FilterBar";
import { IncidentCard } from "@/components/IncidentCard";
import { LossCounter } from "@/components/LossCounter";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, FileWarning } from "lucide-react";

export default function Feed() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [starred, setStarred] = useState(false);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, error } = useQuery<{ incidents: Incident[]; total: number }>({
    queryKey: ["/api/incidents", category, search, starred, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (search) params.set("search", search);
      if (starred) params.set("starred", "true");
      params.set("limit", limit.toString());
      const res = await apiRequest("GET", `/api/incidents?${params}`);
      return res.json();
    },
  });

  const incidents = data?.incidents || [];
  const hasMore = incidents.length < (data?.total || 0);

  return (
    <div className="min-h-screen bg-background pb-16">
      <HeroSection />
      <FilterBar
        category={category}
        setCategory={setCategory}
        search={search}
        setSearch={setSearch}
        starred={starred}
        setStarred={setStarred}
      />

      <main className="max-w-4xl mx-auto px-4 py-6" dir="rtl">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <span className="text-sm font-arabic">جارٍ تحميل الحوادث...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-destructive">
            <AlertCircle className="h-8 w-8 mb-3" />
            <span className="text-sm font-arabic">حدث خطأ في تحميل البيانات</span>
          </div>
        )}

        {!isLoading && !error && incidents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileWarning className="h-12 w-12 mb-4 opacity-40" />
            <h3 className="text-base font-medium mb-1 font-arabic">لا توجد حوادث</h3>
            <p className="text-sm font-arabic">لم يتم العثور على حوادث تطابق البحث</p>
          </div>
        )}

        {/* Incident list */}
        <div className="relative">
          {incidents.map((incident, index) => (
            <IncidentCard key={incident.id} incident={incident} index={index} />
          ))}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => setLimit((l) => l + 20)}
              className="font-arabic"
              data-testid="button-load-more"
            >
              تحميل المزيد ({data?.total ? data.total - incidents.length : 0} متبقي)
            </Button>
          </div>
        )}
      </main>

      <LossCounter />
    </div>
  );
}
