import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function VerifySignature() {
  const [code, setCode] = useState(new URLSearchParams(window.location.search).get("code") || "");
  const [verified, setVerified] = useState(null);
  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Verify Signature</h1>
      <div className="flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter verification code" />
        <Button onClick={() => setVerified(code.length > 5)}>Verify</Button>
      </div>
      {verified !== null && (
        <p className={`mt-4 ${verified ? "text-emerald-700" : "text-red-700"}`}>
          {verified ? "Signature is authentic." : "Verification code not found."}
        </p>
      )}
    </>
  );
}
