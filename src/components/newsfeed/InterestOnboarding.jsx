import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const CATS = [
  "Politics & Society",
  "Environment",
  "Economy",
  "Health",
  "Technology",
  "Human Rights",
  "Local Government",
  "Corporate Accountability",
  "Education",
  "Climate",
];

export default function InterestOnboarding({ open, onClose }) {
  const [selected, setSelected] = useState([]);
  const [country, setCountry] = useState("AU");
  const [types, setTypes] = useState({
    show_petitions: true,
    show_polls: true,
    show_discussions: true,
    show_scorecards: true,
  });

  const toggle = (c) => setSelected((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_interests").upsert(cleanForDB({
      user_id: user.id,
      categories: selected.map((s) => s.toLowerCase().replace(/\s+/g, "_")),
      country_code: country || "AU",
      ...types,
      last_updated: new Date().toISOString(),
    }), { onConflict: "user_id" });
    localStorage.setItem("feed_onboarded", "1");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Personalise your feed</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button key={c} onClick={() => toggle(c)} className={`px-3 py-1 rounded-full text-xs border ${selected.includes(c) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"}`}>{c}</button>
            ))}
          </div>
          <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 3))} placeholder="Country code (AU)" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.keys(types).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <Checkbox checked={types[k]} onCheckedChange={(v) => setTypes((p) => ({ ...p, [k]: !!v }))} />
                {k.replace("show_", "").replace("_", " ")}
              </label>
            ))}
          </div>
          <Button className="w-full" onClick={save}>Start My Feed</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
