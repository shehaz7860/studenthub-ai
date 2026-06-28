import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Calendar as CalIcon, Trash2, Printer } from "lucide-react";
import { DAY_NAMES, formatTime, SUBJECT_COLORS } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({ meta: [{ title: "Timetable — StudentHub AI" }] }),
  component: TimetablePage,
});

function TimetablePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["timetable"],
    queryFn: async () => {
      const { data } = await supabase.from("timetable_entries").select("*, subjects(name,color)").order("start_time");
      return data ?? [];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("timetable_entries").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable"] }),
  });

  const days = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun

  return (
    <PageShell
      title="Timetable"
      description="Your weekly rhythm at a glance."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="size-4 mr-1.5" /> Print</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gradient-brand text-white border-0"><Plus className="size-4 mr-1.5" /> Add class</Button></DialogTrigger>
            <NewClassDialog subjects={subjects as any[]} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["timetable"] }); }} />
          </Dialog>
        </div>
      }
    >
      {entries.length === 0 ? (
        <EmptyState icon={CalIcon} title="No classes yet" description="Add your weekly schedule and we'll surface today's classes on your dashboard." action={<Button onClick={() => setOpen(true)} className="gradient-brand text-white"><Plus className="size-4 mr-1.5" /> Add class</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {days.map((d) => {
            const dayEntries = entries.filter((e: any) => e.day_of_week === d);
            return (
              <div key={d} className="glass-card rounded-2xl p-3 min-h-[180px]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">{DAY_NAMES[d]}</h3>
                <div className="space-y-2">
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic px-1">No classes</p>
                  ) : dayEntries.map((e: any) => {
                    const color = e.subjects?.color || e.color || "#6366f1";
                    return (
                      <div key={e.id} className="group relative rounded-lg p-2.5 border-l-4 bg-secondary/40 hover:bg-secondary/70 transition-colors" style={{ borderLeftColor: color }}>
                        <div className="text-[10px] font-mono text-muted-foreground">{formatTime(e.start_time)} – {formatTime(e.end_time)}</div>
                        <div className="text-sm font-semibold truncate">{e.title}</div>
                        {e.location && <div className="text-[10px] text-muted-foreground truncate">{e.location}</div>}
                        <button onClick={() => del.mutate(e.id)} className="opacity-0 group-hover:opacity-100 absolute top-1.5 right-1.5 p-1 rounded hover:bg-destructive/15 hover:text-destructive transition" title="Delete"><Trash2 className="size-3" /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function NewClassDialog({ subjects, onDone }: { subjects: any[]; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [location, setLocation] = useState("");
  const [subjectId, setSubjectId] = useState("none");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !title) return;
    const { error } = await supabase.from("timetable_entries").insert({
      user_id: user.id, title, day_of_week: Number(day),
      start_time: start, end_time: end, location: location || null,
      subject_id: subjectId === "none" ? null : subjectId, color,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Class added");
    onDone();
  };

  return (
    <DialogContent className="glass-card border-border">
      <DialogHeader><DialogTitle>Add class</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <Input placeholder="Class title (e.g., Calculus I)" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div className="grid grid-cols-2 gap-2">
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DAY_NAMES.map((n, i) => <SelectItem key={i} value={String(i)}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </div>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No subject</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground">Color</span>
          {SUBJECT_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} className={`size-6 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : ""}`} style={{ background: c }} />
          ))}
        </div>
        <DialogFooter><Button type="submit" className="gradient-brand text-white">Add class</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
