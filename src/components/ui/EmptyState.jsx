import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

/**
 * Standard empty state with icon, title, body text, and optional action button.
 * <EmptyState icon={FileText} title="No petitions yet" text="Create your first petition." action={{ label: "Create", onClick: () => {} }} />
 */
export default function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", text, action, className }) {
  return (
    <div className={cn("empty-state", className)}>
      <div className="p-4 bg-slate-50 rounded-2xl">
        <Icon className="empty-state-icon" />
      </div>
      <div>
        <p className="empty-state-title">{title}</p>
        {text && <p className="empty-state-text mt-1">{text}</p>}
      </div>
      {action && (
        <Button onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}
