import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { Globe, TrendingUp, MapPin } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

const COUNTRY_NAMES = {
  AU:"Australia",US:"United States",GB:"United Kingdom",CA:"Canada",NZ:"New Zealand",
  DE:"Germany",FR:"France",JP:"Japan",IN:"India",BR:"Brazil",ZA:"South Africa",
  SG:"Singapore",NG:"Nigeria",KE:"Kenya",MX:"Mexico",IT:"Italy",ES:"Spain",
  NL:"Netherlands",SE:"Sweden",NO:"Norway",PH:"Philippines",PK:"Pakistan",
  ID:"Indonesia",MY:"Malaysia",TH:"Thailand",VN:"Vietnam",EG:"Egypt",
  GH:"Ghana",TZ:"Tanzania",UG:"Uganda",RW:"Rwanda",
};

function countryName(code) { return COUNTRY_NAMES[code] || code; }

export default function SupportDistributionCharts({ signatures }) {
  const valid = useMemo(() => signatures.filter(s => !s.is_invalidated && !s.has_withdrawn), [signatures]);

  // Country distribution
  const byCountry = useMemo(() => {
    const counts = {};
    valid.forEach(s => { if (s.country_code) counts[s.country_code] = (counts[s.country_code] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([code, count]) => ({ name: countryName(code), code, count }));
  }, [valid]);

  // Region distribution (from region_code field)
  const byRegion = useMemo(() => {
    const counts = {};
    valid.forEach(s => { if (s.region_code) counts[s.region_code] = (counts[s.region_code] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([region, count]) => ({ name: region, count }));
  }, [valid]);

  // Daily growth over 30 days
  const growthData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const nextDay = startOfDay(subDays(new Date(), i - 1));
      const count = valid.filter(s => {
        const d = new Date(s.created_date);
        return d >= day && d < nextDay;
      }).length;
      days.push({ date: format(day, "MMM d"), count, cumulative: 0 });
    }
    let running = valid.filter(s => new Date(s.created_date) < startOfDay(subDays(new Date(), 29))).length;
    days.forEach(d => { running += d.count; d.cumulative = running; });
    return days;
  }, [valid]);

  if (valid.length === 0) return null;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          Support Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="country">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="country" className="flex-1 text-xs"><Globe className="w-3 h-3 mr-1" />By Country</TabsTrigger>
            {byRegion.length > 0 && (
              <TabsTrigger value="region" className="flex-1 text-xs"><MapPin className="w-3 h-3 mr-1" />By Region</TabsTrigger>
            )}
            <TabsTrigger value="growth" className="flex-1 text-xs"><TrendingUp className="w-3 h-3 mr-1" />Over Time</TabsTrigger>
          </TabsList>

          <TabsContent value="country">
            {byCountry.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No country data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byCountry} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={(v) => [v, "Signatures"]} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="region">
            {byRegion.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No region data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byRegion} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(v) => [v, "Signatures"]} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="growth">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={growthData} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={6} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="count" name="Daily" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="cumulative" name="Total" stroke="#3b82f6" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}