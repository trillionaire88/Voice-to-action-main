import React, { useState, useEffect, useMemo } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe2, FileText, BarChart3, MapPin, Navigation, Search,
  Users, TrendingUp, Zap, ArrowRight, Filter, X
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";

// Country code → lat/lng
const COUNTRY_COORDS = {
  AU: [-25.3, 133.8], US: [37.1, -95.7], GB: [55.4, -3.4], CA: [56.1, -106.3],
  DE: [51.2, 10.4], FR: [46.2, 2.2], IN: [20.6, 78.9], BR: [-14.2, -51.9],
  CN: [35.9, 104.2], JP: [36.2, 138.3], ZA: [-28.5, 24.7], NG: [9.1, 8.7],
  MX: [23.6, -102.6], IT: [41.9, 12.6], ES: [40.5, -3.7], RU: [61.5, 105.3],
  KR: [35.9, 127.8], AR: [-38.4, -63.6], NZ: [-40.9, 174.9], PH: [12.9, 121.8],
  NL: [52.1, 5.3], SE: [60.1, 18.6], NO: [60.5, 8.5], DK: [56.3, 9.5],
  PL: [52.0, 19.1], TR: [38.96, 35.2], EG: [26.8, 30.8], SG: [1.4, 103.8],
  MY: [4.2, 109.5], TH: [15.9, 100.9], ID: [-0.8, 113.9], AE: [23.4, 53.8],
};

function getCoords(item) {
  if (item.location_lat && item.location_lng) return [item.location_lat, item.location_lng];
  const c = COUNTRY_COORDS[(item.country_code || item.location_country_code || item.audience_country_code || "")?.toUpperCase()];
  if (c) return [c[0] + (Math.random() - 0.5) * 2, c[1] + (Math.random() - 0.5) * 2];
  return null;
}

function MapFlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 9, { duration: 1.2 });
  }, [coords]);
  return null;
}

function ClusterMarker({ items, type, onClick }) {
  const count = items.length;
  const color = type === "petition" ? "#2563eb" : "#7c3aed";
  const radius = count >= 20 ? 18 : count >= 10 ? 14 : count >= 5 ? 11 : 8;
  const coords = items[0]._coords;
  return (
    <CircleMarker
      center={coords}
      radius={radius}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 2 }}
      eventHandlers={{ click: () => onClick(items) }}
    >
      <Tooltip>
        <div className="font-semibold text-sm">
          {count} {type === "petition" ? "petition" : "poll"}{count !== 1 ? "s" : ""}
        </div>
        {items.slice(0, 3).map((item, i) => (
          <div key={i} className="text-xs text-slate-600 truncate max-w-[180px]">{item.title || item.question}</div>
        ))}
        {count > 3 && <div className="text-xs text-slate-400">+{count - 3} more</div>}
      </Tooltip>
    </CircleMarker>
  );
}

export default function CivicMap() {
  const navigate = useNavigate();
  const [view, setView] = useState("all"); // all | petitions | polls
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [search, setSearch] = useState("");
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const { data: petitions = [] } = useQuery({
    queryKey: ["civicPetitions"],
    queryFn: () => api.entities.Petition.filter({ status: "active" }, "-signature_count_total", 200),
    staleTime: 60000,
  });

  const { data: polls = [] } = useQuery({
    queryKey: ["civicPolls"],
    queryFn: () => api.entities.Poll.filter({ status: "open" }, "-total_votes_cached", 200),
    staleTime: 60000,
  });

  // Attach coords to each item
  const petitionsWithCoords = useMemo(() =>
    petitions.map(p => ({ ...p, _type: "petition", _coords: getCoords(p) })).filter(p => p._coords),
    [petitions]
  );
  const pollsWithCoords = useMemo(() =>
    polls.map(p => ({ ...p, _type: "poll", _coords: getCoords(p) })).filter(p => p._coords),
    [polls]
  );

  // Cluster items by rounding coords to ~50km grid
  function clusterItems(items) {
    const grid = {};
    items.forEach(item => {
      const key = `${Math.round(item._coords[0] * 2) / 2},${Math.round(item._coords[1] * 2) / 2}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(item);
    });
    return Object.values(grid);
  }

  const petitionClusters = useMemo(() => clusterItems(petitionsWithCoords), [petitionsWithCoords]);
  const pollClusters = useMemo(() => clusterItems(pollsWithCoords), [pollsWithCoords]);

  // Filter by search
  const filteredPetitions = useMemo(() => {
    if (!search) return petitionsWithCoords;
    const q = search.toLowerCase();
    return petitionsWithCoords.filter(p =>
      (p.title || "").toLowerCase().includes(q) ||
      (p.country_code || "").toLowerCase().includes(q) ||
      (p.region_code || "").toLowerCase().includes(q)
    );
  }, [petitionsWithCoords, search]);

  const filteredPolls = useMemo(() => {
    if (!search) return pollsWithCoords;
    const q = search.toLowerCase();
    return pollsWithCoords.filter(p =>
      (p.question || "").toLowerCase().includes(q) ||
      (p.location_city || "").toLowerCase().includes(q) ||
      (p.location_country_code || "").toLowerCase().includes(q)
    );
  }, [pollsWithCoords, search]);

  const nearbyItems = useMemo(() => {
    if (!userLocation) return [];
    const [ulat, ulng] = userLocation;
    const all = [...filteredPetitions, ...filteredPolls];
    return all.filter(item => {
      const [lat, lng] = item._coords;
      const dist = Math.sqrt((lat - ulat) ** 2 + (lng - ulng) ** 2);
      return dist < 5; // ~550km radius
    }).sort((a, b) => {
      const da = Math.sqrt((a._coords[0] - ulat) ** 2 + (a._coords[1] - ulng) ** 2);
      const db = Math.sqrt((b._coords[0] - ulat) ** 2 + (b._coords[1] - ulng) ** 2);
      return da - db;
    });
  }, [userLocation, filteredPetitions, filteredPolls]);

  const locateMe = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setFlyTo(coords);
        setLocating(false);
      },
      () => {
        setLocating(false);
      }
    );
  };

  const totalActive = petitions.length + polls.length;
  const totalCountries = new Set([
    ...petitions.map(p => p.country_code),
    ...polls.map(p => p.location_country_code || p.audience_country_code),
  ].filter(Boolean)).size;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-8 h-8 text-blue-600" /> Civic Initiative Map
          </h1>
          <p className="text-slate-500 mt-1">
            Discover petitions and polls active in your neighbourhood and city. Initiative locations are aggregated from public petition and poll metadata — no personal addresses are shown.{" "}
            <span className="text-slate-600">
              &quot;Find Near Me&quot; uses your browser location only when you tap it; it is not read from your profile or stored by us for this map.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={locateMe}
            disabled={locating}
            className="gap-1.5"
          >
            <Navigation className={`w-4 h-4 ${locating ? "animate-pulse text-blue-500" : ""}`} />
            {locating ? "Locating…" : "Find Near Me"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Petitions", value: petitions.length, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Open Polls", value: polls.length, icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Countries", value: totalCountries, icon: Globe2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Initiatives", value: totalActive, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className={`inline-flex p-2 ${bg} rounded-lg mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by title, country, or region…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Tabs value={view} onValueChange={v => { setView(v); setSelectedCluster(null); }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="petitions" className="gap-1.5"><FileText className="w-3.5 h-3.5" />Petitions</TabsTrigger>
            <TabsTrigger value="polls" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Polls</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Map + sidebar */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Map */}
        <Card className="lg:col-span-2 border-slate-200 overflow-hidden">
          <div className="relative h-[500px] sm:h-[580px]">
            <MapContainer
              center={userLocation || [20, 20]}
              zoom={userLocation ? 7 : 2}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap &copy; CARTO'
              />
              {flyTo && <MapFlyTo coords={flyTo} />}

              {/* Petition clusters */}
              {(view === "all" || view === "petitions") &&
                clusterItems(filteredPetitions).map((cluster, i) => (
                  <ClusterMarker
                    key={`p-${i}`}
                    items={cluster}
                    type="petition"
                    onClick={setSelectedCluster}
                  />
                ))
              }

              {/* Poll clusters */}
              {(view === "all" || view === "polls") &&
                clusterItems(filteredPolls).map((cluster, i) => (
                  <ClusterMarker
                    key={`poll-${i}`}
                    items={cluster}
                    type="poll"
                    onClick={setSelectedCluster}
                  />
                ))
              }

              {/* User location marker */}
              {userLocation && (
                <CircleMarker
                  center={userLocation}
                  radius={10}
                  pathOptions={{ color: "#f59e0b", fillColor: "#fbbf24", fillOpacity: 1, weight: 3 }}
                >
                  <Tooltip permanent>📍 You</Tooltip>
                </CircleMarker>
              )}
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 text-xs space-y-1.5">
              <div className="font-semibold text-slate-700 mb-1">Legend</div>
              {(view === "all" || view === "petitions") && (
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600" /><span>Petition cluster</span></div>
              )}
              {(view === "all" || view === "polls") && (
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-600" /><span>Poll cluster</span></div>
              )}
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-amber-500" /><span>Your location</span></div>
              <div className="text-slate-400 text-[10px] mt-1">Larger = more initiatives</div>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected cluster */}
          {selectedCluster ? (
            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    {selectedCluster.length} Initiative{selectedCluster.length !== 1 ? "s" : ""} Here
                  </CardTitle>
                  <button onClick={() => setSelectedCluster(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {selectedCluster.map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 cursor-pointer border border-slate-200 hover:border-blue-200 transition-colors"
                    onClick={() => navigate(
                      item._type === "petition"
                        ? createPageUrl("PetitionDetail") + `?id=${item.id}`
                        : createPageUrl("PollDetail") + `?id=${item.id}`
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className={`text-[10px] py-0 ${item._type === "petition" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                        {item._type}
                      </Badge>
                      {item.country_code && (
                        <span className="text-[10px] text-slate-400">{item.country_code}</span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
                      {item.title || item.question}
                    </p>
                    {item._type === "petition" && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {(item.signature_count_total || 0).toLocaleString()} signatures
                      </p>
                    )}
                    {item._type === "poll" && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {(item.total_votes_cached || 0).toLocaleString()} votes
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : userLocation ? (
            /* Nearby items */
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-amber-600" />
                  Near You ({nearbyItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {nearbyItems.length === 0 ? (
                  <p className="text-xs text-slate-400">No active initiatives found near your location.</p>
                ) : nearbyItems.slice(0, 10).map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-white hover:bg-amber-50 cursor-pointer border border-amber-200 transition-colors"
                    onClick={() => navigate(
                      item._type === "petition"
                        ? createPageUrl("PetitionDetail") + `?id=${item.id}`
                        : createPageUrl("PollDetail") + `?id=${item.id}`
                    )}
                  >
                    <Badge className={`text-[10px] py-0 mb-1 ${item._type === "petition" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                      {item._type}
                    </Badge>
                    <p className="text-xs font-medium text-slate-800 line-clamp-2">{item.title || item.question}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            /* Intro panel */
            <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Navigation className="w-7 h-7 text-blue-600" />
                </div>
                <p className="font-semibold text-slate-800">Find Your Local Issues</p>
                <p className="text-sm text-slate-500">Click "Find Near Me" to discover active petitions and polls in your city or neighbourhood.</p>
                <Button size="sm" onClick={locateMe} className="gap-1.5">
                  <Navigation className="w-3.5 h-3.5" /> Find Near Me
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Top petitions list */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Most Active Petitions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {petitions.slice(0, 5).map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 rounded-lg p-1.5 -mx-1.5"
                  onClick={() => {
                    const coords = getCoords(p);
                    if (coords) setFlyTo(coords);
                    navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`);
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{p.title}</p>
                    <p className="text-[10px] text-slate-400">{(p.signature_count_total || 0).toLocaleString()} sigs · {p.country_code}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => navigate(createPageUrl("Petitions"))}>
                All Petitions
              </Button>
            </CardContent>
          </Card>

          {/* Top polls list */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Most Active Polls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {polls.slice(0, 4).map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 rounded-lg p-1.5 -mx-1.5"
                  onClick={() => navigate(createPageUrl("PollDetail") + `?id=${p.id}`)}
                >
                  <p className="text-xs font-medium text-slate-800 line-clamp-2 flex-1">{p.question}</p>
                  <Badge className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 shrink-0">
                    {(p.total_votes_cached || 0).toLocaleString()}
                  </Badge>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => navigate(createPageUrl("PublicVoting"))}>
                All Polls
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}