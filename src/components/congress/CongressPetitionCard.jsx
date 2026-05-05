import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  Target,
  Users,
  TrendingUp,
  Clock,
  Star,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CongressPetitionCard({
  petition,
  isTracked,
  onTrackChange,
  highlight = false,
}) {
  const navigate = useNavigate();
  const [tracking, setTracking] = useState(isTracked);

  const progress = ((petition.signature_count_verified || 0) / (petition.signature_goal || 1000)) * 100;
  const daysLeft = petition.deadline
    ? Math.ceil((new Date(petition.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const handleTrack = async (e) => {
    e.stopPropagation();
    // Implementation would create/delete CongressTrackedPetition record
    setTracking(!tracking);
    onTrackChange();
  };

  return (
    <Card
      className={`cursor-pointer transition-all ${
        highlight ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
      } hover:shadow-md`}
      onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${petition.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{petition.title}</CardTitle>
            <p className="text-sm text-slate-600">{petition.short_summary}</p>
          </div>
          <Button
            variant={tracking ? "default" : "outline"}
            size="sm"
            onClick={handleTrack}
            className="flex-shrink-0"
          >
            <Star className={`w-4 h-4 ${tracking ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Target & Location */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            {petition.target_name}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <MapPin className="w-3 h-3 mr-1" />
            {petition.country_code}
            {petition.region_code && ` • ${petition.region_code}`}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {petition.category?.replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Signature Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="font-semibold">
                {(petition.signature_count_verified || 0).toLocaleString()} verified
              </span>
            </div>
            <span className="text-xs text-slate-500">
              of {(petition.signature_goal || 1000).toLocaleString()}
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
          <div className="mt-1 text-xs text-slate-500">
            {Math.round(progress)}% of goal
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200">
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900">
              {petition.signature_count_total.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">Total Sigs</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900">
              {Math.round(((petition.signature_count_verified || 0) / (petition.signature_count_total || 1)) * 100)}%
            </div>
            <div className="text-xs text-slate-500">Verified</div>
          </div>
          <div className="text-center">
            {daysLeft !== null && (
              <>
                <div className="text-sm font-semibold text-slate-900">{Math.max(0, daysLeft)}</div>
                <div className="text-xs text-slate-500">Days left</div>
              </>
            )}
            {daysLeft === null && petition.status === 'delivered' && (
              <>
                <div className="text-sm font-semibold text-emerald-600">✓</div>
                <div className="text-xs text-slate-500">Delivered</div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}