import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SCHEMA_CHECKS = [
  {
    table: "petitions",
    columns: [
      "id",
      "title",
      "creator_user_id",
      "status",
      "signature_count_total",
      "creator_relationship",
      "allow_public_withdrawal",
      "category",
      "country_code",
    ],
  },
  {
    table: "polls",
    columns: [
      "id",
      "question",
      "creator_user_id",
      "status",
      "total_votes_cached",
      "allow_comments",
      "audience_type",
      "category",
    ],
  },
  {
    table: "profiles",
    columns: [
      "id",
      "email",
      "full_name",
      "role",
      "is_blue_verified",
      "reputation_score",
      "avatar_url",
      "bio",
      "is_suspended",
      "mfa_enabled",
    ],
  },
  {
    table: "signatures",
    columns: ["id", "petition_id", "user_id", "is_anonymous", "comment", "country_code"],
  },
  {
    table: "communities",
    columns: ["id", "name", "founder_user_id", "member_count", "is_hidden", "country_code"],
  },
  {
    table: "votes",
    columns: ["id", "poll_id", "user_id", "option_id", "country_code"],
  },
  {
    table: "notifications",
    columns: ["id", "user_id", "type", "title", "body", "is_read", "action_url"],
  },
  {
    table: "transactions",
    columns: ["id", "user_id", "amount", "currency", "payment_type", "status"],
  },
  {
    table: "verification_requests",
    columns: ["id", "user_id", "status", "payment_status", "stripe_session_id"],
  },
];

export default function SchemaValidator() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const runCheck = useCallback(async () => {
    setRunning(true);
    const checkResults = [];

    for (const check of SCHEMA_CHECKS) {
      try {
        const { error } = await supabase.from(check.table).select(check.columns.join(",")).limit(1);

        if (error) {
          const missingMatch = error.message.match(
            /column \"([^\"]+)\" does not exist|Could not find the '([^']+)' column/
          );
          const missingColumn = missingMatch ? missingMatch[1] || missingMatch[2] : "unknown";
          checkResults.push({
            table: check.table,
            status: "error",
            message: `Missing column: ${missingColumn}`,
            missingColumn,
          });
        } else {
          checkResults.push({
            table: check.table,
            status: "ok",
            message: "All columns present",
          });
        }
      } catch (e) {
        checkResults.push({
          table: check.table,
          status: "error",
          message: e?.message || "Check failed",
        });
      }
    }

    setResults(checkResults);
    setLastRun(new Date());
    setRunning(false);
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (!user || !["admin", "owner_admin"].includes(user.role)) return null;

  const errorCount = results.filter((r) => r.status === "error").length;
  const okCount = results.filter((r) => r.status === "ok").length;

  return (
    <Card className="border-slate-200 mb-8">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            {errorCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            )}
            Database Schema Health
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {errorCount > 0 && <Badge variant="destructive">{errorCount} issues</Badge>}
            {okCount > 0 && <Badge className="bg-emerald-100 text-emerald-700">{okCount} ok</Badge>}
            <Button size="sm" variant="outline" onClick={runCheck} disabled={running}>
              <RefreshCw className={`w-3 h-3 mr-1 ${running ? "animate-spin" : ""}`} />
              {running ? "Checking..." : "Re-check"}
            </Button>
          </div>
        </div>
        {lastRun && <p className="text-xs text-slate-400">Last checked: {lastRun.toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent>
        {results.length === 0 && running && <p className="text-sm text-slate-400">Running schema checks...</p>}
        <div className="space-y-2">
          {results.map((result) => (
            <div key={result.table} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                {result.status === "ok" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <span className="text-sm font-mono font-medium text-slate-700 truncate">{result.table}</span>
              </div>
              <span
                className={`text-xs text-right shrink-0 max-w-[55%] ${result.status === "ok" ? "text-emerald-600" : "text-red-600"}`}
              >
                {result.message}
              </span>
            </div>
          ))}
        </div>
        {errorCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 font-medium">
              Schema issues detected. Run{" "}
              <code className="bg-amber-100 px-1 rounded">supabase/schema_audit_fix.sql</code> in the Supabase SQL
              Editor to add missing columns.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
