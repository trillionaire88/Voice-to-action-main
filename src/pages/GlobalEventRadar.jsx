import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, MapPin, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function GlobalEventRadar() {
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: events = [] } = useQuery({
    queryKey: ["globalEvents"],
    queryFn: () => api.entities.GlobalEvent.list("-detected_at"),
  });

  const filteredEvents = events.filter(
    (e) => severityFilter === "all" || e.severity === severityFilter
  );

  const getSeverityColor = (severity) => {
    if (severity === "critical") return "bg-red-600 text-white";
    if (severity === "significant") return "bg-orange-500 text-white";
    if (severity === "notable") return "bg-blue-500 text-white";
    return "bg-slate-500 text-white";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Radar className="w-8 h-8 text-cyan-600" />
          Global Event Radar
        </h1>
        <p className="text-slate-600">Real-time monitoring of significant platform events</p>
      </div>

      <div className="mb-6">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="significant">Significant</SelectItem>
            <SelectItem value="notable">Notable</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredEvents.map((event) => (
          <Card key={event.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getSeverityColor(event.severity)}>
                      {event.severity}
                    </Badge>
                    <Badge variant="outline">{event.event_type.replace(/_/g, " ")}</Badge>
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-1">
                    {event.title}
                  </h3>
                  <p className="text-sm text-slate-700 mb-3">{event.description}</p>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    {event.affected_regions && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.affected_regions.join(", ")}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(event.detected_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredEvents.length === 0 && (
          <Card className="p-12 text-center">
            <Radar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No events detected</p>
          </Card>
        )}
      </div>
    </div>
  );
}