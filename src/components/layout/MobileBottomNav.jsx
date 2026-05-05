import React from "react";
import { useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Compass, FileText, User, PlusCircle, MessageSquare, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigation, resolveTabKey } from "@/lib/NavigationContext";

const NAV_ITEMS = [
  { key: "Home",       label: "Home",     icon: Home          },
  { key: "Newsfeed",   label: "Feed",     icon: Newspaper     },
  { key: "CreatePoll", label: "Create",   icon: PlusCircle,   isCreate: true },
  { key: "Messages",   label: "Messages", icon: MessageSquare  },
  { key: "Profile",    label: "Profile",  icon: User          },
];

export default function MobileBottomNav({ user, unreadCount = 0 }) {
  const location = useLocation();
  const { switchTab } = useNavigation();

  const currentTabKey = resolveTabKey(location.pathname);

  return (
    <nav
      role="navigation"
      aria-label="Main mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-end justify-around px-1 pt-1 pb-1 min-h-[56px]">
        {NAV_ITEMS.map((item) => {
          const { key, label, icon: Icon, isCreate } = item;
          const active = currentTabKey === key;

          if (isCreate) {
            return (
              <button
                key={key}
                onClick={() => switchTab(key)}
                aria-label={`${label} — open creation options`}
                className="flex flex-col items-center gap-0.5 px-2 pb-1 -mt-4"
                style={{ WebkitTapHighlightColor: "transparent", userSelect: "none" }}
              >
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/40 rounded-2xl p-3.5 active:scale-95 transition-transform duration-75">
                  <Icon className="w-6 h-6 text-white stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-semibold text-blue-600 mt-0.5">{label}</span>
              </button>
            );
          }

          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              aria-label={`Go to ${label}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[56px] min-h-[44px] transition-all duration-150 active:scale-95"
              )}
              style={{ WebkitTapHighlightColor: "transparent", userSelect: "none" }}
            >
              <div className={cn(
                "relative p-1.5 rounded-xl transition-all duration-200",
                active ? "bg-blue-50" : ""
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-all duration-200",
                  active ? "text-blue-600 stroke-[2.5]" : "text-slate-400"
                )} />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                )}
                {key === "Messages" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none",
                active ? "text-blue-600 font-semibold" : "text-slate-400"
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}