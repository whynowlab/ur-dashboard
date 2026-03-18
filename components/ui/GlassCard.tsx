interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={`
        rounded-2xl
        bg-white/65
        backdrop-blur-xl
        border border-white/70
        shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,0.3)]
        ring-1 ring-white/40
        p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}
