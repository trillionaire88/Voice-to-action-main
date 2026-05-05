import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native-style iOS bottom sheet.
 * On desktop (md+) it renders nothing and falls back to whatever the caller provides.
 * On mobile it overlays a draggable bottom sheet.
 */
export default function MobileBottomSheet({ open, onClose, title, children, maxHeight = "70vh" }) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-white rounded-t-3xl shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <span className="text-base font-semibold text-slate-900">{title}</span>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto overscroll-contain" style={{ maxHeight }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** A single action row inside the bottom sheet */
export function SheetItem({ icon: Icon, label, onClick, danger, badge }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full px-5 py-4 text-left transition-colors active:bg-slate-50",
        danger ? "text-red-600" : "text-slate-800"
      )}
      style={{ minHeight: 56 }}
    >
      {Icon && (
        <span className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0",
          danger ? "bg-red-50" : "bg-slate-100"
        )}>
          <Icon className="w-5 h-5" />
        </span>
      )}
      <span className="flex-1 text-base font-medium">{label}</span>
      {badge && (
        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
          {badge}
        </span>
      )}
    </button>
  );
}

/** Separator between sheet item groups */
export function SheetSeparator() {
  return <div className="h-px bg-slate-100 mx-5" />;
}