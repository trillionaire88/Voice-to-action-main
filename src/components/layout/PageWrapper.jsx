
/**
 * Layout shell for page content. Prefer the app Layout route wrapper for uniform spacing;
 * this component is still used for nested sections and standalone routes.
 */
export default function PageWrapper({ children, className = "", wide = false, fullWidth = false }) {
  const isWide = wide || fullWidth;
  return (
    <div
      className={`w-full mx-auto ${className}`}
      style={{
        maxWidth: isWide ? "1400px" : "1200px",
        padding: "var(--page-padding-y) var(--page-padding-x)",
        paddingBottom: "calc(var(--page-padding-y) + var(--bottom-nav-height))",
      }}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="bg-blue-600 p-2.5 rounded-xl flex-shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function TwoColumnLayout({ children, sidebar }) {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0">{children}</div>
      {sidebar && (
        <div className="hidden lg:block w-72 flex-shrink-0 sticky top-24">
          {sidebar}
        </div>
      )}
    </div>
  );
}

export function CardGrid({ children, cols = 2 }) {
  const colClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    }[cols] || "grid-cols-1 sm:grid-cols-2";

  return <div className={`grid ${colClass} gap-4`}>{children}</div>;
}
