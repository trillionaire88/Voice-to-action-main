import { useState, useEffect, useCallback } from "react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { GripVertical, Eye, EyeOff, RotateCcw, Settings2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ALL_TABS, DEFAULT_TABS, REQUIRED_TABS } from "./tabRegistry";

export default function HeaderCustomizer({ user, onSave, embedded = false }) {
  const [open, setOpen] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const isVisible = useCallback((tab, u) => {
    if (tab.adminOnly && u?.role !== "admin" && u?.role !== "owner_admin") return false;
    if (tab.modOnly && u?.role !== "admin" && u?.role !== "moderator" && u?.role !== "owner_admin") return false;
    if (tab.requiresAuth && !u) return false;
    return true;
  }, []);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    const existing = await api.entities.UserHeaderSettings.filter({ user_id: user.id }).catch(() => []);
    if (existing[0]) {
      const enabled = existing[0].enabled_tabs || DEFAULT_TABS;
      const hidden = existing[0].hidden_tabs || [];
      const ordered = [...enabled];
      ALL_TABS.filter(t => isVisible(t, user)).forEach(t => { if (!ordered.includes(t.key)) ordered.push(t.key); });
      setTabs(ordered.map(key => {
        const cfg = ALL_TABS.find(t => t.key === key);
        return cfg ? { ...cfg, visible: !hidden.includes(key) } : null;
      }).filter(Boolean));
    } else {
      setTabs(ALL_TABS.filter(t => isVisible(t, user)).map(t => ({ ...t, visible: DEFAULT_TABS.includes(t.key) })));
    }
  }, [user, isVisible]);

  useEffect(() => {
    if (!user) return;
    if (embedded) loadSettings();
  }, [embedded, user, loadSettings]);

  useEffect(() => {
    if (open && user && !embedded) loadSettings();
  }, [open, user, embedded, loadSettings]);

  const toggleTab = (key) => {
    if (REQUIRED_TABS.includes(key)) return;
    setTabs(prev => prev.map(t => t.key === key ? { ...t, visible: !t.visible } : t));
  };

  const resetToDefault = () => {
    setTabs(ALL_TABS.filter(t => isVisible(t, user)).map(t => ({ ...t, visible: DEFAULT_TABS.includes(t.key) })));
  };

  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop = (i) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...tabs];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setTabs(next);
    setDragIdx(null); setDragOverIdx(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const enabled = tabs.filter(t => t.visible).map(t => t.key);
      const hidden = tabs.filter(t => !t.visible).map(t => t.key);
      const existing = await api.entities.UserHeaderSettings.filter({ user_id: user.id }).catch(() => []);
      const data = { user_id: user.id, enabled_tabs: enabled, hidden_tabs: hidden, last_updated: new Date().toISOString() };
      if (existing[0]) { await api.entities.UserHeaderSettings.update(existing[0].id, data); }
      else { await api.entities.UserHeaderSettings.create(data); }
      localStorage.setItem(`header_tabs_${user.id}`, JSON.stringify({ enabled, hidden }));
      window.dispatchEvent(new CustomEvent("ev-header-tabs-saved"));
      if (embedded) onSave?.(enabled);
      else {
        toast.success("Header saved");
        setOpen(false);
        onSave?.(enabled);
      }
    } catch (e) { toast.error("Failed to save: " + e.message); }
    finally { setSaving(false); }
  };

  const listBody = (
    <>
      <div className={`overflow-y-auto max-h-[60vh] px-3 py-2 ${embedded ? "max-h-[50vh]" : ""}`}>
        {tabs.map((tab, i) => {
          const isRequired = REQUIRED_TABS.includes(tab.key);
          return (
            <div
              key={tab.key}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              className={`flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1 cursor-grab transition-all
                ${dragOverIdx === i ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50"}
                ${!tab.visible ? "opacity-40" : ""}`}
            >
              <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
              <tab.icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="flex-1 text-sm text-slate-700">{tab.label}</span>
              {isRequired && <Badge variant="outline" className="text-[10px]">Required</Badge>}
              {tab.adminOnly && <Badge className="text-[10px] bg-rose-50 text-rose-600 border-rose-200">Admin</Badge>}
              <button
                type="button"
                onClick={() => toggleTab(tab.key)}
                disabled={isRequired}
                className={`p-1 rounded transition-colors ${isRequired ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-200"}`}
              >
                {tab.visible ? <Eye className="w-4 h-4 text-blue-500" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="text-xs text-slate-500" onClick={resetToDefault}>
          <RotateCcw className="w-3 h-3 mr-1.5" />Reset to default
        </Button>
        <div className="flex gap-2">
          {!embedded && (
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          )}
          <Button size="sm" onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50/50">
        <div className="px-4 py-3 border-b border-slate-100 bg-white">
          <p className="text-xs text-slate-500">Drag to reorder · toggle eye to show/hide</p>
        </div>
        {listBody}
      </div>
    );
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" title="Customize navigation" onClick={() => setOpen(true)}>
        <Settings2 className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <DialogTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4" />Customize Navigation</DialogTitle>
            <DialogDescription className="text-xs">Drag to reorder · toggle eye to show/hide</DialogDescription>
          </DialogHeader>
          {listBody}
        </DialogContent>
      </Dialog>
    </>
  );
}
