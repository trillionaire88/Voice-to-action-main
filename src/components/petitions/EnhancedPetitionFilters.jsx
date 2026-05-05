import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe2, TrendingUp } from "lucide-react";

const COUNTRY_CODES = [
  "AU", "US", "GB", "CA", "NZ", "DE", "FR", "JP", "IN", "BR", "SG", "MX", "IT", "ES", "NL",
];

export default function EnhancedPetitionFilters({ onFilterChange, userLocation = null }) {
  const [sortBy, setSortBy] = useState("trending");
  const [selectedLocation, setSelectedLocation] = useState(userLocation || "global");

  useEffect(() => {
    onFilterChange({ sortBy, location: selectedLocation });
  }, [sortBy, selectedLocation]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Trending/Growth Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trending">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trending (Growth Rate)
              </div>
            </SelectItem>
            <SelectItem value="most_signed">Most Signed</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="ending_soon">Ending Soon</SelectItem>
          </SelectContent>
        </Select>

        {/* Location Filter */}
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Location..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4" />
                Global
              </div>
            </SelectItem>
            {COUNTRY_CODES.map(code => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active filters badge */}
      {selectedLocation !== "global" && (
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50">
            <Globe2 className="w-3 h-3 mr-1" />
            {selectedLocation}
          </Badge>
        </div>
      )}
    </div>
  );
}