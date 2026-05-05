import React from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Radio, Vote, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ParliamentaryWatch() {
  const { data: sessions = [] } = useQuery({
    queryKey: ["parliamentarySessions"],
    queryFn: () => api.entities.ParliamentarySession.list("-start_time"),
  });

  const liveSessions = sessions.filter((s) => s.status === "live");

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {liveSessions.length > 0 && (
        <Alert className="border-red-200 bg-red-50 mb-6">
          <Radio className="h-4 w-4 text-red-600 animate-pulse" />
          <AlertDescription className="text-sm text-red-800">
            <strong>LIVE NOW:</strong> {liveSessions.length} parliamentary session(s) in progress
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          Parliamentary Watch
        </h1>
        <p className="text-slate-600">
          Vote alongside your parliament in real-time
        </p>
      </div>

      <div className="grid gap-6">
        {sessions.map((session) => (
          <Card key={session.id} className="border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    {new Date(session.start_time).toLocaleString()}
                  </p>
                </div>
                <Badge
                  className={
                    session.status === "live"
                      ? "bg-red-500 text-white animate-pulse"
                      : session.status === "completed"
                      ? "bg-slate-100 text-slate-600"
                      : "bg-blue-50 text-blue-700"
                  }
                >
                  {session.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-600">
                  <Users className="w-4 h-4 inline mr-1" />
                  {session.citizen_participants} citizens watching
                </span>
                <span className="text-slate-600">
                  <Vote className="w-4 h-4 inline mr-1" />
                  {session.total_items} items
                </span>
              </div>

              {session.stream_url && session.status === "live" && (
                <Button size="sm" className="w-full bg-red-600 hover:bg-red-700">
                  <Radio className="w-4 h-4 mr-2" />
                  Watch Live & Vote
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}