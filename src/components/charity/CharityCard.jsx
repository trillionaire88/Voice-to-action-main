import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, CheckCircle2, TrendingUp, Clock } from "lucide-react";

export default function CharityCard({ charity, onClick }) {
  const getCategoryColor = (category) => {
    const colors = {
      health: "bg-red-50 text-red-700 border-red-200",
      education: "bg-blue-50 text-blue-700 border-blue-200",
      environment: "bg-green-50 text-green-700 border-green-200",
      poverty: "bg-purple-50 text-purple-700 border-purple-200",
      animals: "bg-amber-50 text-amber-700 border-amber-200",
      disaster_relief: "bg-orange-50 text-orange-700 border-orange-200",
      human_rights: "bg-indigo-50 text-indigo-700 border-indigo-200",
      indigenous: "bg-teal-50 text-teal-700 border-teal-200",
      research: "bg-cyan-50 text-cyan-700 border-cyan-200",
      community: "bg-pink-50 text-pink-700 border-pink-200",
    };
    return colors[category] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getVerificationBadge = () => {
    if (charity.verification_level === "platform_verified") {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (charity.verification_level === "community_verified") {
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Community
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-50">
        <Clock className="w-3 h-3 mr-1" />
        Submitted
      </Badge>
    );
  };

  return (
    <Card
      className="border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Cover Image */}
      {charity.cover_image_url ? (
        <div
          className="h-40 rounded-t-xl bg-gradient-to-br from-pink-100 to-red-100"
          style={{
            backgroundImage: `url(${charity.cover_image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : (
        <div className="h-40 rounded-t-xl bg-gradient-to-br from-pink-100 to-red-100 flex items-center justify-center">
          <Heart className="w-16 h-16 text-pink-300" />
        </div>
      )}

      <CardContent className="pt-4 pb-5">
        {/* Logo & Name */}
        <div className="flex items-start gap-3 mb-3">
          {charity.logo_url ? (
            <img
              src={charity.logo_url}
              alt={charity.name}
              className="w-14 h-14 rounded-lg object-cover border-2 border-slate-200"
            />
          ) : (
            <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center">
              <Heart className="w-7 h-7 text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 mb-1 line-clamp-2 group-hover:text-pink-600 transition-colors leading-tight">
              {charity.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />
              <span>{charity.country}</span>
            </div>
          </div>
        </div>

        {/* Verification Badge */}
        <div className="mb-3">
          {getVerificationBadge()}
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-4 line-clamp-3 leading-relaxed">
          {charity.description}
        </p>

        {/* Categories */}
        {charity.categories && charity.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {charity.categories.slice(0, 2).map((cat) => (
              <Badge key={cat} className={getCategoryColor(cat)} variant="outline">
                {cat.replace("_", " ")}
              </Badge>
            ))}
            {charity.categories.length > 2 && (
              <Badge variant="outline" className="bg-slate-100 text-slate-600">
                +{charity.categories.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Impact Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <span className="flex items-center gap-1.5 text-slate-600">
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            <span className="font-semibold text-green-700">
              ${(charity.total_donations_amount || 0).toLocaleString()}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <Heart className="w-3.5 h-3.5 text-pink-500" />
            <span>{charity.donations_count || 0} supporters</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}