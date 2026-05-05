import { useState } from "react";
import BaseFeedList from "./BaseFeedList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** ISO country codes available in the global feed filter (expand over time). */
const FEED_COUNTRY_OPTIONS = [
  ["GLOBAL", "Global"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["IE", "Ireland"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["ES", "Spain"],
  ["IT", "Italy"],
  ["NL", "Netherlands"],
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["FI", "Finland"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["CH", "Switzerland"],
  ["BE", "Belgium"],
  ["AT", "Austria"],
  ["JP", "Japan"],
  ["KR", "South Korea"],
  ["CN", "China"],
  ["HK", "Hong Kong"],
  ["TW", "Taiwan"],
  ["SG", "Singapore"],
  ["MY", "Malaysia"],
  ["TH", "Thailand"],
  ["VN", "Vietnam"],
  ["PH", "Philippines"],
  ["ID", "Indonesia"],
  ["IN", "India"],
  ["PK", "Pakistan"],
  ["BD", "Bangladesh"],
  ["BR", "Brazil"],
  ["MX", "Mexico"],
  ["AR", "Argentina"],
  ["ZA", "South Africa"],
  ["NG", "Nigeria"],
  ["KE", "Kenya"],
  ["EG", "Egypt"],
  ["AE", "United Arab Emirates"],
  ["SA", "Saudi Arabia"],
  ["IL", "Israel"],
  ["TR", "Turkey"],
];

export default function GlobalFeed() {
  const [country, setCountry] = useState("GLOBAL");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-800">🌍 Global Feed</h2>
        <div className="w-44">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {FEED_COUNTRY_OPTIONS.map(([code, label]) => (
                <SelectItem key={code} value={code}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <BaseFeedList feedType="global" countryCode={country === "GLOBAL" ? undefined : country} staleTime={300000} />
    </div>
  );
}
