import { Search, Star, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { categoryInfo } from "@/lib/utils";

interface FilterBarProps {
  category: string;
  setCategory: (cat: string) => void;
  search: string;
  setSearch: (s: string) => void;
  starred: boolean;
  setStarred: (s: boolean) => void;
}

export function FilterBar({
  category,
  setCategory,
  search,
  setSearch,
  starred,
  setStarred,
}: FilterBarProps) {
  const categories = [
    { key: "all", labelAr: "الكل", emoji: "📋" },
    ...Object.entries(categoryInfo).map(([key, info]) => ({
      key,
      labelAr: info.labelAr,
      emoji: info.emoji,
    })),
  ];

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          {/* Category pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap pb-1 md:pb-0">
            {categories.map((cat) => (
              <Button
                key={cat.key}
                variant={category === cat.key ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(cat.key)}
                className="text-xs h-7 px-2.5"
                data-testid={`button-filter-${cat.key}`}
              >
                <span className="ml-1">{cat.emoji}</span>
                {cat.labelAr}
              </Button>
            ))}
          </div>

          <div className="h-5 w-px bg-border hidden md:block" />

          {/* Starred filter */}
          <Button
            variant={starred ? "default" : "outline"}
            size="sm"
            onClick={() => setStarred(!starred)}
            className="text-xs h-7 px-2.5"
            data-testid="button-filter-starred"
          >
            <Star className={`h-3 w-3 ml-1 ${starred ? "fill-current" : ""}`} />
            مميز
          </Button>

          {/* Search */}
          <div className="relative w-full md:flex-1 md:min-w-[200px] md:mr-auto">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="h-7 text-xs pr-9 font-mono"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
