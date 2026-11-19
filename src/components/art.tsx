export function HouseArt({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 160 130" className={className} aria-hidden>
    <ellipse cx="80" cy="121" rx="70" ry="7" fill="var(--line)" />
    <circle cx="28" cy="80" r="20" fill="var(--sage)" /><rect x="26" y="92" width="5" height="28" rx="2" fill="#8a6a55" />
    <circle cx="136" cy="86" r="16" fill="var(--sage)" opacity=".8" /><rect x="134" y="96" width="4" height="22" rx="2" fill="#8a6a55" />
    <rect x="48" y="62" width="64" height="56" rx="6" fill="#FFF3EA" />
    <path d="M38 67 L80 28 L122 67 Z" fill="var(--pink)" />
    <path d="M80 52 c-3-4-9 0-5 5 l5 5 5-5 c4-5-2-9-5-5z" fill="#fff" />
    <rect x="72" y="90" width="18" height="28" rx="9" fill="#C98C7A" />
    <rect x="55" y="76" width="14" height="14" rx="3" fill="#BFE0F0" /><rect x="95" y="76" width="14" height="14" rx="3" fill="#BFE0F0" />
  </svg>
}
export function CatArt({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 120 70" className={className} aria-hidden>
    <ellipse cx="60" cy="52" rx="44" ry="16" fill="#F6D9D0" /><circle cx="38" cy="42" r="15" fill="#F6D9D0" />
    <path d="M26 32 L28 18 L37 28Z M44 28 L53 18 L51 33Z" fill="#F0BFB4" />
    <path d="M31 42 q3 3 6 0 M41 42 q3 3 6 0" stroke="#6b4b4b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <ellipse cx="38" cy="47" rx="2" ry="1.4" fill="#E58FA0" />
    <path d="M100 54 q14-4 10-16" stroke="#F0BFB4" strokeWidth="8" fill="none" strokeLinecap="round" />
  </svg>
}
