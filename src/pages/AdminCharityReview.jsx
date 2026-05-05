import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCharityReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      if (currentUser.role !== "admin" && currentUser.role !== "moderator") {
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["charitySubmissions"],
    queryFn: () => api.entities.CharitySubmission.list("-created_date"),
    enabled: !!user,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ submissionId, action, notes }) => {
      await api.entities.CharitySubmission.update(submissionId, {
        status: action,
        admin_notes: notes,
      });

      if (action === "approved" && selectedSubmission.charity_id) {
        await api.entities.Charity.update(selectedSubmission.charity_id, {
          status: "approved",
          verification_level: "platform_verified",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["charitySubmissions"]);
      toast.success("Review completed");
      setSelectedSubmission(null);
      setAdminNotes("");
    },
  });

  const handleReview = (action) => {
    reviewMutation.mutate({
      submissionId: selectedSubmission.id,
      action,
      notes: adminNotes,
    });
  };

  const pendingSubmissions = submissions.filter(
    (s) => s.status === "submitted" || s.status === "under_review"
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Charity Review Queue</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : pendingSubmissions.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-slate-600">No pending charity submissions to review</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingSubmissions.map((submission) => (
            <Card key={submission.id} className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-slate-900 mb-2">
                      {submission.legal_name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline">
                        {submission.country_of_registration}
                      </Badge>
                      <Badge className="bg-blue-50 text-blue-700">
                        {submission.registration_number}
                      </Badge>
                      <Badge
                        className={
                          submission.status === "submitted"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        }
                      >
                        {submission.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                      {submission.description}
                    </p>
                    {submission.website_url && (
                      <a
                        href={submission.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {submission.website_url}
                      </a>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setAdminNotes(submission.admin_notes || "");
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      {selectedSubmission && (
        <Dialog open={true} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Charity Submission</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Legal Name</Label>
                <p className="text-sm text-slate-900">{selectedSubmission.legal_name}</p>
              </div>

              <div>
                <Label>Registration Number</Label>
                <p className="text-sm text-slate-900">
                  {selectedSubmission.registration_number}
                </p>
              </div>

              <div>
                <Label>Description</Label>
                <p className="text-sm text-slate-700">{selectedSubmission.description}</p>
              </div>

              {selectedSubmission.proof_documents_urls?.length > 0 && (
                <div>
                  <Label>Proof Documents</Label>
                  <div className="space-y-1">
                    {selectedSubmission.proof_documents_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-blue-600 hover:underline"
                      >
                        Document {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add review notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleReview("needs_more_info")}
                  disabled={reviewMutation.isPending}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Request Info
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleReview("rejected")}
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleReview("approved")}
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}