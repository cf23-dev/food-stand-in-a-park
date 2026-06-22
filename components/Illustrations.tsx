// Reusable inline SVG illustrations + icons, themed to the brand palette.
// Line icons use `currentColor` so they inherit text color via className.

type IconProps = { className?: string };

// ─── Decorative background blob (hero / sections) ────────────────────────────
export function Blob({ className }: IconProps) {
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M421,301Q399,402,300,438Q201,474,128,387Q55,300,128,213Q201,126,300,162Q399,198,421,249Q443,300,421,301Z"
      />
    </svg>
  );
}

// ─── Hero illustration: a donation box of produce + a mapped route ───────────
export function HeroArt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 480 400" className={className} role="img" aria-label="A box of donated food being routed to a food bank">
      {/* soft backdrop */}
      <circle cx="240" cy="200" r="180" fill="#dcfce7" />
      <circle cx="240" cy="200" r="120" fill="#bbf7d0" opacity="0.6" />

      {/* dotted delivery route */}
      <path d="M70 320 C 160 300, 150 150, 250 150 S 410 120, 410 90" fill="none" stroke="#15803d" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" opacity="0.7" />

      {/* destination map pin (food bank) */}
      <g transform="translate(392,52)">
        <path d="M18 0C8 0 0 8 0 18c0 13 18 30 18 30s18-17 18-30C36 8 28 0 18 0z" fill="#f59e0b" />
        <circle cx="18" cy="18" r="7" fill="#fff" />
      </g>

      {/* little house (donor) */}
      <g transform="translate(40,300)">
        <path d="M0 26 L26 4 L52 26 Z" fill="#22c55e" />
        <rect x="8" y="26" width="36" height="28" rx="3" fill="#16a34a" />
        <rect x="20" y="38" width="12" height="16" fill="#dcfce7" />
      </g>

      {/* donation box */}
      <g transform="translate(150,200)">
        <rect x="0" y="40" width="180" height="110" rx="10" fill="#16a34a" />
        <rect x="0" y="40" width="180" height="28" rx="8" fill="#15803d" />
        <path d="M40 40 L90 12 L140 40" fill="none" stroke="#15803d" strokeWidth="8" strokeLinecap="round" />
        {/* produce poking out */}
        <circle cx="60" cy="34" r="20" fill="#ef4444" />
        <circle cx="60" cy="30" r="20" fill="#f87171" />
        <rect x="58" y="8" width="4" height="10" rx="2" fill="#16a34a" />
        <circle cx="105" cy="30" r="22" fill="#f59e0b" />
        <circle cx="148" cy="36" r="18" fill="#a3e635" />
        {/* carrot */}
        <g transform="translate(120,2) rotate(20)">
          <path d="M0 0 L10 0 L5 34 Z" fill="#fb923c" />
          <path d="M2 -2 l3 -8 M5 -2 l0 -10 M8 -2 l3 -8" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
        </g>
        {/* heart label */}
        <path d="M90 110 c -10 -12 -28 -2 -18 12 c 4 8 18 16 18 16 s 14 -8 18 -16 c 8 -14 -8 -24 -18 -12 z" fill="#dcfce7" />
      </g>
    </svg>
  );
}

// ─── Mission illustration: hands cradling a heart of food ────────────────────
export function MissionArt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 360 300" className={className} role="img" aria-label="Community hands sharing food">
      <circle cx="180" cy="150" r="130" fill="#f0fdf4" />
      <path d="M180 110 c -22 -26 -62 -4 -40 28 c 9 16 40 38 40 38 s 31 -22 40 -38 c 22 -32 -18 -54 -40 -28 z" fill="#22c55e" />
      <path d="M180 122 c -14 -16 -40 -2 -26 18 c 6 10 26 24 26 24 s 20 -14 26 -24 c 14 -20 -12 -34 -26 -18 z" fill="#dcfce7" />
      {/* hands */}
      <path d="M70 210 q 40 40 110 40 q 70 0 110 -40 q -20 50 -110 50 q -90 0 -110 -50 z" fill="#16a34a" />
      <path d="M70 210 q 40 40 110 40 q 70 0 110 -40" fill="none" stroke="#15803d" strokeWidth="4" />
    </svg>
  );
}

export function QuoteMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <path fill="currentColor" d="M16 10c-6 2-10 7-10 14v6h10V20H10c0-4 3-7 8-8l-2-2zm18 0c-6 2-10 7-10 14v6h10V20h-6c0-4 3-7 8-8l-2-2z" />
    </svg>
  );
}

// ─── Line icons (inherit color via currentColor) ─────────────────────────────
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconClipboard({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9z" />
      <path d="M8 11h8M8 15h6" />
    </svg>
  );
}

export function IconRoute({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.5" strokeDasharray="1 3" />
    </svg>
  );
}

export function IconBasket({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M4 9h16l-1.4 9.3a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7z" />
      <path d="M8 9l3-5M16 9l-3-5M9 13v3M15 13v3" />
    </svg>
  );
}

export function IconBox({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M3 8l9-4 9 4-9 4-9-4z" />
      <path d="M3 8v8l9 4 9-4V8M12 12v8" />
    </svg>
  );
}

export function IconHandHeart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M3 13l4-1 5 2c1 .5 1 2 0 2l-5 1-4-1z" />
      <path d="M12 14l6-2a1.5 1.5 0 0 1 1 2.8L13 18l-1 0" />
      <path d="M14.5 4.5c-1-1-2.6-.3-2.5 1 .1 1.2 2.5 2.5 2.5 2.5s2.4-1.3 2.5-2.5c.1-1.3-1.5-2-2.5-1z" />
    </svg>
  );
}

export function IconBuilding({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M4 21V6l8-3 8 3v15" />
      <path d="M9 21v-4h6v4M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01" />
    </svg>
  );
}
