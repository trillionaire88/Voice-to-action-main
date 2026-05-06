import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Users,
  Globe2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export default function ResultsVisualization({
  options,
  votes,
  myVote,
  canChangeVote,
  onChangeVote,
}) {
  const [viewMode, setViewMode] = useState("all"); // all, verified
  const [breakdownType, setBreakdownType] = useState("none"); // none, country, age

  const results = useMemo(() => {
    const useAggregates = !votes?.length;

    if (useAggregates && options?.length) {
      const totalAll = options.reduce(
        (sum, o) => sum + (o.votes_count_cached ?? o.vote_count ?? 0),
        0,
      );
      const totalVerified = options.reduce(
        (sum, o) => sum + (o.verified_votes_count ?? 0),
        0,
      );
      const total = viewMode === "verified" ? totalVerified : totalAll;

      return options.map((opt) => {
        const count =
          viewMode === "verified"
            ? opt.verified_votes_count ?? 0
            : opt.votes_count_cached ?? opt.vote_count ?? 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return {
          option: opt,
          count,
          percentage,
        };
      }).sort((a, b) => b.count - a.count);
    }

    const filteredVotes =
      viewMode === "verified"
        ? votes.filter((v) => v.is_verified_user)
        : votes;

    const optionVotes = {};
    options.forEach((opt) => {
      optionVotes[opt.id] = {
        option: opt,
        count: 0,
        percentage: 0,
      };
    });

    filteredVotes.forEach((vote) => {
      if (optionVotes[vote.option_id]) {
        optionVotes[vote.option_id].count++;
      }
    });

    const totalVotes = filteredVotes.length;
    Object.keys(optionVotes).forEach((optId) => {
      optionVotes[optId].percentage =
        totalVotes > 0 ? (optionVotes[optId].count / totalVotes) * 100 : 0;
    });

    return Object.values(optionVotes).sort((a, b) => b.count - a.count);
  }, [options, votes, viewMode]);

  const breakdownData = useMemo(() => {
    if (breakdownType === "none") return null;
    if (!votes || votes.length === 0) return null;

    const filteredVotes =
      viewMode === "verified"
        ? votes.filter((v) => v.is_verified_user)
        : votes;

    const breakdown = {};

    filteredVotes.forEach((vote) => {
      const key =
        breakdownType === "country"
          ? vote.user_country_code_snapshot
          : vote.user_age_bracket_snapshot;

      if (!key) return;

      if (!breakdown[key]) {
        breakdown[key] = {};
        options.forEach((opt) => {
          breakdown[key][opt.id] = 0;
        });
      }

      if (breakdown[key][vote.option_id] !== undefined) {
        breakdown[key][vote.option_id]++;
      }
    });

    return breakdown;
  }, [votes, options, breakdownType, viewMode]);

  const biasWarning = useMemo(() => {
    if (!votes || votes.length === 0) return null;

    const countryCounts = {};
    votes.forEach((vote) => {
      const country = vote.user_country_code_snapshot;
      if (country) {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
    });

    const sortedCountries = Object.entries(countryCounts).sort(
      ([, a], [, b]) => b - a
    );

    if (sortedCountries.length === 0) return null;

    const topCountry = sortedCountries[0];
    const percentage = (topCountry[1] / votes.length) * 100;

    if (percentage > 75) {
      return {
        country: topCountry[0],
        percentage: percentage.toFixed(0),
      };
    }

    return null;
  }, [votes]);

  if (!options || options.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">Loading results…</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = results
    .filter(r => r.option && r.option.option_text)
    .map((r, idx) => ({
      name: r.option.option_text.length > 20
        ? r.option.option_text.substring(0, 20) + "…"
        : r.option.option_text,
      votes: r.count,
      color: COLORS[idx % COLORS.length],
    }));

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xl">Results</CardTitle>
          {myVote && (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              You voted
            </Badge>
          )}
        </div>

        {/* View Mode Toggle */}
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">
              <Users className="w-4 h-4 mr-2" />
              All Votes
            </TabsTrigger>
            <TabsTrigger value="verified">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Verified Only
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Bias Warning */}
        {biasWarning && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-orange-900">Geographic Bias Detected</p>
              <p className="text-orange-700">
                {biasWarning.percentage}% of votes come from {biasWarning.country}.
                Results may not represent global opinion.
              </p>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-3">
          {results.map((result, idx) => {
            const isMyVote = myVote?.option_id === result.option.id;
            return (
              <div
                key={result.option.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isMyVote
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span>{result.option.option_text}</span>
                    {isMyVote && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-slate-900">
                      {result.percentage.toFixed(1)}%
                    </span>
                    <p className="text-xs text-slate-500">
                      {result.count} votes
                    </p>
                  </div>
                </div>
                <Progress value={result.percentage} className="h-2" />
              </div>
            );
          })}
        </div>

        {/* Chart */}
        {results.length > 0 && (
          <div className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Breakdown Toggle */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="font-semibold text-slate-900 mb-3">View Breakdown</h4>
          <Tabs value={breakdownType} onValueChange={setBreakdownType}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="none">None</TabsTrigger>
              <TabsTrigger value="country">
                <Globe2 className="w-4 h-4 mr-2" />
                Country
              </TabsTrigger>
              <TabsTrigger value="age">Age</TabsTrigger>
            </TabsList>
          </Tabs>

          {breakdownData && votes?.length > 0 ? (
            <div className="mt-4 space-y-3">
              {Object.entries(breakdownData)
                .sort(([, a], [, b]) => {
                  const totalA = Object.values(a).reduce((sum, v) => sum + v, 0);
                  const totalB = Object.values(b).reduce((sum, v) => sum + v, 0);
                  return totalB - totalA;
                })
                .slice(0, 5)
                .map(([key, optionCounts]) => {
                  const total = Object.values(optionCounts).reduce(
                    (sum, count) => sum + count,
                    0
                  );
                  return (
                    <div key={key} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">{key}</span>
                        <span className="text-sm text-slate-600">
                          {total} votes
                        </span>
                      </div>
                      <div className="space-y-1">
                        {options.map((opt) => {
                          const count = optionCounts[opt.id] || 0;
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          if (count === 0) return null;
                          return (
                            <div
                              key={opt.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-slate-600">
                                {opt.option_text.substring(0, 25)}...
                              </span>
                              <span className="font-medium text-slate-900">
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : breakdownType !== "none" && (!votes || votes.length === 0) ? (
            <p className="text-sm text-slate-500 mt-4">
              Detailed geographic or age breakdown is not loaded for this poll (aggregate results only).
            </p>
          ) : null}
        </div>

        {/* Change Vote */}
        {canChangeVote && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const newOption = options.find((o) => o.id !== myVote.option_id);
              if (newOption) onChangeVote(newOption.id);
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Change Your Vote
          </Button>
        )}
      </CardContent>
    </Card>
  );
}