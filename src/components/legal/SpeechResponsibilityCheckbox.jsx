import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

export default function SpeechResponsibilityCheckbox({ checked, onChange, context = "content" }) {
  const contextLabel = {
    petition: "this petition",
    comment: "this comment",
    community: "this community",
    content: "this content",
  }[context] || "this content";

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Shield className="h-4 w-4 text-blue-600 shrink-0" />
      <AlertDescription className="text-blue-900">
        <p className="font-semibold mb-2">User Speech Responsibility</p>
        <ul className="text-xs text-blue-800 space-y-1 mb-3 list-disc ml-4">
          <li>I am solely responsible for the content I publish on this platform.</li>
          <li>The platform acts only as a hosting provider and does not verify or endorse my opinions.</li>
          <li>I will not post content that includes credible threats of violence, unlawful harassment, or calls to unlawful activity.</li>
          <li>I understand my content may be removed if it violates applicable laws or platform rules.</li>
        </ul>
        <div className="flex items-start gap-2">
          <Checkbox id="speech-responsibility" checked={checked} onCheckedChange={onChange} />
          <Label htmlFor="speech-responsibility" className="text-xs cursor-pointer font-medium leading-snug">
            I accept full responsibility for {contextLabel} and confirm it complies with the above terms.
          </Label>
        </div>
      </AlertDescription>
    </Alert>
  );
}