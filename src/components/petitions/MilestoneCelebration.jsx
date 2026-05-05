import React, { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SocialShareButtons from "@/components/social/SocialShareButtons";

const MILESTONES = [100, 500, 1000, 5000, 10000, 50000, 100000];

export default function MilestoneCelebration({ petitionId, title, count }) {
  const [open, setOpen] = useState(false);
  const hitMilestone = useMemo(
    () => MILESTONES.slice().reverse().find((m) => (count || 0) >= m),
    [count],
  );

  useEffect(() => {
    if (!petitionId || !hitMilestone) return;
    const key = `milestone:${petitionId}:${hitMilestone}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    setOpen(true);
    confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } });
  }, [petitionId, hitMilestone]);

  if (!hitMilestone) return null;

  const nextMilestone = MILESTONES.find((m) => m > hitMilestone) || hitMilestone * 2;
  const message = `We just hit ${hitMilestone.toLocaleString()} signatures on '${title}'! Help us reach ${nextMilestone.toLocaleString()}!`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>🎉 {hitMilestone.toLocaleString()} signatures reached!</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">{message}</p>
        <SocialShareButtons title={message} />
        <Button onClick={() => setOpen(false)} className="w-full">Continue</Button>
      </DialogContent>
    </Dialog>
  );
}
