import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "vta_push_prompt_dismissed_v1";

export default function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if: browser supports notifications, not already granted/denied, not dismissed
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Show after a short delay so it doesn't feel intrusive
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const allow = async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    await Notification.requestPermission();
  };

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-3 pointer-events-none">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 max-w-lg w-full pointer-events-auto animate-in slide-in-from-top-2 duration-300">
        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-blue-600" />
        </div>
        <p className="flex-1 text-sm text-slate-700 font-medium">
          Get notified when your petitions hit milestones
        </p>
        <Button size="sm" onClick={allow} className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 h-8 px-3 text-xs">
          Enable
        </Button>
        <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}