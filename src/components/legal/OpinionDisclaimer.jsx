import React from "react";

export default function OpinionDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <p className="text-xs text-slate-400 italic border-t border-slate-100 pt-2 mt-2">
        The opinions expressed here belong solely to the user who posted them and do not represent the views of the platform or its owner.
      </p>
    );
  }
  return (
    <div className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
      The opinions expressed in this content belong solely to the user who posted it and do not represent the views of the platform or its owner.
    </div>
  );
}