import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SUPPORT_EMAIL } from "@/constants/siteUrl";

export default function AnalyticsAPI() {
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Premium Analytics API</h1>
      <p className="text-slate-700 mb-3">$299 AUD/month for NGOs, $999 AUD/month for researchers/media.</p>
      <div className="space-y-3 max-w-xl">
        <Input placeholder="Organisation name" value={org} onChange={(e) => setOrg(e.target.value)} />
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Textarea placeholder="What data do you need?" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={() => {
          window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Analytics API Access Request")}&body=${encodeURIComponent(`Organisation: ${org}\nEmail: ${email}\nNotes: ${notes}`)}`;
          toast.success("Opening email draft");
        }}>Request Access</Button>
      </div>
    </>
  );
}
