import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Search, MapPin, Filter, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function InstitutionMarkers({ countryCode, onSelectInstitution }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    government: true,
    council: true,
    corporation: true,
    ngo: true,
    media: true,
  });

  // Mock institutions data
  const institutions = [
    {
      id: 1,
      name: "National Parliament",
      type: "government",
      trustScore: 67,
      location: "Capital City",
      recentDecisions: 5,
    },
    {
      id: 2,
      name: "City Council",
      type: "council",
      trustScore: 72,
      location: "Metropolitan Area",
      recentDecisions: 8,
    },
    {
      id: 3,
      name: "Tech Corp Industries",
      type: "corporation",
      trustScore: 58,
      location: "Tech District",
      recentDecisions: 3,
    },
    {
      id: 4,
      name: "Environmental Action Group",
      type: "ngo",
      trustScore: 81,
      location: "Various Regions",
      recentDecisions: 2,
    },
    {
      id: 5,
      name: "National News Network",
      type: "media",
      trustScore: 64,
      location: "Capital City",
      recentDecisions: 1,
    },
  ];

  const filteredInstitutions = institutions.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filters[inst.type];
    return matchesSearch && matchesFilter;
  });

  const getTypeColor = (type) => {
    const colors = {
      government: "bg-blue-50 text-blue-700",
      council: "bg-purple-50 text-purple-700",
      corporation: "bg-orange-50 text-orange-700",
      ngo: "bg-green-50 text-green-700",
      media: "bg-pink-50 text-pink-700",
    };
    return colors[type] || "bg-slate-50 text-slate-700";
  };

  const getTrustColor = (score) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-900">Institutions</h3>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search institutions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <Card className="p-3 bg-slate-50">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Filter by Type</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(filters).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={value}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, [key]: checked })
                }
              />
              <Label htmlFor={key} className="text-xs capitalize cursor-pointer">
                {key}
              </Label>
            </div>
          ))}
        </div>
      </Card>

      {/* Institution List */}
      <div className="space-y-2">
        {filteredInstitutions.map((inst) => (
          <Card
            key={inst.id}
            className="p-3 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSelectInstitution(inst)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-900 mb-1">
                  {inst.name}
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getTypeColor(inst.type)} variant="secondary">
                    {inst.type}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" />
                    {inst.location}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`font-semibold ${getTrustColor(inst.trustScore)}`}>
                    Trust: {inst.trustScore}/100
                  </span>
                  <span className="text-slate-500">
                    {inst.recentDecisions} decisions
                  </span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="shrink-0">
                View
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredInstitutions.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">
          No institutions found matching your criteria
        </p>
      )}
    </div>
  );
}