import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CheckCircle2, TrendingUp, Clock, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function InstitutionHub() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  const { data: institutions = [], isLoading } = useQuery({
    queryKey: ["institutions", filterType],
    queryFn: async () => {
      const all = await api.entities.Institution.list("-created_date");
      if (filterType === "all") return all.filter((i) => i.verification_status === "verified");
      return all.filter(
        (i) => i.verification_status === "verified" && i.institution_type === filterType
      );
    },
  });

  const filteredInstitutions = institutions.filter((inst) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      inst.name.toLowerCase().includes(query) ||
      inst.legal_name?.toLowerCase().includes(query) ||
      inst.country_code?.toLowerCase().includes(query)
    );
  });

  const getTrustBadge = (score) => {
    if (score >= 80) return { color: "green", label: "Highly Trusted" };
    if (score >= 60) return { color: "blue", label: "Trusted" };
    if (score >= 40) return { color: "yellow", label: "Moderate" };
    return { color: "orange", label: "Low Trust" };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          Institutional Profiles
        </h1>
        <p className="text-slate-600">
          Verified institutions making public decisions and responding to civic input
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search institutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="national_government">National Government</SelectItem>
            <SelectItem value="regional_government">Regional Government</SelectItem>
            <SelectItem value="local_council">Local Council</SelectItem>
            <SelectItem value="corporation">Corporation</SelectItem>
            <SelectItem value="ngo">NGO</SelectItem>
            <SelectItem value="media_organisation">Media</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Institutions Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstitutions.map((institution) => {
            const trustBadge = getTrustBadge(institution.trust_score || 50);
            return (
              <Card
                key={institution.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(createPageUrl("InstitutionProfile") + `?id=${institution.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    {institution.logo_url ? (
                      <img
                        src={institution.logo_url}
                        alt={institution.name}
                        className="w-12 h-12 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <Badge className={`bg-${trustBadge.color}-50 text-${trustBadge.color}-700`}>
                      {trustBadge.label}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{institution.name}</CardTitle>
                  <p className="text-xs text-slate-600">
                    {institution.institution_type.replace(/_/g, " ")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {institution.short_bio && (
                    <p className="text-sm text-slate-700 line-clamp-2">{institution.short_bio}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{institution.trust_score || 50}%</p>
                      <p className="text-slate-600">Trust</p>
                    </div>
                    <div>
                      <p className="font-bold text-blue-600">{institution.responsiveness_score || 50}%</p>
                      <p className="text-slate-600">Response</p>
                    </div>
                    <div>
                      <p className="font-bold text-green-600">{institution.accountability_score || 50}%</p>
                      <p className="text-slate-600">Delivery</p>
                    </div>
                  </div>
                  {institution.verification_status === "verified" && (
                    <div className="flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified Institution</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredInstitutions.length === 0 && !isLoading && (
        <Card className="p-12 text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No institutions found</p>
        </Card>
      )}
    </div>
  );
}