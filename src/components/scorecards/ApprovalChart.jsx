import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import { format, subDays } from "date-fns";

const _RATING_WEIGHTS = {
  strongly_approve: 1,
  approve: 0.5,
  neutral: 0,
  disapprove: -0.5,
  strongly_disapprove: -1,
};

const APPROVE_POSITIVE = new Set(["strongly_approve", "approve"]);
const APPROVE_NEGATIVE = new Set(["strongly_disapprove", "disapprove"]);

export default function ApprovalChart({ scorecard, ratings = [] }) {
  const [period, setPeriod] = useState("7d");

  const validRatings = ratings.filter(r => !r.is_invalidated && !r.is_suspicious);

  const { approvalData, geoData } = useMemo(() => {
    const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      buckets[d] = { date: d, approve: 0, disapprove: 0, neutral: 0, total: 0 };
    }

    validRatings.forEach(r => {
      const d = format(new Date(r.rated_at || r.created_date), "MMM d");
      if (buckets[d]) {
        buckets[d].total++;
        if (APPROVE_POSITIVE.has(r.rating)) buckets[d].approve++;
        else if (APPROVE_NEGATIVE.has(r.rating)) buckets[d].disapprove++;
        else buckets[d].neutral++;
      }
    });

    const approvalData = Object.values(buckets).map(b => ({
      ...b,
      approvePct: b.total > 0 ? Math.round((b.approve / b.total) * 100) : null,
    }));

    // Geo breakdown
    const geoCounts = {};
    validRatings.forEach(r => {
      if (r.user_country_code) {
        geoCounts[r.user_country_code] = (geoCounts[r.user_country_code] || 0) + 1;
      }
    });
    const geoData = Object.entries(geoCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([country, count]) => ({
        country,
        count,
        pct: Math.round((count / validRatings.length) * 100),
      }));

    return { approvalData, geoData };
  }, [ratings, period]);

  const total = validRatings.length;
  const approveN = validRatings.filter(r => APPROVE_POSITIVE.has(r.rating)).length;
  const disapproveN = validRatings.filter(r => APPROVE_NEGATIVE.has(r.rating)).length;
  const neutralN = validRatings.filter(r => r.rating === "neutral").length;
  const approvePct = total > 0 ? Math.round((approveN / total) * 100) : 0;
  const disapprovePct = total > 0 ? Math.round((disapproveN / total) * 100) : 0;
  const neutralPct = total > 0 ? Math.round((neutralN / total) * 100) : 0;

  const pieData = [
    { name: "Approve", value: approveN, color: "#10b981" },
    { name: "Neutral", value: neutralN, color: "#94a3b8" },
    { name: "Disapprove", value: disapproveN, color: "#ef4444" },
  ].filter(d => d.value > 0);

  if (total === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="pt-6 pb-6 text-center text-slate-500">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No ratings yet — be the first to rate!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Approval", pct: approvePct, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Neutral", pct: neutralPct, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
          { label: "Disapproval", pct: disapprovePct, color: "text-red-600", bg: "bg-red-50 border-red-200" },
        ].map(({ label, pct, color, bg }) => (
          <Card key={label} className={`border ${bg}`}>
            <CardContent className="pt-3 pb-3 text-center">
              <div className={`text-2xl font-extrabold ${color}`}>{pct}%</div>
              <div className="text-xs text-slate-500">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pie chart */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Rating Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {[
                { label: "Strongly Approve", count: scorecard.strongly_approve_count || 0, color: "bg-emerald-500" },
                { label: "Approve", count: scorecard.approve_count || 0, color: "bg-emerald-300" },
                { label: "Neutral", count: scorecard.neutral_count || 0, color: "bg-slate-300" },
                { label: "Disapprove", count: scorecard.disapprove_count || 0, color: "bg-red-300" },
                { label: "Strongly Disapprove", count: scorecard.strongly_disapprove_count || 0, color: "bg-red-500" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-slate-600 flex-1">{label}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend line */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" />Approval Trend</CardTitle>
          <div className="flex gap-1">
            {["7d", "30d", "90d"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-[11px] px-2 py-0.5 rounded font-medium transition-all ${period === p ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                {p}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={approvalData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip formatter={(v) => v !== null ? `${v}%` : "No data"} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="approvePct" stroke="#10b981" strokeWidth={2} dot={false} name="Approval %" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Geo breakdown */}
      {geoData.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Geographic Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {geoData.map(({ country, count, pct }) => (
                <div key={country} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-8 font-mono">{country}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">{count} ({pct}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}