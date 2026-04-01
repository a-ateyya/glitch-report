interface FilterBarProps {
  category: string;
  setCategory: (cat: string) => void;
  search: string;
  setSearch: (s: string) => void;
}

const categories = [
  { key: "all", labelAr: "الكل", dot: null },
  { key: "ai", labelAr: "ذكاء اصطناعي", dot: "bg-ai" },
  { key: "crypto", labelAr: "كريبتو", dot: "bg-crypto" },
  { key: "iot", labelAr: "إنترنت الأشياء", dot: "bg-iot" },
];

export function FilterBar({ category, setCategory, search, setSearch }: FilterBarProps) {
  return (
    <nav
      className="border-b border-border"
      dir="rtl"
      aria-label="تصفية الحوادث"
    >
      <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center gap-3 flex-wrap overflow-x-auto">
        {/* Filter pills */}
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                category === cat.key
                  ? "pill-active"
                  : "border-border text-muted-foreground hover:border-border hover:text-foreground"
              }`}
              aria-pressed={category === cat.key}
              data-testid={`button-filter-${cat.key}`}
            >
              {cat.dot && (
                <span className={`w-1.5 h-1.5 rounded-full ${cat.dot} flex-shrink-0`} aria-hidden="true" />
              )}
              {cat.labelAr}
            </button>
          ))}
        </div>

        {/* Search box */}
        <div className="relative mr-auto flex-shrink-0">
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الحوادث..."
            className="bg-card border border-border rounded-md py-1 px-3 pr-8 text-xs text-foreground w-[180px] sm:w-[200px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-ai focus:ring-2 focus:ring-ai/10"
            style={{ fontFamily: "inherit" }}
            aria-label="بحث في الحوادث"
            data-testid="input-search"
          />
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
          <span>ترتيب:</span>
          <select
            className="bg-card border border-border rounded-sm px-2 py-0.5 text-xs text-muted-foreground"
            style={{ fontFamily: "inherit" }}
            aria-label="ترتيب الحوادث"
            data-testid="select-sort"
          >
            <option>الأحدث أولاً</option>
            <option>الأعلى خطورة</option>
            <option>الأكبر خسائر</option>
          </select>
        </div>
      </div>
    </nav>
  );
}
