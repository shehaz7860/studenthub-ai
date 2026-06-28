import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Trophy, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Goals — StudentHub AI" }] }),
  component: GoalsPage,
});

function GoalsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await supabase.from("goals").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const inc = async (g: any, delta: number) => {
    const progress = Math.max(0, Math.min(g.target, g.progress + delta));
    const completed = progress >= g.target;
    await supabase.from("goals").update({ progress, completed }).eq("id", g.id);
    qc.invalidateQueries({ queryKey: ["goals"] });
    if (completed && !g.completed) toast.success(`🏆 Goal achieved: ${g.title}`);
  };

  const del = async (id: string) => { await supabase.from("goals").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["goals"] }); };

  const grouped = { daily: [] as any[], weekly: [] as any[], monthly: [] as any[] };
  goals.forEach((g: any) => grouped[g.period as keyof typeof grouped]?.push(g));

  const completed = goals.filter((g: any) => g.completed).length;

  return (
    <PageShell title="Goals" description={`${completed} of ${goals.length} achieved · keep building momentum.`}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gradient-brand text-white border-0"><Plus className="size-4 mr-1.5" /> New goal</Button></DialogTrigger>
          <NewGoalDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["goals"] }); }} />
        </Dialog>
      }
    >
      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" description="Set daily, weekly, or monthly goals and watch your streak grow." action={<Button onClick={() => setOpen(true)} className="gradient-brand text-white"><Plus className="size-4 mr-1.5" /> New goal</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["daily", "weekly", "monthly"] as const).map((period) => (
            <div key={period} className="glass-card rounded-2xl p-4">
              <h3 className="font-semibold capitalize mb-3 flex items-center gap-2"><Target className="size-4 text-brand" /> {period}</h3>
              <ul className="space-y-3">
                {grouped[period].length === 0 ? <p className="text-xs text-muted-foreground italic">No {period} goals</p> :
                  grouped[period].map((g) => (
                    <li key={g.id} className={`p-3 rounded-xl border ${g.completed ? "bg-success/10 border-success/30" : "bg-secondary/40 border-border"} group`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm truncate ${g.completed ? "line-through" : ""}`}>{g.title}</h4>
                          {g.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{g.description}</p>}
                        </div>
                        {g.completed && <Trophy className="size-4 text-warning shrink-0" />}
                      </div>
                      <div className="mt-2.5"><Progress value={(g.progress / g.target) * 100} className="h-1.5" /></div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-muted-foreground tabular-nums">{g.progress} / {g.target}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => inc(g, 1)} className="p-1 rounded hover:bg-brand/15 hover:text-brand"><Check className="size-3.5" /></button>
                          <button onClick={() => del(g.id)} className="p-1 rounded hover:bg-destructive/15 hover:text-destructive"><Trash2 className="size-3.5" /></button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function NewGoalDialog({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  const [period, setPeriod] = useState("daily"); const [target, setTarget] = useState(1);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !title) return;
    const { error } = await supabase.from("goals").insert({ user_id: user.id, title, description: desc || null, period, target });
    if (error) { toast.error(error.message); return; }
    toast.success("Goal added"); onDone();
  };
  return (
    <DialogContent className="glass-card border-border">
      <DialogHeader><DialogTitle>New goal</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <Input placeholder="Goal title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} placeholder="Target" />
        </div>
        <DialogFooter><Button type="submit" className="gradient-brand text-white">Create</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
