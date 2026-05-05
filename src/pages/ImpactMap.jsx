import React, { useState, useEffect, useMemo } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe2, FileText, BarChart3, TrendingUp, Users, Zap } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";

// Country code → approximate lat/lng
const COUNTRY_COORDS = {
  AU: [-25.3, 133.8], US: [37.1, -95.7], GB: [55.4, -3.4], CA: [56.1, -106.3],
  DE: [51.2, 10.4], FR: [46.2, 2.2], IN: [20.6, 78.9], BR: [14.2, -51.9],
  CN: [35.9, 104.2], JP: [36.2, 138.3], ZA: [-28.5, 24.7], NG: [9.1, 8.7],
  MX: [23.6, -102.6], IT: [41.9, 12.6], ES: [40.5, -3.7], RU: [61.5, 105.3],
  KR: [35.9, 127.8], AR: [-38.4, -63.6], NZ: [-40.9, 174.9], PH: [12.9, 121.8],
  ID: [-0.8, 113.9], PK: [30.4, 69.3], BD: [23.7, 90.4], NL: [52.1, 5.3],
  SE: [60.1, 18.6], NO: [60.5, 8.5], DK: [56.3, 9.5], FI: [61.9, 25.7],
  PL: [52.0, 19.1], TR: [38.96, 35.2], EG: [26.8, 30.8], KE: [-0.02, 37.9],
  GH: [7.9, -1.0], TZ: [-6.4, 34.9], IL: [31.0, 34.9], SA: [23.9, 45.1],
  AE: [23.4, 53.8], SG: [1.4, 103.8], MY: [4.2, 109.5], TH: [15.9, 100.9],
  VN: [14.1, 108.3], HK: [22.4, 114.1], TW: [23.7, 121.0], CL: [-35.7, -71.5],
  CO: [4.6, -74.1], PE: [-9.2, -75.0], UA: [48.4, 31.2],
};

function getCoords(countryCode) {
  return COUNTRY_COORDS[countryCode?.toUpperCase()] || null;
}

function MapLegend() {
  return (
    <div className="absolute bottom-6 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 text-xs">
      <div className="font-semibold text-slate-700 mb-2">Support Density</div>
      {[
        { color: "#ef4444", label: "1,000+ signatures" },
        { color: "#f97316", label: "500–999" },
        { color: "#eab308", label: "100–499" },
        { color: "#22c55e", label: "10–99" },
        { color: "#3b82f6", label: "1–9" },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-slate-600">{label}</span>
        </div>
      ))}
    </div>
  );
}

function getCircleProps(count) {
  if (count >= 1000) return { color: "#ef4444", radius: 20 };
  if (count >= 500) return { color: "#f97316", radius: 15 };
  if (count >= 100) return { color: "#eab308", radius: 11 };
  if (count >= 10) return { color: "#22c55e", radius: 8 };
  return { color: "#3b82f6", radius: 5 };
}

export default function ImpactMap() {
  const navigate = useNavigate();
  const [view, setView] = useState("petitions"); // petitions | polls

  const { data: signatures = [] } = useQuery({
    queryKey: ["allSignatures"],
    queryFn: () => api.entities.PetitionSignature.list("-created_date", 2000),
    staleTime: 60000,
  });

  const { data: petitions = [] } = useQuery({
    queryKey: ["activePetitions"],
    queryFn: () => api.entities.Petition.filter({ status: "active" }),
    staleTime: 60000,
  });

  const { data: votes = [] } = useQuery({
    queryKey: ["allVotes"],
    queryFn: () => api.entities.Vote.list("-created_date", 2000),
    staleTime: 60000,
  });

  // Aggregate signatures by country
  const signatureByCountry = useMemo(() => {
    const map = {};
    signatures.filter(s => !s.is_invalidated && !s.has_withdrawn && s.country_code).forEach(s => {
      map[s.country_code] = (map[s.country_code] || 0) + 1;
    });
    return map;
  }, [signatures]);

  // Aggregate votes by country
  const voteByCountry = useMemo(() => {
    const map = {};
    votes.filter(v => v.user_country_code_snapshot).forEach(v => {
      map[v.user_country_code_snapshot] = (map[v.user_country_code_snapshot] || 0) + 1;
    });
    return map;
  }, [votes]);

  const dataMap = view === "petitions" ? signatureByCountry : voteByCountry;
  const totalActions = Object.values(dataMap).reduce((a, b) => a + b, 0);
  const topCountries = Object.entries(dataMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const markers = Object.entries(dataMap)
    .map(([code, count]) => {
      const coords = getCoords(code);
      if (!coords) return null;
      return { code, count, coords };
    })
    .filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Globe2 className="w-8 h-8 text-blue-600" /> Global Impact Map
          </h1>
          <p className="text-slate-500 mt-1">See where civic action is gaining traction worldwide</p>
        </div>
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="petitions" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Petitions
            </TabsTrigger>
            <TabsTrigger value="polls" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" /> Polls
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Actions", value: totalActions.toLocaleString(), icon: Zap, color: "text-blue-600" },
          { label: "Countries", value: Object.keys(dataMap).length, icon: Globe2, color: "text-emerald-600" },
          { label: "Active Petitions", value: petitions.length, icon: FileText, color: "text-purple-600" },
          { label: "Verified Sigs", value: signatures.filter(s => s.is_verified_user).length.toLocaleString(), icon: Users, color: "text-amber-600" },
        ].map(({ label, value, icon: StatIcon, color }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <StatIcon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map */}
      <Card className="border-slate-200 mb-6 overflow-hidden">
        <div className="relative h-[480px] sm:h-[560px]">
          <MapContainer
            center={[20, 10]}
            zoom={2}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {markers.map(({ code, count, coords }) => {
              const { color, radius } = getCircleProps(count);
              return (
                <CircleMarker
                  key={code}
                  center={coords}
                  radius={radius}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 1 }}
                >
                  <Tooltip>
                    <div className="text-sm font-semibold">{code}</div>
                    <div className="text-xs">{count.toLocaleString()} {view === "petitions" ? "signatures" : "votes"}</div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
          <MapLegend />
        </div>
      </Card>

      {/* Top countries + active petitions */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCountries.length === 0 ? (
              <p className="text-sm text-slate-400">No data yet</p>
            ) : topCountries.map(([code, count], idx) => {
              const maxCount = topCountries[0][1];
              return (
                <div key={code} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                  <span className="text-sm font-semibold text-slate-700 w-10">{code}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900 w-16 text-right">{count.toLocaleString()}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" /> Active Petitions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {petitions.slice(0, 5).map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 rounded-lg p-2 -mx-2"
                onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                  <p className="text-xs text-slate-500">{(p.signature_count_total || 0).toLocaleString()} signatures</p>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                  {((p.signature_count_total || 0) / (p.signature_goal || 1000) * 100).toFixed(0)}%
                </Badge>
              </div>
            ))}
            {petitions.length === 0 && <p className="text-sm text-slate-400">No active petitions</p>}
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate(createPageUrl("Petitions"))}>
              View All Petitions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}