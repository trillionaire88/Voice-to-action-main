import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe2, List, Layers, X, MapPin, Clock } from "lucide-react";
import EnhancedGlobe from "../components/worldview/EnhancedGlobe";
import LayerSelector from "../components/worldview/LayerSelector";
import TopicOverlay from "../components/worldview/TopicOverlay";
import MapSearch from "../components/worldview/MapSearch";
import RegionDetailPanel from "../components/worldview/RegionDetailPanel";
import TimeSlider from "../components/worldview/TimeSlider";
import GlobalSummaryPanel from "../components/worldview/GlobalSummaryPanel";

export default function WorldView() {
  const [, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("globe");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [activeLayers, setActiveLayers] = useState(["activity"]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showLayerSelector, setShowLayerSelector] = useState(true);
  const [showGlobalSummary] = useState(true);
  const [showTimeSlider, setShowTimeSlider] = useState(false);
  const [regionFilter, setRegionFilter] = useState(null);
  const [timelineDate, setTimelineDate] = useState(new Date());
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser || null);
    } catch {
      setUser(null);
    }
  };

  const { data: polls = [] } = useQuery({
    queryKey: ["allPolls"],
    queryFn: async () => {
      const { data } = await supabase.from("polls").select("*");
      return data || [];
    },
  });

  const { data: petitions = [] } = useQuery({
    queryKey: ["allPetitions"],
    queryFn: async () => {
      const { data } = await supabase.from("petitions").select("*").eq("status", "active");
      return data || [];
    },
  });

  const { data: impactEvents = [] } = useQuery({
    queryKey: ["allImpactEvents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("impact_events").select("*");
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
      return data || [];
    },
  });

  // Calculate enhanced country stats
  const countryStats = {};
  polls.forEach((poll) => {
    if (poll.status === "open" || poll.status === "closed") {
      const code = poll.location_country_code || poll.audience_country_code || "XX";
      if (code !== "global" && code !== "XX") {
        if (!countryStats[code]) {
          countryStats[code] = {
            pollCount: 0,
            petitionCount: 0,
            institutionCount: 0,
            impactCount: 0,
            verifiedUsers: 0,
            sentiment: { support: 0, oppose: 0, neutral: 0 },
            topTopics: [],
          };
        }
        countryStats[code].pollCount++;
      }
    }
  });

  impactEvents.forEach((event) => {
    if (event.moderation_status === "approved") {
      const code = event.location_country_code || "XX";
      if (code !== "global" && code !== "XX") {
        if (!countryStats[code]) {
          countryStats[code] = {
            pollCount: 0,
            petitionCount: 0,
            institutionCount: 0,
            impactCount: 0,
            verifiedUsers: 0,
            sentiment: { support: 0, oppose: 0, neutral: 0 },
            topTopics: [],
          };
        }
        countryStats[code].impactCount++;
      }
    }
  });

  // Enhance stats with mock data for demo
  Object.keys(countryStats).forEach((code) => {
    const stats = countryStats[code];
    stats.petitionCount = Math.floor(stats.pollCount * 0.6);
    stats.institutionCount = Math.floor(stats.pollCount * 0.3);
    stats.verifiedUsers = Math.floor(stats.pollCount * 15);
    stats.sentiment = {
      support: 45 + Math.random() * 30,
      oppose: 20 + Math.random() * 20,
      neutral: 15 + Math.random() * 15,
    };
    stats.topTopics = ["environment", "economy", "health"].slice(
      0,
      Math.floor(Math.random() * 3) + 1
    );
  });

  const handleToggleLayer = (layerId) => {
    setActiveLayers((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId]
    );
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
  };

  // Timeline playback
  useEffect(() => {
    if (!isTimelinePlaying) return;
    
    const interval = setInterval(() => {
      setTimelineDate((prev) => {
        const nextDate = new Date(prev.getTime() + 24 * 60 * 60 * 1000);
        const endDate = new Date();
        if (nextDate > endDate) {
          setIsTimelinePlaying(false);
          return endDate;
        }
        return nextDate;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isTimelinePlaying]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Bar */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Globe2 className="w-7 h-7 text-blue-400" />
                World View 2.0
              </h1>
              {regionFilter && (
                <Badge className="bg-blue-600 text-white">
                  Filtered to: {regionFilter}
                  <button
                    onClick={() => setRegionFilter(null)}
                    className="ml-2 hover:bg-blue-700 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLayerSelector(!showLayerSelector)}
                className="bg-white/10 border-slate-600 text-white hover:bg-white/20"
              >
                <Layers className="w-4 h-4 mr-2" />
                Layers
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTimeSlider(!showTimeSlider)}
                className="bg-white/10 border-slate-600 text-white hover:bg-white/20"
              >
                <Clock className="w-4 h-4 mr-2" />
                Timeline
              </Button>
              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList className="bg-slate-700 border-slate-600">
                  <TabsTrigger
                    value="globe"
                    className="data-[state=active]:bg-slate-600 text-white"
                  >
                    <Globe2 className="w-4 h-4 mr-2" />
                    Globe
                  </TabsTrigger>
                  <TabsTrigger
                    value="list"
                    className="data-[state=active]:bg-slate-600 text-white"
                  >
                    <List className="w-4 h-4 mr-2" />
                    List
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {viewMode === "globe" ? (
          <div className="h-[calc(100vh-120px)] relative">
            {/* Search Bar */}
            <MapSearch onSelectCountry={handleCountrySelect} />

            {/* Layer Selector */}
            {showLayerSelector && (
              <LayerSelector
                activeLayers={activeLayers}
                onToggleLayer={handleToggleLayer}
              />
            )}

            {/* Topic Overlay */}
            <TopicOverlay
              selectedTopic={selectedTopic}
              onSelectTopic={setSelectedTopic}
            />

            {/* Global Summary Panel */}
            {showGlobalSummary && (
              <GlobalSummaryPanel
                polls={polls}
                petitions={petitions}
                stats={countryStats}
              />
            )}

            {/* Time Slider */}
            {showTimeSlider && (
              <TimeSlider
                startDate={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)}
                endDate={new Date()}
                currentDate={timelineDate}
                onDateChange={setTimelineDate}
                isPlaying={isTimelinePlaying}
                onTogglePlay={() => setIsTimelinePlaying(!isTimelinePlaying)}
                onClose={() => setShowTimeSlider(false)}
              />
            )}

            {/* Enhanced Globe */}
            <EnhancedGlobe
              selectedCountry={selectedCountry}
              activeLayers={activeLayers}
              countryStats={countryStats}
              onCountryClick={handleCountrySelect}
              polls={polls}
              petitions={petitions}
            />

            {/* Region Detail Panel */}
            {selectedCountry && (
              <RegionDetailPanel
                country={selectedCountry}
                stats={countryStats[selectedCountry.code]}
                onClose={() => setSelectedCountry(null)}
              />
            )}

            {/* Instructions */}
            <Card className="absolute bottom-4 right-4 p-4 bg-white/95 backdrop-blur-sm shadow-xl border-slate-200 max-w-xs">
              <p className="text-xs text-slate-600">
                <strong>Click</strong> a country to view details •{" "}
                <strong>Scroll</strong> to zoom • <strong>Drag</strong> to pan •{" "}
                <strong>Toggle layers</strong> for different views
              </p>
            </Card>
          </div>
        ) : (
          <div className="min-h-[calc(100vh-120px)] p-6 bg-slate-50">
            <div className="max-w-5xl mx-auto">
              <CountryListView
                countryStats={countryStats}
                onCountrySelect={(code) => {
                  setViewMode("globe");
                  setSelectedCountry({ code, name: code });
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CountryListView({ countryStats, onCountrySelect }) {
  const sortedCountries = Object.entries(countryStats).sort((a, b) => {
    const totalA = a[1].pollCount + a[1].impactCount;
    const totalB = b[1].pollCount + b[1].impactCount;
    return totalB - totalA;
  });

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Regions & Countries</h2>
      {sortedCountries.map(([code, stats]) => (
        <Card
          key={code}
          className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
          onClick={() => onCountrySelect(code)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-slate-900">{code}</h3>
                <p className="text-sm text-slate-600">
                  {stats.pollCount} polls • {stats.impactCount} impact records •{" "}
                  {stats.petitionCount} petitions
                </p>
              </div>
            </div>
            <Badge className="bg-blue-50 text-blue-700">
              {stats.pollCount + stats.impactCount + stats.petitionCount} items
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}