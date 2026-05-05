import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapController({ selectedCountry, onZoomChange }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCountry?.lat && selectedCountry?.lng) {
      const targetZoom = selectedCountry.zoom || 6;
      map.flyTo([selectedCountry.lat, selectedCountry.lng], targetZoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    } else if (selectedCountry?.code) {
      map.setView([20, 0], 2);
    }
  }, [selectedCountry, map]);

  useEffect(() => {
    const handleZoom = () => {
      onZoomChange(map.getZoom());
    };
    
    map.on('zoomend', handleZoom);
    handleZoom(); // Initial call
    
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

export default function EnhancedGlobe({
  selectedCountry,
  activeLayers,
  countryStats,
  polls = [],
  petitions = [],
}) {
  const mapRef = useRef(null);
  const [, setCurrentZoom] = useState(2);

  // Filter content with locations
  const contentWithLocations = [
    ...polls
      .filter((p) => p.location_lat && p.location_lng)
      .map((p) => ({ ...p, type: "poll" })),
    ...petitions
      .filter((p) => p.location_lat && p.location_lng)
      .map((p) => ({ ...p, type: "petition" })),
  ];

  const _getCountryStyle = (countryCode) => {
    const stats = countryStats[countryCode] || {};
    const hasActivity = stats.pollCount > 0 || stats.petitionCount > 0;

    let fillColor = "#7CB342";
    let fillOpacity = 0.7;

    // Activity layer coloring
    if (activeLayers.includes("activity") && hasActivity) {
      const intensity = Math.min(
        (stats.pollCount + stats.petitionCount) / 20,
        1
      );
      fillColor = `rgba(33, 150, 243, ${0.5 + intensity * 0.5})`;
      fillOpacity = 0.7;
    }

    // Sentiment layer coloring
    if (activeLayers.includes("sentiment") && stats.sentiment) {
      const support = stats.sentiment.support || 0;
      if (support > 60) {
        fillColor = "#10b981";
      } else if (support < 40) {
        fillColor = "#ef4444";
      } else {
        fillColor = "#f59e0b";
      }
      fillOpacity = 0.7;
    }

    // Impact layer coloring
    if (activeLayers.includes("impact") && stats.impactCount > 0) {
      const intensity = Math.min(stats.impactCount / 10, 1);
      fillColor = `rgba(239, 68, 68, ${0.5 + intensity * 0.5})`;
      fillOpacity = 0.7;
    }

    return {
      fillColor,
      fillOpacity,
      color: "#2E7D32",
      weight: 1,
    };
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        ref={mapRef}
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        worldCopyJump={true}
        style={{
          height: "100%",
          width: "100%",
          background: "linear-gradient(180deg, #0c4a6e 0%, #0369a1 30%, #0ea5e9 60%, #38bdf8 100%)",
        }}
        className="z-0"
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        zoomControl={true}
      >
        {/* Satellite imagery with roads and labels for all zoom levels */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          maxZoom={18}
          minZoom={2}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={18}
          minZoom={2}
        />

        <MapController
          selectedCountry={selectedCountry}
          activeLayers={activeLayers}
          onZoomChange={setCurrentZoom}
        />

        {/* Content Markers */}
        {contentWithLocations.map((item) => (
          <Marker
            key={`${item.type}-${item.id}`}
            position={[item.location_lat, item.location_lng]}
            icon={L.icon({
              iconUrl: item.type === "poll" 
                ? "https://cdn-icons-png.flaticon.com/512/684/684908.png"
                : "https://cdn-icons-png.flaticon.com/512/3094/3094840.png",
              iconSize: [30, 30],
              iconAnchor: [15, 30],
              popupAnchor: [0, -30],
            })}
          >
            <Popup maxWidth={300}>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                    {item.type === "poll" ? "Poll" : "Petition"}
                  </span>
                </div>
                <h3 className="font-semibold text-sm mb-1">
                  {item.type === "poll" ? item.question : item.title}
                </h3>
                <p className="text-xs text-slate-600 mb-2">
                  {item.location_city || item.location_region_code || "Local content"}
                </p>
                {item.type === "poll" && (
                  <p className="text-xs text-slate-500">
                    {item.total_votes_cached || 0} votes
                  </p>
                )}
                {item.type === "petition" && (
                  <p className="text-xs text-slate-500">
                    {item.signature_count_total || 0} signatures
                  </p>
                )}
                <a
                  href={item.type === "poll" ? `/PollDetail?id=${item.id}` : `/PetitionDetail?id=${item.id}`}
                  className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View details →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      {activeLayers.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-slate-200 z-10">
          <div className="text-xs font-semibold text-slate-700 mb-2">
            Active Layers
          </div>
          <div className="space-y-1">
            {activeLayers.includes("activity") && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-3 h-3 rounded bg-blue-500" />
                Activity Level
              </div>
            )}
            {activeLayers.includes("sentiment") && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 via-amber-500 to-green-500" />
                Sentiment
              </div>
            )}
            {activeLayers.includes("impact") && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-3 h-3 rounded bg-red-500" />
                Impact Records
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}