import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { persistLanguageChoice, normalizeLanguageCode } from "@/lib/languagePreference";
import { toast } from "sonner";

const OPTIONS = [
  { code: "en", label: "English", flag: "🇦🇺" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

/**
 * Language control for Security Settings only — not shown in the global header.
 */
export default function LanguagePreferenceCard({ userId, onSaved }) {
  const { i18n } = useTranslation();
  const value = normalizeLanguageCode(i18n.language);

  const handleChange = async (code) => {
    const normalized = persistLanguageChoice(code);
    if (userId) {
      const { error } = await supabase
        .from("profiles")
        .update(cleanForDB({ language_preference: normalized }))
        .eq("id", userId);
      if (error) {
        toast.error(error.message || "Could not save language to your profile.");
        return;
      }
    }
    toast.success("Language preference saved.");
    onSaved?.();
  };

  return (
    <Card className="border-slate-200 shadow-sm mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-blue-600" />
          Language
        </CardTitle>
        <CardDescription>
          Defaults to English for new accounts. Your choice is saved on this device and on your profile
          so it follows you each time you sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-w-md">
        <Label htmlFor="vta-language-select">Display language</Label>
        <Select value={value} onValueChange={handleChange}>
          <SelectTrigger id="vta-language-select" className="w-full">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((o) => (
              <SelectItem key={o.code} value={o.code}>
                <span className="mr-2">{o.flag}</span>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
