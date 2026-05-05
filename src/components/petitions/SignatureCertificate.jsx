import React from "react";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/constants/siteUrl";

export default function SignatureCertificate({ petitionTitle, signerName = "Anonymous Supporter", verificationCode }) {
  return (
    <Button
      variant="outline"
      onClick={() => {
        const content = `Signature Certificate\n\nName: ${signerName}\nPetition: ${petitionTitle}\nDate: ${new Date().toISOString()}\nVerification code: ${verificationCode}\nVerify at: ${appUrl(`/VerifySignature?code=${verificationCode}`)}`;
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "signature-certificate.txt";
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Download Signature Certificate
    </Button>
  );
}
