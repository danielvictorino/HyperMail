interface InboxZeroArtworkProps {
  sectionLabel: string;
}

export function InboxZeroArtwork({ sectionLabel }: InboxZeroArtworkProps) {
  const seed = createDailySeed(sectionLabel);
  const arcs = Array.from({ length: 4 }, (_, index) => {
    const offset = (seed + index * 17) % 100;
    const radius = 24 + index * 14 + (seed % 7);
    const opacity = 0.08 + index * 0.04;
    const rotation = (seed * (index + 3)) % 360;
    return {
      id: `${index}-${offset}`,
      radius,
      opacity,
      rotation,
      x: 56 + ((offset * 7) % 76),
      y: 58 + ((offset * 11) % 74)
    };
  });

  return (
    <div className="w-full max-w-[320px] rounded-[28px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <svg
        viewBox="0 0 220 220"
        className="h-auto w-full rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.24),transparent_42%),linear-gradient(180deg,rgba(13,16,23,0.98),rgba(7,8,11,0.98))]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hm-zero-gradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(196,181,253,0.95)" />
            <stop offset="50%" stopColor="rgba(129,140,248,0.85)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.7)" />
          </linearGradient>
        </defs>
        <rect width="220" height="220" fill="transparent" />
        <circle cx="110" cy="96" r="58" fill="url(#hm-zero-gradient)" opacity="0.18" />
        {arcs.map((arc) => (
          <g
            key={arc.id}
            transform={`translate(${arc.x} ${arc.y}) rotate(${arc.rotation})`}
            opacity={arc.opacity}
          >
            <ellipse
              cx="0"
              cy="0"
              rx={arc.radius}
              ry={arc.radius * 0.52}
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="1.2"
            />
          </g>
        ))}
        <path
          d="M48 142c20-13 40-19 62-19 26 0 44 6 62 19"
          fill="none"
          stroke="rgba(255,255,255,0.82)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M64 126c12-7 28-11 46-11 20 0 34 3 46 11"
          fill="none"
          stroke="rgba(255,255,255,0.42)"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="92" cy="90" r="6" fill="rgba(255,255,255,0.9)" />
        <circle cx="128" cy="82" r="3.5" fill="rgba(196,181,253,0.92)" />
      </svg>
    </div>
  );
}

function createDailySeed(sectionLabel: string): number {
  const source = `${new Date().toISOString().slice(0, 10)}:${sectionLabel.toLowerCase()}`;
  let hash = 0;

  for (const character of source) {
    hash = (hash * 31 + character.charCodeAt(0)) % 9973;
  }

  return hash;
}
