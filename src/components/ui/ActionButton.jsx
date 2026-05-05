import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function ActionButton({
  onClick,
  children,
  loading = false,
  loadingText,
  disabled = false,
  variant = "default",
  size = "default",
  className = "",
  icon: Icon,
  ...props
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      variant={variant}
      size={size}
      className={`relative transition-all duration-150 ${loading ? "opacity-90" : ""} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 mr-2" />}
          {children}
        </>
      )}
    </Button>
  );
}
