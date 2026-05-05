import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Scale,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Appeals() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Home"));
    } finally {
      setLoading(false);
    }
  };

  const { data: myAppeals = [] } = useQuery({
    queryKey: ["myAppeals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await api.entities.Appeal.filter(
        { user_id: user.id },
        "-created_date"
      );
    },
    enabled: !!user,
  });

  const statusConfig = {
    pending: { icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending Review" },
    under_review: { icon: AlertCircle, color: "bg-blue-50 text-blue-700 border-blue-200", label: "Under Review" },
    accepted: { icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Accepted" },
    rejected: { icon: XCircle, color: "bg-red-50 text-red-700 border-red-200", label: "Rejected" },
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Appeals</h1>
            <p className="text-slate-600">
              View and manage your moderation decision appeals
            </p>
          </div>
        </div>
      </div>

      {myAppeals.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Scale className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Appeals Yet
            </h3>
            <p className="text-slate-600 mb-4">
              You haven't submitted any appeals for moderation decisions.
            </p>
            <p className="text-sm text-slate-500">
              If you believe a moderation action was taken in error, you can appeal
              it from the moderation notice on the affected content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myAppeals.map((appeal) => {
            const config = statusConfig[appeal.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <Card key={appeal.id} className="border-slate-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg mb-2">
                        {appeal.target_type.charAt(0).toUpperCase() + appeal.target_type.slice(1)} Appeal
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>Submitted {format(new Date(appeal.created_date), 'PPP')}</span>
                      </div>
                    </div>
                    <Badge className={config.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Your Appeal</h4>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg">
                      {appeal.appeal_text}
                    </p>
                  </div>

                  {appeal.moderator_response && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Moderator Response
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-200">
                          {appeal.moderator_response}
                        </p>
                        {appeal.resolved_at && (
                          <p className="text-xs text-slate-500 mt-2">
                            Resolved on {format(new Date(appeal.resolved_at), 'PPP')}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {appeal.status === 'pending' && (
                    <div className="pt-2">
                      <p className="text-sm text-slate-600">
                        Your appeal is in the queue and will be reviewed by our moderation team
                        within 48 hours. You'll be notified of the decision.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">About the Appeals Process</h3>
            <p className="text-sm text-blue-800 leading-relaxed mb-2">
              If you believe a moderation decision was made in error, you can submit an appeal. Our team
              will review your case and the original decision within 48 hours.
            </p>
            <p className="text-sm text-blue-800 leading-relaxed">
              Appeals are reviewed by different moderators than those who made the original decision. Each
              user may submit one appeal per moderation action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}