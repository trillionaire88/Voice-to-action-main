import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, CheckCircle2, Clock, XCircle, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function IdentityVerification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [verificationMethod, setVerificationMethod] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const { data: existingVerification } = useQuery({
    queryKey: ["myVerification", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const verifications = await api.entities.IdentityVerification.filter({ user_id: user.id });
      return verifications.length > 0 ? verifications[0] : null;
    },
    enabled: !!user,
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!verificationMethod) {
        throw new Error("Please select a verification method");
      }

      // In production, this would upload to a secure KYC provider
      // For now, create a pending verification record
      const verification = await api.entities.IdentityVerification.create({
        user_id: user.id,
        verification_method: verificationMethod,
        verification_status: "pending",
        verified_country: user.country_code,
      });

      return verification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myVerification"]);
      toast.success("Verification submitted! Our team will review within 24-48 hours.");
    },
    onError: (error) => {
      toast.error(error.message || "Verification submission failed");
    },
  });

  const getStatusBadge = (status) => {
    const configs = {
      pending: { icon: Clock, color: "yellow", label: "Pending Review" },
      in_review: { icon: Clock, color: "blue", label: "In Review" },
      approved: { icon: CheckCircle2, color: "green", label: "Verified" },
      rejected: { icon: XCircle, color: "red", label: "Rejected" },
      expired: { icon: AlertTriangle, color: "orange", label: "Expired" },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <Badge className={`bg-${config.color}-50 text-${config.color}-700 border-${config.color}-200`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Identity Verification (KYC)
        </h1>
        <p className="text-slate-600">
          Verify your identity to ensure one human = one account
        </p>
      </div>

      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Why verification?</strong> Every Voice prevents manipulation, duplicate accounts, and ensures
          every voice represents one real human. Your identity is encrypted and never made public.
        </AlertDescription>
      </Alert>

      {existingVerification ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Verification Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Status</span>
              {getStatusBadge(existingVerification.verification_status)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Method</span>
              <span className="font-medium">{existingVerification.verification_method}</span>
            </div>
            {existingVerification.verified_at && (
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Verified</span>
                <span className="font-medium">
                  {new Date(existingVerification.verified_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {existingVerification.rejection_reason && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{existingVerification.rejection_reason}</AlertDescription>
              </Alert>
            )}
            {existingVerification.verification_status === "approved" && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your identity is verified. You can now participate with full privileges.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submit Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Verification Method *
              </label>
              <Select value={verificationMethod} onValueChange={setVerificationMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="government_id">Government ID</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="drivers_license">Driver's License</SelectItem>
                  <SelectItem value="national_id">National ID Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert className="border-slate-200 bg-slate-50">
              <AlertTriangle className="h-4 w-4 text-slate-600" />
              <AlertDescription className="text-slate-700">
                <strong>Privacy:</strong> Your document will be encrypted, processed by a secure third-party
                KYC provider, and never stored in plain text or made public.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-sm text-slate-600 mb-4">
                Document upload coming soon. For now, submit your verification request and our team
                will contact you with instructions.
              </p>
            </div>

            <Button
              onClick={() => submitVerificationMutation.mutate()}
              disabled={!verificationMethod || submitVerificationMutation.isPending}
              className="w-full"
            >
              {submitVerificationMutation.isPending ? "Submitting..." : "Submit Verification Request"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How Verification Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <div className="flex gap-3">
            <div className="font-bold text-blue-600">1.</div>
            <p>Select your preferred government-issued ID type</p>
          </div>
          <div className="flex gap-3">
            <div className="font-bold text-blue-600">2.</div>
            <p>Submit your request and receive secure upload instructions</p>
          </div>
          <div className="flex gap-3">
            <div className="font-bold text-blue-600">3.</div>
            <p>Our team or automated KYC partner reviews within 24-48 hours</p>
          </div>
          <div className="flex gap-3">
            <div className="font-bold text-blue-600">4.</div>
            <p>Once approved, your account gains full platform privileges</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}