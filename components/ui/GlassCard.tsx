interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={`
        rounded-2xl
        bg-white/40
        backdrop-blur-xl
        border border-white/50
        shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}
