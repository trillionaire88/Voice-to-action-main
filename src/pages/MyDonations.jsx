import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ArrowLeft, Download, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function MyDonations() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser || null);
    } catch (error) {
      navigate(createPageUrl("Charities"));
    }
  };

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["myDonations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
      return data || [];
    },
    enabled: !!user,
  });

  const totalDonated = donations
    .filter((d) => d.payment_status === "succeeded")
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Charities"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Charities
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Donations</h1>
          <p className="text-slate-600">Your giving history on Voice to Action</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="border-slate-200 bg-gradient-to-br from-pink-50 to-red-50 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Donated</p>
              <p className="text-4xl font-bold text-slate-900">
                ${totalDonated.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 mb-1">Total Donations</p>
              <p className="text-2xl font-bold text-slate-900">
                {donations.filter((d) => d.payment_status === "succeeded").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donations List */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Donation History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">No donations yet</p>
              <Button onClick={() => navigate(createPageUrl("Charities"))}>
                Browse Charities
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {donations.map((donation) => (
                <Card key={donation.id} className="border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Heart className="w-4 h-4 text-pink-600" />
                        <span className="font-semibold text-slate-900">
                          Charity ID: {donation.charity_id.substring(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(donation.created_date || donation.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-slate-900">
                        {donation.currency} {donation.amount}
                      </div>
                      <Badge
                        className={
                          donation.payment_status === "succeeded"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }
                      >
                        {donation.payment_status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}