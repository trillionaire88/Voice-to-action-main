import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Download, Search, Users, FileText, ShieldCheck, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

function isAdmin(user) {
  return user?.role === "admin" || user?.role === "owner_admin";
}

export default function AdminSignatures() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedPetition, setSelectedPetition] = useState(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.auth.me().catch(() => null),
  });

  const { data: petitions = [], isLoading: petitionsLoading } = useQuery({
    queryKey: ["adminPetitions"],
    queryFn: () => api.entities.Petition.list("-created_date", 100),
    enabled: isAdmin(user),
  });

  const { data: creatorUsers = [] } = useQuery({
    queryKey: ["adminCreatorUsers", petitions.map(p => p.creator_user_id).join(",")],
    queryFn: async () => {
      const ids = [...new Set(petitions.map(p => p.creator_user_id).filter(Boolean))];
      if (!ids.length) return [];
      const users = await Promise.all(ids.map(id => api.entities.User.filter({ id }).catch(() => [])));
      return users.flat();
    },
    enabled: petitions.length > 0 && isAdmin(user),
  });

  const { data: signatures = [], isLoading: sigsLoading } = useQuery({
    queryKey: ["adminSignatures", selectedPetition],
    queryFn: () => api.entities.PetitionSignature.filter({ petition_id: selectedPetition }),
    enabled: !!selectedPetition && isAdmin(user),
  });

  const exportAllCSV = () => {
    if (!signatures.length) {
      toast.error("No signatures to export");
      return;
    }
    const petition = petitions.find(p => p.id === selectedPetition);
    const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

    const lines = [
      `Platform,Voice to Action`,
      `Entity,Voice to Action Pty Ltd`,
      `Document,Full Signer List — Admin Export`,
      `Petition,${escape(petition?.title || '')}`,
      `Date,${format(new Date(), 'PPP')}`,
      ``,
      `Name,Email,Country,Verified,Email Confirmed,User ID,Date Signed`,
      ...signatures.map(s =>
        [
          escape(s.signer_name || 'Anonymous'),
          escape(s.signer_email || ''),
          escape(s.country_code || ''),
          s.is_verified_user ? 'Yes' : 'No',
          s.is_email_confirmed ? 'Yes' : 'No',
          escape(s.user_id || ''),
          escape(s.created_date ? format(new Date(s.created_date), 'PPP') : ''),
        ].join(',')
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `voice_to_action_signers_${selectedPetition}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${signatures.length} signers`);
  };

  if (userLoading) return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Skeleton className="h-8 w-64 mb-4" />
      <Skeleton className="h-96 w-full" />
    </div>
  );

  if (!isAdmin(user)) return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
      <p className="text-slate-600 mb-4">This page is only accessible to platform administrators.</p>
      <Button onClick={() => navigate(createPageUrl("Home"))}>Go Home</Button>
    </div>
  );

  const filteredPetitions = petitions.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-slate-900">Admin — Signer Access</h1>
            <Badge className="bg-purple-100 text-purple-700 border-purple-300">Admin Only</Badge>
          </div>
          <p className="text-slate-500 text-sm">View and export full signer data for any petition.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Petition List */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Petitions
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search petitions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
              {petitionsLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredPetitions.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">No petitions found</p>
              ) : (
                filteredPetitions.map(p => {
                const creator = creatorUsers.find(u => u.id === p.creator_user_id);
                return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPetition(p.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedPetition === p.id ? 'bg-purple-50 border-l-2 border-l-purple-500' : ''}`}
                >
                  <p className="text-sm font-medium text-slate-900 line-clamp-1">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(p.signature_count_total || 0).toLocaleString()} sigs · {p.status}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Eye className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-purple-600 truncate">
                      {creator ? `${creator.full_name} · ${creator.email}` : (p.creator_user_id ? p.creator_user_id.slice(0,12) + '…' : '—')}
                    </span>
                    {p.creator_visible === false && (
                      <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200 py-0 px-1 ml-1">Anon</Badge>
                    )}
                  </div>
                </button>
                );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Signatures Panel */}
        <div className="lg:col-span-2">
          {!selectedPetition ? (
            <Card className="border-slate-200 h-full flex items-center justify-center">
              <CardContent className="text-center py-16">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Select a petition to view signers</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Signers
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sigsLoading ? 'Loading...' : `${signatures.length} total signers`}
                  </p>
                </div>
                <Button
                  onClick={exportAllCSV}
                  disabled={sigsLoading || !signatures.length}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Export Full Signer List
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
                  {sigsLoading ? (
                    <div className="p-4 space-y-2">
                      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : signatures.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-10">No signatures for this petition</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Country</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Verified</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">User ID</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {signatures.map((s, i) => (
                          <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="px-4 py-2 text-slate-900 font-medium">
                              {s.signer_name || <span className="text-slate-400 italic">Anonymous</span>}
                            </td>
                            <td className="px-4 py-2 text-slate-600">{s.country_code || '—'}</td>
                            <td className="px-4 py-2">
                              {s.is_verified_user
                                ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Verified</Badge>
                                : <Badge variant="outline" className="text-xs">Unverified</Badge>
                              }
                            </td>
                            <td className="px-4 py-2 text-xs text-slate-400 font-mono">{s.user_id ? s.user_id.slice(0, 12) + '...' : '—'}</td>
                            <td className="px-4 py-2 text-slate-500 text-xs">
                              {s.created_date ? format(new Date(s.created_date), 'MMM d, yyyy') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}