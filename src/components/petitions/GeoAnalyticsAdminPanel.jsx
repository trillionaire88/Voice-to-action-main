import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Globe, Download, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const COUNTRY_NAMES = {
  AU:"Australia",US:"United States",GB:"United Kingdom",CA:"Canada",NZ:"New Zealand",
  DE:"Germany",FR:"France",JP:"Japan",IN:"India",BR:"Brazil",ZA:"South Africa",
  SG:"Singapore",NG:"Nigeria",KE:"Kenya",MX:"Mexico",IT:"Italy",ES:"Spain",
};
const cn = (code) => COUNTRY_NAMES[code] || code;

export default function GeoAnalyticsAdminPanel({ signatures, petition }) {
  const valid = useMemo(() => signatures.filter(s => !s.is_invalidated && !s.has_withdrawn), [signatures]);

  const byCountry = useMemo(() => {
    const counts = {};
    valid.forEach(s => { if (s.country_code) counts[s.country_code] = (counts[s.country_code] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, name: cn(code), count }));
  }, [valid]);

  const byRegion = useMemo(() => {
    const counts = {};
    valid.forEach(s => { if (s.region_code) counts[s.region_code] = (counts[s.region_code] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([r, c]) => ({ name: r, count: c }));
  }, [valid]);

  // Suspicious location clusters: >80% from single country
  const suspiciousClusters = useMemo(() => {
    const alerts = [];
    const total = valid.length;
    if (total < 10) return alerts;
    byCountry.forEach(c => {
      const pct = (c.count / total) * 100;
      if (pct > 80) alerts.push(`⚠️ ${Math.round(pct)}% of signatures from ${cn(c.code)} — geographic concentration risk`);
    });
    // Check for region clusters
    byRegion.forEach(r => {
      const pct = (r.count / total) * 100;
      if (pct > 60) alerts.push(`⚠️ ${Math.round(pct)}% from region "${r.name}" — potential regional clustering`);
    });
    return alerts;
  }, [byCountry, byRegion, valid]);

  // Density analysis
  const densityAnalysis = useMemo(() => {
    const total = valid.length;
    const countryCount = byCountry.length;
    const avgPerCountry = countryCount > 0 ? (total / countryCount).toFixed(1) : 0;
    const topCountryPct = byCountry[0] ? Math.round((byCountry[0].count / total) * 100) : 0;
    return { total, countryCount, avgPerCountry, topCountryPct };
  }, [byCountry, valid]);

  const handleExport = () => {
    const lines = [
      `Geographic Support Report — ${petition.title}`,
      `Generated: ${format(new Date(), "PPP p")}`,
      `Total valid signatures: ${valid.length}`,
      `Countries represented: ${byCountry.length}`,
      "",
      "=== BY COUNTRY ===",
      ...byCountry.map(c => `${c.code} (${c.name}): ${c.count}`),
      "",
      "=== BY REGION ===",
      ...byRegion.map(r => `${r.name}: ${r.count}`),
      "",
      "=== SUSPICIOUS ALERTS ===",
      ...suspiciousClusters.map(a => a),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `geo-report-${petition.id}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  if (valid.length === 0) return (
    <Card className="border-slate-200">
      <CardContent className="pt-4 text-xs text-slate-400">No signature data yet.</CardContent>
    </Card>
  );

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            Geo Analytics (Admin)
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" />Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 text-sm">
        {/* Density stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 rounded p-2 border border-slate-100">
            <div className="text-slate-400">Total Valid</div>
            <div className="font-bold text-slate-900 text-lg">{densityAnalysis.total.toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 rounded p-2 border border-slate-100">
            <div className="text-slate-400">Countries</div>
            <div className="font-bold text-slate-900 text-lg">{densityAnalysis.countryCount}</div>
          </div>
          <div className="bg-slate-50 rounded p-2 border border-slate-100">
            <div className="text-slate-400">Avg per Country</div>
            <div className="font-bold text-slate-900 text-lg">{densityAnalysis.avgPerCountry}</div>
          </div>
          <div className="bg-slate-50 rounded p-2 border border-slate-100">
            <div className="text-slate-400">Top Country %</div>
            <div className={`font-bold text-lg ${densityAnalysis.topCountryPct > 80 ? "text-red-600" : "text-slate-900"}`}>
              {densityAnalysis.topCountryPct}%
            </div>
          </div>
        </div>

        {/* Suspicious alerts */}
        {suspiciousClusters.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 space-y-1">
            <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />Location Alerts
            </p>
            {suspiciousClusters.map((a, i) => <p key={i} className="text-xs text-red-600">{a}</p>)}
          </div>
        )}

        <Separator />

        {/* Country chart */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Full Country Breakdown</p>
          <ResponsiveContainer width="100%" height={Math.min(byCountry.length * 22 + 20, 280)}>
            <BarChart data={byCountry.slice(0, 15)} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Region table */}
        {byRegion.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Region Breakdown</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {byRegion.map(r => (
                  <div key={r.name} className="flex justify-between text-xs border-b border-slate-50 pb-1">
                    <span className="text-slate-600">{r.name}</span>
                    <span className="font-semibold text-slate-800">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Credibility vs location note */}
        <div className="bg-blue-50 border border-blue-100 rounded p-2 text-xs text-blue-700">
          <p className="font-semibold mb-0.5">Credibility vs Location</p>
          <p>Geographic diversity contributes to the petition's credibility score. Higher country spread = higher geo sub-score (up to 40 pts).</p>
        </div>
      </CardContent>
    </Card>
  );
}