import React, { useState } from "react";
import { MessageSquare, X } from "lucide-react";

export default function FreeExpressionBanner({ dismissible = true }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <MessageSquare className="w-4 h-4 shrink-0 mt-0.5 text-blue-300" />
        <p className="flex-1 text-slate-200 leading-relaxed">
          <span className="font-semibold text-white">Open Expression Platform: </span>
          This platform is designed to enable open expression and public debate. Users may express opinions across political, social, cultural, and ideological topics.{" "}
          <span className="text-slate-400">The platform does not endorse user opinions.</span>
        </p>
        {dismissible && (
          <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-white shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}