
export default function PriceDisplay({
  originalPrice,
  discountAmount,
  finalPrice,
  showBreakdown = true,
  className = ""
}) {
  if (!showBreakdown) {
    return (
      <div className={`text-lg font-semibold text-slate-900 ${className}`}>
        ${(finalPrice / 100).toFixed(2)}
      </div>
    );
  }

  return (
    <div className={`space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Original price:</span>
        <span className="font-mono text-slate-900">${(originalPrice / 100).toFixed(2)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-emerald-600">Discount:</span>
          <span className="font-mono text-emerald-600">-${(discountAmount / 100).toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-2">
        <span>Final price:</span>
        <span className="font-mono text-lg text-blue-600">${(finalPrice / 100).toFixed(2)}</span>
      </div>
    </div>
  );
}