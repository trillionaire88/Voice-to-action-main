import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const visits = Number(localStorage.getItem("vta-visits") || "0") + 1;
    localStorage.setItem("vta-visits", String(visits));
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (visits >= 3) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent), []);
  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border shadow-lg rounded-xl p-3">
      <p className="text-sm text-slate-700">
        {isIOS ? "Tap share then 'Add to Home Screen' for the best experience." : "Add Voice to Action to your home screen for the best experience."}
      </p>
      <div className="flex gap-2 mt-2">
        {!isIOS && deferredPrompt && (
          <Button
            size="sm"
            onClick={async () => {
              await deferredPrompt.prompt();
              setVisible(false);
            }}
          >
            Install
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => {
          localStorage.setItem("install-prompt-hide-until", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
          setVisible(false);
        }}>Not now</Button>
      </div>
    </div>
  );
}
