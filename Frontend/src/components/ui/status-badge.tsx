import { cn } from "@/lib/utils";

type BadgeVariant = "pending" | "analyzing" | "success" | "error";

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  pending: "bg-muted text-muted-foreground",
  analyzing: "bg-warning/10 text-warning border-warning/20",
  success: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

const variantIcons: Record<BadgeVariant, string> = {
  pending: "⏳",
  analyzing: "🔄",
  success: "✓",
  error: "✕",
};

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-300",
        variantStyles[variant],
        className
      )}
    >
      <span className={variant === "analyzing" ? "animate-spin" : ""}>
        {variantIcons[variant]}
      </span>
      {children}
    </span>
  );
}
