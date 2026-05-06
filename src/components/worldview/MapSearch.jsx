import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Globe2, ChevronUp, ChevronDown, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Comprehensive global locations database
const GLOBAL_LOCATIONS = [
  // Major Countries
  { type: "country", code: "US", name: "United States", lat: 37.0902, lng: -95.7129 },
  { type: "country", code: "UK", name: "United Kingdom", lat: 55.3781, lng: -3.4360 },
  { type: "country", code: "CA", name: "Canada", lat: 56.1304, lng: -106.3468 },
  { type: "country", code: "AU", name: "Australia", lat: -25.2744, lng: 133.7751 },
  { type: "country", code: "DE", name: "Germany", lat: 51.1657, lng: 10.4515 },
  { type: "country", code: "FR", name: "France", lat: 46.2276, lng: 2.2137 },
  { type: "country", code: "JP", name: "Japan", lat: 36.2048, lng: 138.2529 },
  { type: "country", code: "BR", name: "Brazil", lat: -14.2350, lng: -51.9253 },
  { type: "country", code: "IN", name: "India", lat: 20.5937, lng: 78.9629 },
  { type: "country", code: "CN", name: "China", lat: 35.8617, lng: 104.1954 },
  { type: "country", code: "ZA", name: "South Africa", lat: -30.5595, lng: 22.9375 },
  { type: "country", code: "MX", name: "Mexico", lat: 23.6345, lng: -102.5528 },
  { type: "country", code: "IT", name: "Italy", lat: 41.8719, lng: 12.5674 },
  { type: "country", code: "ES", name: "Spain", lat: 40.4637, lng: -3.7492 },
  { type: "country", code: "NL", name: "Netherlands", lat: 52.1326, lng: 5.2913 },
  { type: "country", code: "SE", name: "Sweden", lat: 60.1282, lng: 18.6435 },
  { type: "country", code: "NO", name: "Norway", lat: 60.4720, lng: 8.4689 },
  { type: "country", code: "PL", name: "Poland", lat: 51.9194, lng: 19.1451 },
  { type: "country", code: "AR", name: "Argentina", lat: -38.4161, lng: -63.6167 },
  { type: "country", code: "CL", name: "Chile", lat: -35.6751, lng: -71.5430 },
  { type: "country", code: "NZ", name: "New Zealand", lat: -40.9006, lng: 174.8860 },
  { type: "country", code: "TH", name: "Thailand", lat: 15.8700, lng: 100.9925 },
  { type: "country", code: "SG", name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { type: "country", code: "KR", name: "South Korea", lat: 35.9078, lng: 127.7669 },
  { type: "country", code: "EG", name: "Egypt", lat: 26.8206, lng: 30.8025 },
  { type: "country", code: "NG", name: "Nigeria", lat: 9.0820, lng: 8.6753 },
  { type: "country", code: "KE", name: "Kenya", lat: -1.2921, lng: 36.8219 },
  { type: "country", code: "UA", name: "Ukraine", lat: 48.3794, lng: 31.1656 },
  { type: "country", code: "TR", name: "Turkey", lat: 38.9637, lng: 35.2433 },
  { type: "country", code: "ID", name: "Indonesia", lat: -0.7893, lng: 113.9213 },
  { type: "country", code: "PH", name: "Philippines", lat: 12.8797, lng: 121.7740 },
  { type: "country", code: "VN", name: "Vietnam", lat: 14.0583, lng: 108.2772 },
  { type: "country", code: "MY", name: "Malaysia", lat: 4.2105, lng: 101.9758 },
  { type: "country", code: "BD", name: "Bangladesh", lat: 23.6850, lng: 90.3563 },
  { type: "country", code: "PK", name: "Pakistan", lat: 30.3753, lng: 69.3451 },
  { type: "country", code: "RU", name: "Russia", lat: 61.5240, lng: 105.3188 },
  { type: "country", code: "SA", name: "Saudi Arabia", lat: 23.8859, lng: 45.0792 },
  { type: "country", code: "AE", name: "UAE", lat: 23.4241, lng: 53.8478 },
  { type: "country", code: "IL", name: "Israel", lat: 31.0461, lng: 34.8516 },
  { type: "country", code: "GR", name: "Greece", lat: 39.0742, lng: 21.8243 },
  { type: "country", code: "PT", name: "Portugal", lat: 39.3999, lng: -8.2245 },
  { type: "country", code: "IE", name: "Ireland", lat: 53.4129, lng: -8.2439 },
  { type: "country", code: "AT", name: "Austria", lat: 47.5162, lng: 14.5501 },
  { type: "country", code: "CH", name: "Switzerland", lat: 46.8182, lng: 8.2275 },
  { type: "country", code: "BE", name: "Belgium", lat: 50.5039, lng: 4.4699 },
  { type: "country", code: "DK", name: "Denmark", lat: 56.2639, lng: 9.5018 },
  { type: "country", code: "FI", name: "Finland", lat: 61.9241, lng: 25.7482 },
  { type: "country", code: "CZ", name: "Czech Republic", lat: 49.8175, lng: 15.4730 },
  { type: "country", code: "HU", name: "Hungary", lat: 47.1625, lng: 19.5033 },
  { type: "country", code: "RO", name: "Romania", lat: 45.9432, lng: 24.9668 },
  
  // Major Cities (World)
  { type: "city", name: "New York", country: "United States", lat: 40.7128, lng: -74.0060, zoom: 11 },
  { type: "city", name: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437, zoom: 11 },
  { type: "city", name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, zoom: 11 },
  { type: "city", name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, zoom: 11 },
  { type: "city", name: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050, zoom: 11 },
  { type: "city", name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, zoom: 11 },
  { type: "city", name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, zoom: 11 },
  { type: "city", name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, zoom: 11 },
  { type: "city", name: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, zoom: 11 },
  { type: "city", name: "Mumbai", country: "India", lat: 19.0760, lng: 72.8777, zoom: 11 },
  { type: "city", name: "Beijing", country: "China", lat: 39.9042, lng: 116.4074, zoom: 11 },
  { type: "city", name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, zoom: 11 },
  { type: "city", name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, zoom: 11 },
  { type: "city", name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, zoom: 11 },
  { type: "city", name: "Hong Kong", country: "China", lat: 22.3193, lng: 114.1694, zoom: 11 },
  { type: "city", name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.9780, zoom: 11 },
  { type: "city", name: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173, zoom: 11 },
  { type: "city", name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784, zoom: 11 },
  { type: "city", name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, zoom: 11 },
  { type: "city", name: "Lagos", country: "Nigeria", lat: 6.5244, lng: 3.3792, zoom: 11 },
  { type: "city", name: "Nairobi", country: "Kenya", lat: -1.2864, lng: 36.8172, zoom: 11 },
  { type: "city", name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241, zoom: 11 },
  { type: "city", name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816, zoom: 11 },
  { type: "city", name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729, zoom: 11 },
  { type: "city", name: "Santiago", country: "Chile", lat: -33.4489, lng: -70.6693, zoom: 11 },
  { type: "city", name: "Lima", country: "Peru", lat: -12.0464, lng: -77.0428, zoom: 11 },
  { type: "city", name: "Bogotá", country: "Colombia", lat: 4.7110, lng: -74.0721, zoom: 11 },
  { type: "city", name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038, zoom: 11 },
  { type: "city", name: "Barcelona", country: "Spain", lat: 41.3851, lng: 2.1734, zoom: 11 },
  { type: "city", name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, zoom: 11 },
  { type: "city", name: "Milan", country: "Italy", lat: 45.4642, lng: 9.1900, zoom: 11 },
  { type: "city", name: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041, zoom: 11 },
  { type: "city", name: "Brussels", country: "Belgium", lat: 50.8503, lng: 4.3517, zoom: 11 },
  { type: "city", name: "Vienna", country: "Austria", lat: 48.2082, lng: 16.3738, zoom: 11 },
  { type: "city", name: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686, zoom: 11 },
  { type: "city", name: "Copenhagen", country: "Denmark", lat: 55.6761, lng: 12.5683, zoom: 11 },
  { type: "city", name: "Oslo", country: "Norway", lat: 59.9139, lng: 10.7522, zoom: 11 },
  { type: "city", name: "Helsinki", country: "Finland", lat: 60.1699, lng: 24.9384, zoom: 11 },
  { type: "city", name: "Warsaw", country: "Poland", lat: 52.2297, lng: 21.0122, zoom: 11 },
  { type: "city", name: "Prague", country: "Czech Republic", lat: 50.0755, lng: 14.4378, zoom: 11 },
  { type: "city", name: "Budapest", country: "Hungary", lat: 47.4979, lng: 19.0402, zoom: 11 },
  { type: "city", name: "Athens", country: "Greece", lat: 37.9838, lng: 23.7275, zoom: 11 },
  { type: "city", name: "Lisbon", country: "Portugal", lat: 38.7223, lng: -9.1393, zoom: 11 },
  { type: "city", name: "Dublin", country: "Ireland", lat: 53.3498, lng: -6.2603, zoom: 11 },
  { type: "city", name: "Zurich", country: "Switzerland", lat: 47.3769, lng: 8.5417, zoom: 11 },
  { type: "city", name: "Manila", country: "Philippines", lat: 14.5995, lng: 120.9842, zoom: 11 },
  { type: "city", name: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456, zoom: 11 },
  { type: "city", name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018, zoom: 11 },
  { type: "city", name: "Hanoi", country: "Vietnam", lat: 21.0285, lng: 105.8542, zoom: 11 },
  { type: "city", name: "Ho Chi Minh City", country: "Vietnam", lat: 10.8231, lng: 106.6297, zoom: 11 },
  { type: "city", name: "Kuala Lumpur", country: "Malaysia", lat: 3.1390, lng: 101.6869, zoom: 11 },
  { type: "city", name: "Dhaka", country: "Bangladesh", lat: 23.8103, lng: 90.4125, zoom: 11 },
  { type: "city", name: "Karachi", country: "Pakistan", lat: 24.8607, lng: 67.0011, zoom: 11 },
  { type: "city", name: "Delhi", country: "India", lat: 28.7041, lng: 77.1025, zoom: 11 },
  { type: "city", name: "Bangalore", country: "India", lat: 12.9716, lng: 77.5946, zoom: 11 },
  { type: "city", name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639, zoom: 11 },
  { type: "city", name: "Chennai", country: "India", lat: 13.0827, lng: 80.2707, zoom: 11 },
  { type: "city", name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737, zoom: 11 },
  { type: "city", name: "Shenzhen", country: "China", lat: 22.5431, lng: 114.0579, zoom: 11 },
  { type: "city", name: "Guangzhou", country: "China", lat: 23.1291, lng: 113.2644, zoom: 11 },
  { type: "city", name: "Osaka", country: "Japan", lat: 34.6937, lng: 135.5023, zoom: 11 },
  { type: "city", name: "Kyoto", country: "Japan", lat: 35.0116, lng: 135.7681, zoom: 11 },
  { type: "city", name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631, zoom: 11 },
  { type: "city", name: "Brisbane", country: "Australia", lat: -27.4698, lng: 153.0251, zoom: 11 },
  { type: "city", name: "Perth", country: "Australia", lat: -31.9505, lng: 115.8605, zoom: 11 },
  { type: "city", name: "Auckland", country: "New Zealand", lat: -36.8485, lng: 174.7633, zoom: 11 },
  { type: "city", name: "Wellington", country: "New Zealand", lat: -41.2865, lng: 174.7762, zoom: 11 },
  { type: "city", name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207, zoom: 11 },
  { type: "city", name: "Montreal", country: "Canada", lat: 45.5017, lng: -73.5673, zoom: 11 },
  { type: "city", name: "Chicago", country: "United States", lat: 41.8781, lng: -87.6298, zoom: 11 },
  { type: "city", name: "San Francisco", country: "United States", lat: 37.7749, lng: -122.4194, zoom: 11 },
  { type: "city", name: "Boston", country: "United States", lat: 42.3601, lng: -71.0589, zoom: 11 },
  { type: "city", name: "Washington DC", country: "United States", lat: 38.9072, lng: -77.0369, zoom: 11 },
  { type: "city", name: "Seattle", country: "United States", lat: 47.6062, lng: -122.3321, zoom: 11 },
  { type: "city", name: "Miami", country: "United States", lat: 25.7617, lng: -80.1918, zoom: 11 },
  { type: "city", name: "Houston", country: "United States", lat: 29.7604, lng: -95.3698, zoom: 11 },
  { type: "city", name: "Atlanta", country: "United States", lat: 33.7490, lng: -84.3880, zoom: 11 },
  { type: "city", name: "Denver", country: "United States", lat: 39.7392, lng: -104.9903, zoom: 11 },
  { type: "city", name: "Phoenix", country: "United States", lat: 33.4484, lng: -112.0740, zoom: 11 },
];

export default function MapSearch({ onSelectCountry }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length > 0) {
      const filtered = GLOBAL_LOCATIONS.filter((loc) => {
        const q = query.toLowerCase();
        return (
          loc.name.toLowerCase().includes(q) ||
          loc.code?.toLowerCase().includes(q) ||
          loc.country?.toLowerCase().includes(q)
        );
      });
      setFilteredLocations(filtered.slice(0, 8));
    } else {
      setFilteredLocations([]);
    }
  };

  const handleSelect = (location) => {
    onSelectCountry(location);
    setSearchQuery("");
    setFilteredLocations([]);
  };

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white hover:bg-slate-50 text-slate-900 shadow-xl border-slate-200"
        size="sm"
      >
        <Search className="w-4 h-4 mr-2" />
        Search Location
        <ChevronDown className="w-4 h-4 ml-2" />
      </Button>
    );
  }

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-md px-4">
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Location
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-6 w-6 p-0"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search locations (countries, cities)..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10 h-10"
          />
        </div>

        {filteredLocations.length > 0 && (
          <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
            {filteredLocations.map((location, idx) => (
              <button
                key={`${location.type}-${location.name}-${idx}`}
                onClick={() => handleSelect(location)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {location.type === "city" ? (
                    <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  ) : (
                    <Globe2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate text-sm">
                      {location.name}
                    </div>
                    {location.country && (
                      <div className="text-xs text-slate-500 truncate">{location.country}</div>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs flex-shrink-0 ${
                    location.type === "city"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-green-50 text-green-700 border-green-200"
                  }`}
                >
                  {location.type === "city" ? "City" : "Country"}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}