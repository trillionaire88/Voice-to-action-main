import { useState, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Globe2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Country centroids for basic positioning
const COUNTRY_CENTERS = {
  US: [37.0902, -95.7129],
  GB: [55.3781, -3.4360],
  AU: [-25.2744, 133.7751],
  CA: [56.1304, -106.3468],
  DE: [51.1657, 10.4515],
  FR: [46.2276, 2.2137],
  JP: [36.2048, 138.2529],
  IN: [20.5937, 78.9629],
  BR: [-14.2350, -51.9253],
  ZA: [-30.5595, 22.9375],
  CN: [35.8617, 104.1954],
  RU: [61.5240, 105.3188],
  MX: [23.6345, -102.5528],
  IT: [41.8719, 12.5674],
  ES: [40.4637, -3.7492],
  AR: [-38.4161, -63.6167],
  EG: [26.8206, 30.8025],
  NG: [9.0820, 8.6753],
  KE: [-0.0236, 37.9062],
  TH: [15.8700, 100.9925],
  PH: [12.8797, 121.7740],
  PK: [30.3753, 69.3451],
  BD: [23.6850, 90.3563],
  VN: [14.0583, 108.2772],
  TR: [38.9637, 35.2433],
  SA: [23.8859, 45.0792],
  AE: [23.4241, 53.8478],
  NZ: [-40.9006, 174.8860],
  SG: [1.3521, 103.8198],
  KR: [35.9078, 127.7669],
};

function MapController({ selectedCountry, onCountrySelect }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCountry && COUNTRY_CENTERS[selectedCountry]) {
      const [lat, lng] = COUNTRY_CENTERS[selectedCountry];
      map.flyTo([lat, lng], 5, { duration: 1.5 });
    }
  }, [selectedCountry, map]);

  return null;
}

export default function InteractiveGlobe({ countryStats, selectedCountry, onCountrySelect }) {
  const [tooltipInfo, setTooltipInfo] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Ensure Leaflet is properly initialized
    setMapReady(true);
  }, []);

  const getCountryColor = (code) => {
    const stats = countryStats[code];
    if (!stats) return '#e2e8f0'; // slate-200
    
    const total = stats.polls + stats.accountability;
    if (total > 50) return '#2563eb'; // blue-600
    if (total > 20) return '#3b82f6'; // blue-500
    if (total > 5) return '#60a5fa'; // blue-400
    return '#93c5fd'; // blue-300
  };

  const handleCountryClick = (countryCode) => {
    onCountrySelect(countryCode);
  };

  if (!mapReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <Globe2 className="w-12 h-12 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={10}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
        worldCopyJump={true}
        maxBounds={[[-90, -180], [90, 180]]}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController 
          selectedCountry={selectedCountry} 
          onCountrySelect={onCountrySelect} 
        />
      </MapContainer>

      {/* Overlay Instructions */}
      {!selectedCountry && (
        <div className="absolute top-4 left-4 right-4 md:left-auto md:w-80 z-10 pointer-events-none">
          <Card className="bg-white/95 backdrop-blur-sm border-blue-200 p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <Globe2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Explore the World</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Drag to pan, scroll to zoom. Click on countries to view polls and discussions.
                  Search for specific regions using the search bar above.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Country Quick Stats */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <Card className="bg-white/95 backdrop-blur-sm p-3 text-sm">
          <div className="text-slate-600">
            <strong className="text-slate-900">
              {Object.keys(countryStats).filter(k => k !== 'global').length}
            </strong> countries with active content
          </div>
        </Card>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <Card className="bg-white/95 backdrop-blur-sm p-3">
          <div className="text-xs font-semibold text-slate-900 mb-2">Activity Level</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2563eb' }} />
              <span className="text-slate-700">50+ items</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-slate-700">20-50 items</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#60a5fa' }} />
              <span className="text-slate-700">5-20 items</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#93c5fd' }} />
              <span className="text-slate-700">1-5 items</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}