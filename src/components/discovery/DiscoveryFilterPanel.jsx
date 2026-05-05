import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import MobileSelect from "@/components/ui/MobileSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, RefreshCw } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All categories" },
  { value: "governance_policy", label: "Governance & Policy" },
  { value: "economy_living", label: "Economy & Cost of Living" },
  { value: "health_wellbeing", label: "Health & Wellbeing" },
  { value: "environment_climate", label: "Environment & Climate" },
  { value: "technology_ai", label: "Technology & AI" },
  { value: "education", label: "Education" },
  { value: "corporate_business", label: "Corporate & Business" },
  { value: "civil_rights_ethics", label: "Civil Rights & Ethics" },
  { value: "local_community", label: "Local Community" },
  { value: "global_affairs", label: "Global Affairs" },
];

const LOCATIONS = [
  { value: "global", label: "Global" },
  { value: "country", label: "Country" },
  { value: "region", label: "Region" },
  { value: "city", label: "City" },
  { value: "community", label: "Community" },
];

export default function DiscoveryFilterPanel({ filters, onChange, onReset, onClose }) {
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !filters.tags.includes(t)) {
      onChange({ tags: [...filters.tags, t] });
      setTagInput("");
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/30 mb-4">
      <CardContent className="pt-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Category</Label>
            <MobileSelect
              value={filters.category}
              onValueChange={(v) => onChange({ category: v })}
              options={CATEGORIES}
              placeholder="All categories"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Location</Label>
            <MobileSelect
              value={filters.location}
              onValueChange={(v) => onChange({ location: v })}
              options={LOCATIONS}
              placeholder="Location"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Tags</Label>
            <div className="flex gap-1">
              <Input
                className="h-8 text-sm"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={addTag}>+</Button>
            </div>
            {filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {filters.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1 h-5">
                    #{tag}
                    <button onClick={() => onChange({ tags: filters.tags.filter(t => t !== tag) })}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Options</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="verified-filter"
                checked={filters.verifiedOnly}
                onCheckedChange={(v) => onChange({ verifiedOnly: v })}
              />
              <Label htmlFor="verified-filter" className="text-sm cursor-pointer">Verified only</Label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-blue-100">
          <button onClick={onReset} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Reset all filters
          </button>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs">
            <X className="w-3 h-3 mr-1" /> Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}