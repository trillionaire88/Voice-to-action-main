import { useEffect, useState } from "react";
import { AlertTriangle, XCircle, X } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function PaymentErrorBanner() {
  const [type, setType] = useState("");
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment_error") === "1") setType("error");
    if (params.get("payment_cancelled") === "1") setType("cancelled");
    if (params.get("payment_error") === "1" || params.get("payment_cancelled") === "1") {
      const timer = setTimeout(() => setType(""), 8000);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  if (!type) return null;

  const isError = type === "error";
  return (
    <div className={`mx-auto max-w-7xl mt-2 px-3 py-2 rounded-lg border flex items-center justify-between ${isError ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
      <div className="flex items-center gap-2 text-sm">
        {isError ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        <span>
          {isError
            ? "Your payment could not be completed. Please try again or contact support."
            : "Payment was cancelled. No charge was made."}
        </span>
      </div>
      <button onClick={() => setType("")} aria-label="Dismiss payment notice">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
