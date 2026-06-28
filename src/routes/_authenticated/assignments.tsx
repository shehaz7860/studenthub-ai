import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, BookCheck, Trash2, Check, Calendar } from "lucide-react";
import { PRIORITY_STYLES, formatShortDate, relativeDay } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({ meta: [{ title: "Assignments — StudentHub AI" }] }),
  component: AssignmentsPage,
});

type Assignment = {
  id: string; title: string; description: string | null; due_date: string | null;
  priority: string; status: string; progress: number; subject_id: string | null;
  subjects?: { name: string; color: string } | null;
};

function AssignmentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("name")).data ?? [],
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("*, subjects(name,color)").order("due_date", { ascending: true, nullsFirst: false });
      return (data ?? []) as Assignment[];
    },
  });

  const filtered = assignments.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, progress }: { id: string; status: string; progress: number }) => {
      const { error } = await supabase.from("assignments").update({ status, progress }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assignments"] }); toast.success("Deleted"); },
  });

  return (
    <PageShell
      title="Assignments"
      description="All your tasks in one focused workspace."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-brand text-white border-0"><Plus className="size-4 mr-1.5" /> New assignment</Button>
          </DialogTrigger>
          <NewAssignmentDialog subjects={subjects as any[]} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["assignments"] }); qc.invalidateQueries({ queryKey: ["dashboard-assignments"] }); }} />
        </Dialog>
      }
    >
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assignments…" className="pl-9 glass-card border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 glass-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="todo">To do</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-secondary/50 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookCheck} title="No assignments yet" description="Create your first task and we'll keep you on track." action={<Button onClick={() => setOpen(true)} className="gradient-brand text-white"><Plus className="size-4 mr-1.5" /> New assignment</Button>} />
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => {
            const done = a.status === "done";
            return (
              <li key={a.id} className={`glass-card rounded-2xl p-4 md:p-5 flex items-start gap-4 transition-all hover:border-brand/30 ${done ? "opacity-60" : ""}`}>
                <button
                  onClick={() => updateStatus.mutate({ id: a.id, status: done ? "todo" : "done", progress: done ? 0 : 100 })}
                  className={`size-6 rounded-md border-2 grid place-items-center shrink-0 mt-0.5 transition-all ${done ? "bg-brand border-brand text-white" : "border-border hover:border-brand"}`}
                >
                  {done && <Check className="size-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-semibold ${done ? "line-through" : ""}`}>{a.title}</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.medium}`}>{a.priority}</span>
                    {a.subjects?.name && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${a.subjects.color}22`, color: a.subjects.color }}>{a.subjects.name}</span>}
                  </div>
                  {a.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
                  <div className="flex items-center gap-3 mt-2.5 flex-wrap text-xs text-muted-foreground">
                    {a.due_date && (
                      <span className="flex items-center gap-1"><Calendar className="size-3" /> {formatShortDate(a.due_date)} · {relativeDay(a.due_date)}</span>
                    )}
                    {!done && a.progress > 0 && <div className="flex items-center gap-2"><Progress value={a.progress} className="h-1.5 w-24" /><span>{a.progress}%</span></div>}
                  </div>
                </div>
                <button onClick={() => del.mutate(a.id)} className="p-2 rounded-md hover:bg-destructive/15 hover:text-destructive transition-colors text-muted-foreground" title="Delete"><Trash2 className="size-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}

function NewAssignmentDialog({ subjects, onDone }: { subjects: any[]; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("assignments").insert({
      user_id: user.id,
      title: title.trim(),
      description: description || null,
      due_date: dueDate || null,
      priority,
      subject_id: subjectId === "none" ? null : subjectId,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Assignment added");
    setTitle(""); setDescription(""); setDueDate(""); setPriority("medium"); setSubjectId("none");
    onDone();
  };

  return (
    <DialogContent className="glass-card border-border">
      <DialogHeader><DialogTitle>New assignment</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <Input placeholder="Title (e.g., Calculus problem set 4)" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low priority</SelectItem>
              <SelectItem value="medium">Medium priority</SelectItem>
              <SelectItem value="high">High priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No subject</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button type="submit" disabled={saving} className="gradient-brand text-white">{saving ? "Saving…" : "Create"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
// trigger
