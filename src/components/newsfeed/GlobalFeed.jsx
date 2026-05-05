import React, { useState } from "react";
import BaseFeedList from "./BaseFeedList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function GlobalFeed() {
  const [country, setCountry] = useState("GLOBAL");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-800">🌍 Global Feed</h2>
        <div className="w-44">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GLOBAL">Global</SelectItem>
              <SelectItem value="AU">Australia</SelectItem>
              <SelectItem value="US">United States</SelectItem>
              <SelectItem value="GB">United Kingdom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <BaseFeedList feedType="global" countryCode={country === "GLOBAL" ? undefined : country} staleTime={300000} />
    </div>
  );
}
