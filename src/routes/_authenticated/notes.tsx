import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Star, Trash2, FileText, Tag } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Notes — StudentHub AI" }] }),
  component: NotesPage,
});

type Note = { id: string; title: string; content: string | null; is_favorite: boolean; tags: string[] | null; updated_at: string; subject_id: string | null };

function NotesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFavs, setShowFavs] = useState(false);
  const [draft, setDraft] = useState<{ title: string; content: string; tags: string }>({ title: "", content: "", tags: "" });
  const [savedFlash, setSavedFlash] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data } = await supabase.from("notes").select("*").order("updated_at", { ascending: false });
      return (data ?? []) as Note[];
    },
  });

  const filtered = useMemo(() => notes.filter((n) => {
    if (showFavs && !n.is_favorite) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || (n.content ?? "").toLowerCase().includes(q) || (n.tags ?? []).join(" ").toLowerCase().includes(q);
  }), [notes, search, showFavs]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) setDraft({ title: selected.title, content: selected.content ?? "", tags: (selected.tags ?? []).join(", ") });
  }, [selectedId]);

  // Autosave
  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(async () => {
      const tags = draft.tags.split(",").map((s) => s.trim()).filter(Boolean);
      const { error } = await supabase.from("notes").update({
        title: draft.title || "Untitled", content: draft.content, tags, updated_at: new Date().toISOString(),
      }).eq("id", selected.id);
      if (!error) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
        qc.invalidateQueries({ queryKey: ["notes"] });
      }
    }, 800);
    return () => clearTimeout(t);
  }, [draft, selected?.id]);

  const createNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("notes").insert({ user_id: user.id, title: "Untitled", content: "" }).select().single();
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["notes"] });
    setSelectedId(data.id);
  };

  const toggleFav = async () => {
    if (!selected) return;
    await supabase.from("notes").update({ is_favorite: !selected.is_favorite }).eq("id", selected.id);
    qc.invalidateQueries({ queryKey: ["notes"] });
  };

  const del = async () => {
    if (!selected) return;
    await supabase.from("notes").delete().eq("id", selected.id);
    setSelectedId(null);
    qc.invalidateQueries({ queryKey: ["notes"] });
    toast.success("Note deleted");
  };

  return (
    <PageShell title="Notes" description="Markdown-powered notes with autosave."
      actions={<Button onClick={createNote} className="gradient-brand text-white border-0"><Plus className="size-4 mr-1.5" /> New note</Button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-12rem)] min-h-[500px]">
        {/* List */}
        <div className="glass-card rounded-2xl p-3 flex flex-col overflow-hidden">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 bg-transparent" placeholder="Search…" />
            </div>
            <Button size="icon" variant={showFavs ? "default" : "outline"} className={`size-9 shrink-0 ${showFavs ? "gradient-brand text-white" : ""}`} onClick={() => setShowFavs(!showFavs)}><Star className="size-4" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-1">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-secondary/40 animate-pulse" />) :
              filtered.length === 0 ? <p className="text-xs text-muted-foreground p-3 italic">No notes</p> :
              filtered.map((n) => (
                <button key={n.id} onClick={() => setSelectedId(n.id)} className={`w-full text-left p-3 rounded-lg transition-colors ${selectedId === n.id ? "bg-brand/15 border border-brand/30" : "hover:bg-sidebar-accent/50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm truncate flex-1">{n.title || "Untitled"}</h4>
                    {n.is_favorite && <Star className="size-3 fill-warning text-warning shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{(n.content ?? "").slice(0, 80) || "No content"}</p>
                </button>
              ))}
          </div>
        </div>

        {/* Editor */}
        <div className="glass-card rounded-2xl flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 grid place-items-center p-6">
              <EmptyState icon={FileText} title="Select or create a note" description="Capture ideas in markdown. Notes autosave as you type." action={<Button onClick={createNote} className="gradient-brand text-white"><Plus className="size-4 mr-1.5" /> New note</Button>} />
            </div>
          ) : (
            <>
              <div className="border-b border-border p-3 flex items-center gap-2">
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="border-0 bg-transparent text-lg font-bold focus-visible:ring-0 px-2" placeholder="Untitled" />
                <span className={`text-[10px] transition-opacity ${savedFlash ? "opacity-100 text-success" : "opacity-50 text-muted-foreground"}`}>{savedFlash ? "✓ Saved" : "Autosave on"}</span>
                <button onClick={toggleFav} className="p-2 rounded-md hover:bg-secondary"><Star className={`size-4 ${selected.is_favorite ? "fill-warning text-warning" : "text-muted-foreground"}`} /></button>
                <button onClick={del} className="p-2 rounded-md hover:bg-destructive/15 hover:text-destructive text-muted-foreground"><Trash2 className="size-4" /></button>
              </div>
              <div className="border-b border-border px-3 py-2 flex items-center gap-2">
                <Tag className="size-3.5 text-muted-foreground" />
                <Input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} className="border-0 bg-transparent h-7 text-xs focus-visible:ring-0 px-1" placeholder="Tags (comma separated)" />
              </div>
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                <Textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} className="resize-none border-0 rounded-none focus-visible:ring-0 bg-transparent font-mono text-sm p-4 h-full" placeholder="Write in markdown… # Heading, **bold**, - list" />
                <div className="overflow-y-auto p-4 border-l border-border prose prose-invert prose-sm max-w-none prose-headings:font-bold prose-a:text-brand">
                  <ReactMarkdown>{draft.content || "_Preview will appear here._"}</ReactMarkdown>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
