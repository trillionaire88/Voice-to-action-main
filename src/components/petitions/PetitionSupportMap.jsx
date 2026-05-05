import React, { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Info } from "lucide-react";

// Country code → approximate centroid [lat, lng]
const COUNTRY_COORDS = {
  AU:[-25.3,133.8],US:[37.1,-95.7],GB:[55.4,-3.4],CA:[56.1,-106.3],NZ:[-40.9,174.9],
  DE:[51.2,10.5],FR:[46.2,2.2],JP:[36.2,138.3],IN:[20.6,78.9],BR:[-14.2,-51.9],
  ZA:[-30.6,22.9],SG:[1.35,103.8],NG:[9.1,8.7],KE:[-0.02,37.9],MX:[23.6,-102.6],
  IT:[41.9,12.6],ES:[40.5,-3.7],NL:[52.1,5.3],SE:[60.1,18.6],NO:[60.5,8.5],
  DK:[56.3,9.5],FI:[64.0,26.0],PL:[51.9,19.1],AT:[47.5,14.6],BE:[50.5,4.5],
  PT:[39.4,-8.2],IE:[53.1,-8.2],GR:[39.1,21.8],PH:[12.9,121.8],PK:[30.4,69.3],
  ID:[-0.8,113.9],MY:[4.2,108.0],TH:[15.9,100.9],VN:[14.1,108.3],EG:[26.8,30.8],
  GH:[7.9,-1.0],TZ:[-6.4,34.9],UG:[1.4,32.3],RW:[-1.9,29.9],CN:[35.9,104.2],
  HK:[22.4,114.1],TW:[23.7,121.0],KR:[35.9,127.8],IL:[31.0,34.9],SA:[23.9,45.1],
  AE:[23.4,53.8],TR:[38.9,35.2],UA:[48.4,31.2],RU:[61.5,105.3],
  AR:[-38.4,-63.6],CL:[-35.7,-71.5],CO:[4.6,-74.3],PE:[-9.2,-75.0],VE:[6.4,-66.6],
  GT:[15.8,-90.2],EC:[-1.8,-78.2],BO:[-16.3,-63.6],UY:[-32.5,-55.8],
  MA:[31.8,-7.1],DZ:[28.0,1.7],TN:[33.9,9.6],LY:[26.3,17.2],SD:[12.9,30.2],
  ET:[9.1,40.5],AO:[-11.2,17.9],MZ:[-18.7,35.5],ZM:[-13.1,27.8],ZW:[-20.0,30.0],
  CM:[3.9,11.5],CI:[7.5,-5.5],SN:[14.5,-14.5],ML:[17.6,-2.0],
};

function JurisdictionHighlight({ petition, byCountry }) {
  const topCountry = byCountry[0];
  if (!topCountry) return null;

  let msg = null;
  if (petition.target_type === "local_council" || petition.target_type === "national_government") {
    const local = byCountry.find(c => c.code === petition.country_code);
    if (local) {
      const pct = Math.round((local.count / byCountry.reduce((s, c) => s + c.count, 0)) * 100);
      msg = `${pct}% of signatures come from ${petition.country_code} — the target jurisdiction.`;
    }
  } else if (petition.target_type === "corporation" || petition.target_type === "international_org") {
    msg = `Global support from ${byCountry.length} countries worldwide.`;
  }
  if (!msg) return null;
  return (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

export default function PetitionSupportMap({ signatures, petition }) {
  const [MapComponents, setMapComponents] = useState(null);

  useEffect(() => {
    // Lazy load react-leaflet to avoid SSR issues
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([rl, L]) => {
      // Fix leaflet default marker icon
      delete L.default.Icon.Default.prototype._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setMapComponents({ ...rl, L: L.default });
    });
  }, []);

  const valid = useMemo(() => signatures.filter(s => !s.is_invalidated && !s.has_withdrawn), [signatures]);

  const byCountry = useMemo(() => {
    const counts = {};
    valid.forEach(s => { if (s.country_code) counts[s.country_code] = (counts[s.country_code] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }));
  }, [valid]);

  const maxCount = byCountry[0]?.count || 1;

  const markers = useMemo(() => byCountry
    .filter(c => COUNTRY_COORDS[c.code])
    .map(c => ({
      ...c,
      coords: COUNTRY_COORDS[c.code],
      radius: Math.max(8, Math.min(40, (c.count / maxCount) * 40)),
      opacity: Math.max(0.35, c.count / maxCount),
    })), [byCountry, maxCount]);

  if (valid.length === 0) return null;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            Geographic Support Map
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <MapPin className="w-3 h-3 mr-1" />{byCountry.length} countries
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <JurisdictionHighlight petition={petition} byCountry={byCountry} />

        {/* Map */}
         <div className="rounded-xl overflow-hidden border border-slate-200 relative" style={{ height: 240, maxHeight: 240, zIndex: 0 }}>
          {!MapComponents ? (
            <div className="h-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm">Loading map...</div>
          ) : (
            <MapComponents.MapContainer
              center={[20, 0]}
              zoom={1}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
              zoomControl={false}
              attributionControl={false}
            >
              <MapComponents.TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                attribution=""
              />
              {markers.map(m => (
                <MapComponents.CircleMarker
                  key={m.code}
                  center={m.coords}
                  radius={m.radius}
                  fillColor="#3b82f6"
                  fillOpacity={m.opacity}
                  color="#1d4ed8"
                  weight={1}
                >
                  <MapComponents.Tooltip>
                    <span className="text-xs font-semibold">{m.code}: {m.count.toLocaleString()} signature{m.count !== 1 ? "s" : ""}</span>
                  </MapComponents.Tooltip>
                </MapComponents.CircleMarker>
              ))}
            </MapComponents.MapContainer>
          )}
        </div>

        {/* Top countries list */}
        <div className="space-y-1.5">
          {byCountry.slice(0, 5).map(c => (
            <div key={c.code} className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 w-8">{c.code}</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.round((c.count / maxCount) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-700 w-12 text-right">{c.count.toLocaleString()}</span>
            </div>
          ))}
          {byCountry.length > 5 && (
            <p className="text-xs text-slate-400 text-center">+{byCountry.length - 5} more countries</p>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center">Only country-level data shown. Personal details are never displayed.</p>
      </CardContent>
    </Card>
  );
}