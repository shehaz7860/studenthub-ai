import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { askAI } from "@/lib/ai.functions";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Upload, FileQuestion, Sparkles, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/past-papers")({
  head: () => ({ meta: [{ title: "Past Papers — StudentHub AI" }] }),
  component: PapersPage,
});

function PapersPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [aiOpen, setAiOpen] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiText, setAiText] = useState("");

  const { data: papers = [] } = useQuery({
    queryKey: ["papers"],
    queryFn: async () => (await supabase.from("files").select("*").eq("folder", "past-papers").order("created_at", { ascending: false })).data ?? [],
  });

  const upload = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${user.id}/papers/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("user-files").upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { error } = await supabase.from("files").insert({
      user_id: user.id, name: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size, folder: "past-papers",
    });
    if (error) toast.error(error.message);
    else { toast.success("Paper uploaded"); qc.invalidateQueries({ queryKey: ["papers"] }); }
  };

  const handleFiles = async (list: FileList | null) => { if (!list) return; for (let i = 0; i < list.length; i++) await upload(list[i]); };

  const explain = async (paper: any) => {
    setAiOpen(paper.name); setAiBusy(true); setAiText("");
    try {
      const res = await askAI({ data: { messages: [{ role: "user", content: `I'm reviewing a past exam paper called "${paper.name}". Give me a structured study plan: (1) likely topic areas to focus on, (2) common question patterns for this kind of paper, (3) 3 high-value practice questions with worked solutions, (4) revision tips for the last 48 hours before an exam.` }] } });
      setAiText(res.content);
    } catch (e: any) { toast.error(e.message); } finally { setAiBusy(false); }
  };

  const del = async (p: any) => {
    await supabase.storage.from("user-files").remove([p.storage_path]);
    await supabase.from("files").delete().eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["papers"] });
  };

  const download = async (p: any) => {
    const { data } = await supabase.storage.from("user-files").createSignedUrl(p.storage_path, 60);
    if (data) window.open(data.signedUrl, "_blank");
  };

  return (
    <PageShell title="Past Papers" description="Practice papers, AI-powered explanations."
      actions={
        <>
          <input ref={inputRef} type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <Button onClick={() => inputRef.current?.click()} className="gradient-brand text-white border-0"><Upload className="size-4 mr-1.5" /> Upload paper</Button>
        </>
      }
    >
      {papers.length === 0 ? (
        <EmptyState icon={FileQuestion} title="No past papers yet" description="Upload PDFs of past exam papers and get AI study plans." action={<Button onClick={() => inputRef.current?.click()} className="gradient-brand text-white"><Upload className="size-4 mr-1.5" /> Upload paper</Button>} />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((p: any) => (
            <li key={p.id} className="glass-card rounded-2xl p-5 hover:border-brand/30 transition-all">
              <div className="size-10 rounded-xl gradient-brand grid place-items-center text-white mb-3"><FileQuestion className="size-5" /></div>
              <h3 className="font-semibold text-sm truncate">{p.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => explain(p)} className="flex-1 gradient-brand text-white border-0"><Sparkles className="size-3 mr-1" /> AI plan</Button>
                <Button size="icon" variant="outline" onClick={() => download(p)}><Download className="size-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => del(p)} className="text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!aiOpen} onOpenChange={(o) => !o && setAiOpen(null)}>
        <DialogContent className="glass-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="size-4 text-brand" /> AI study plan</DialogTitle></DialogHeader>
          {aiBusy ? <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Thinking…</div> :
            <div className="prose prose-invert prose-sm max-w-none prose-headings:font-bold prose-a:text-brand"><ReactMarkdown>{aiText}</ReactMarkdown></div>}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}