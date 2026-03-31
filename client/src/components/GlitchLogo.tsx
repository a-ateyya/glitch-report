export function GlitchLogo({ size = "default" }: { size?: "default" | "small" }) {
  const isSmall = size === "small";
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={isSmall ? "w-7 h-7" : "w-10 h-10"}
      aria-label="The Glitch Report Logo"
    >
      {/* Broken circuit board / glitch square */}
      <rect x="4" y="4" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 3" />
      {/* Inner glitch lines */}
      <path d="M12 14L18 14L20 18L24 12L28 12" stroke="hsl(0, 72%, 51%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22L16 22L18 26L22 20L28 20" stroke="hsl(0, 72%, 51%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 28L28 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* Glitch dot */}
      <circle cx="30" cy="10" r="2.5" fill="hsl(0, 72%, 51%)" />
    </svg>
  );
}
