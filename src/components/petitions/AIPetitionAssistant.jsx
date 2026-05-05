import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AIPetitionAssistant({ onUseGenerated, title, description, onUseTitle, onUseDescription }) {
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (action, extra = {}) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.functions.invoke("ai-petition-writer", { body: { action, issue, title, description, ...extra } });
      setResult(data?.result || "");
      return data?.result || "";
    } finally {
      setLoading(false);
    }
  };

  if (!import.meta.env.VITE_ANTHROPIC_ENABLED) return null;

  return (
    <div className="fixed right-4 top-24 w-full max-w-sm z-40">
      <Button onClick={() => setOpen((v) => !v)} className="mb-2">✨ AI Assistant</Button>
      {open && (
        <Card>
          <CardHeader><CardTitle className="text-base">AI Petition Assistant</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe your issue in plain language" />
            <Button onClick={async () => onUseGenerated?.(await run("generate_petition"))} disabled={loading} className="w-full">
              {loading ? "AI is writing..." : "Generate petition"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={async () => onUseTitle?.(await run("improve_title"))} disabled={loading || !title}>Improve title</Button>
              <Button variant="outline" onClick={async () => onUseDescription?.(await run("improve_description"))} disabled={loading || !description}>Improve description</Button>
            </div>
            <Button variant="outline" onClick={() => run("check_tone")} disabled={loading}>Check tone</Button>
            <pre className="text-xs bg-slate-50 p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap">{result}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
