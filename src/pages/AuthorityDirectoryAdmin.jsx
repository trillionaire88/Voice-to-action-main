import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const AUTHORITY_TYPES = [
  { value: "national_government", label: "National Government" },
  { value: "state_regional_government", label: "State / Regional Government" },
  { value: "local_council", label: "Local Council" },
  { value: "corporate_organisation", label: "Corporate Organisation" },
  { value: "public_institution", label: "Public Institution" },
  { value: "other_organisation", label: "Other Organisation" },
];

const EMPTY_FORM = {
  organisation_name: "",
  role_or_title: "",
  department: "",
  official_email: "",
  official_website: "",
  jurisdiction: "",
  country_code: "",
  region_code: "",
  authority_type: "",
  notes: "",
  is_active: true,
};

export default function AuthorityDirectoryAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState(null); // null = closed, "new" = new, object = edit
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    api.auth.me().then(u => {
      if (u.role !== "admin") navigate(createPageUrl("Home"));
      else setUser(u);
    }).catch(() => navigate(createPageUrl("Home")));
  }, []);

  const { data: authorities = [], isLoading } = useQuery({
    queryKey: ["authorityDirectory"],
    queryFn: () => api.entities.AuthorityDirectory.list("-created_date", 200),
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing === "new") {
        await api.entities.AuthorityDirectory.create(form);
      } else {
        await api.entities.AuthorityDirectory.update(editing.id, form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["authorityDirectory"]);
      toast.success(editing === "new" ? "Entry created" : "Entry updated");
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.AuthorityDirectory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["authorityDirectory"]);
      toast.success("Entry deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  const openNew = () => { setForm(EMPTY_FORM); setEditing("new"); };
  const openEdit = (a) => { setForm({ ...a }); setEditing(a); };

  const filtered = authorities.filter(a => {
    const matchSearch = !search || a.organisation_name.toLowerCase().includes(search.toLowerCase()) || (a.department || "").toLowerCase().includes(search.toLowerCase()) || (a.country_code || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.authority_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("MasterAdmin"))}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Authority Directory</h1>
          <p className="text-slate-500 text-sm">Manage delivery recipients for petitions</p>
        </div>
        <Button onClick={openNew} className="ml-auto bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />Add Entry
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search organisation, department, country..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {AUTHORITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {isLoading && <p className="text-center py-8 text-slate-500">Loading...</p>}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No entries found. <button onClick={openNew} className="text-blue-600 hover:underline">Add one?</button></p>
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {filtered.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{a.organisation_name}</span>
                    <Badge variant="outline" className="text-xs">{AUTHORITY_TYPES.find(t => t.value === a.authority_type)?.label || a.authority_type}</Badge>
                    {!a.is_active && <Badge className="bg-slate-100 text-slate-600 text-xs">Inactive</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {[a.department, a.jurisdiction, a.country_code].filter(Boolean).join(" · ")}
                    {a.official_email && <span className="ml-2 text-blue-600">✉ {a.official_email}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => { if (confirm("Delete this entry?")) deleteMutation.mutate(a.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-slate-400 mt-3">{filtered.length} of {authorities.length} entries</p>

      {/* Edit/New Dialog */}
      {editing !== null && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing === "new" ? "Add Authority Entry" : "Edit Entry"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Organisation Name *</Label>
                <Input value={form.organisation_name} onChange={e => setForm(p => ({ ...p, organisation_name: e.target.value }))} />
              </div>
              <div>
                <Label>Authority Type *</Label>
                <Select value={form.authority_type} onValueChange={v => setForm(p => ({ ...p, authority_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {AUTHORITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Country Code *</Label>
                <Input placeholder="AU, US, UK..." value={form.country_code} onChange={e => setForm(p => ({ ...p, country_code: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <Label>Role / Title</Label>
                <Input value={form.role_or_title} onChange={e => setForm(p => ({ ...p, role_or_title: e.target.value }))} />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
              </div>
              <div>
                <Label>Official Email</Label>
                <Input type="email" value={form.official_email} onChange={e => setForm(p => ({ ...p, official_email: e.target.value }))} />
              </div>
              <div>
                <Label>Official Website</Label>
                <Input type="url" placeholder="https://..." value={form.official_website} onChange={e => setForm(p => ({ ...p, official_website: e.target.value }))} />
              </div>
              <div>
                <Label>Jurisdiction</Label>
                <Input placeholder="e.g., Queensland, Australia" value={form.jurisdiction} onChange={e => setForm(p => ({ ...p, jurisdiction: e.target.value }))} />
              </div>
              <div>
                <Label>Region Code</Label>
                <Input placeholder="QLD, NSW..." value={form.region_code} onChange={e => setForm(p => ({ ...p, region_code: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Notes (internal)</Label>
                <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                <Label htmlFor="is_active">Active (visible to petition creators)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.organisation_name || !form.authority_type || !form.country_code}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}