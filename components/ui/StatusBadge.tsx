interface StatusBadgeProps {
  status: "active" | "standby" | "interrupted";
}

const styles = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  standby: "bg-gray-100 text-gray-500 border-gray-200",
  interrupted: "bg-amber-100 text-amber-700 border-amber-200",
};

const labels = {
  active: "Active",
  standby: "Standby",
  interrupted: "Interrupted",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-0.5
        rounded-full
        text-xs font-medium
        border
        ${styles[status]}
      `}
    >
      {status === "active" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      {labels[status]}
    </span>
  );
}
