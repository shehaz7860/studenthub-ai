import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Timer as TimerIcon, Coffee, Brain } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/timer")({
  head: () => ({ meta: [{ title: "Focus Timer — StudentHub AI" }] }),
  component: TimerPage,
});

const PRESETS = [
  { label: "Pomodoro", focus: 25, break: 5, icon: TimerIcon },
  { label: "Deep work", focus: 50, break: 10, icon: Brain },
  { label: "Sprint", focus: 15, break: 3, icon: Coffee },
];

function TimerPage() {
  const qc = useQueryClient();
  const [preset, setPreset] = useState(PRESETS[0]);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const startedRef = useRef<Date | null>(null);

  useEffect(() => {
    setSecondsLeft((mode === "focus" ? preset.focus : preset.break) * 60);
  }, [preset, mode]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (secondsLeft <= 0 && running) {
      setRunning(false);
      if (mode === "focus" && startedRef.current) {
        recordSession(preset.focus);
      }
      toast.success(mode === "focus" ? "Focus session complete! Time for a break ☕" : "Break over — let's go 🚀");
      setMode(mode === "focus" ? "break" : "focus");
    }
  }, [secondsLeft, running, mode]);

  const recordSession = async (mins: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("study_sessions").insert({ user_id: user.id, duration_minutes: mins, session_type: "pomodoro" });
    qc.invalidateQueries({ queryKey: ["sessions"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const start = () => { if (!running) startedRef.current = new Date(); setRunning(true); };
  const reset = () => { setRunning(false); setSecondsLeft((mode === "focus" ? preset.focus : preset.break) * 60); };

  const mins = Math.floor(Math.max(0, secondsLeft) / 60).toString().padStart(2, "0");
  const secs = (Math.max(0, secondsLeft) % 60).toString().padStart(2, "0");
  const total = (mode === "focus" ? preset.focus : preset.break) * 60;
  const progress = ((total - secondsLeft) / total) * 100;

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 7);
      const { data } = await supabase.from("study_sessions").select("*").gte("started_at", since.toISOString()).order("started_at", { ascending: false });
      return data ?? [];
    },
  });

  const todayMins = sessions.filter((s: any) => s.started_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((a: number, b: any) => a + b.duration_minutes, 0);
  const weekMins = sessions.reduce((a: number, b: any) => a + b.duration_minutes, 0);

  return (
    <PageShell title="Focus Timer" description="Pomodoro-style sessions to power your study blocks.">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 md:gap-6">
        <div className="glass-card rounded-2xl p-6 md:p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,var(--color-brand)_0%,transparent_60%)]" style={{ opacity: running ? 0.25 : 0.1, transition: "opacity 0.5s" }} />
          <div className="relative">
            <div className="flex gap-2 justify-center mb-6">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const active = p.label === preset.label;
                return (
                  <button key={p.label} onClick={() => { setPreset(p); setRunning(false); }} className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${active ? "gradient-brand text-white shadow-[var(--shadow-glow)]" : "glass-card text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="size-3.5" /> {p.label}
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">{mode === "focus" ? "Focus" : "Break"}</div>
            <div className="relative size-64 md:size-80 mx-auto mb-6">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="3" />
                <circle cx="50" cy="50" r="46" fill="none" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 46}`} strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress / 100)}`} style={{ transition: "stroke-dashoffset 1s linear" }} />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="oklch(0.65 0.21 280)" />
                    <stop offset="100%" stopColor="oklch(0.7 0.2 320)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-6xl md:text-7xl font-bold tabular-nums tracking-tight">{mins}<span className="text-muted-foreground/40">:</span>{secs}</div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <Button size="lg" onClick={running ? () => setRunning(false) : start} className="gradient-brand text-white border-0 min-w-[140px]">
                {running ? <><Pause className="size-4 mr-2" /> Pause</> : <><Play className="size-4 mr-2" /> Start</>}
              </Button>
              <Button size="lg" variant="outline" onClick={reset}><RotateCcw className="size-4 mr-2" /> Reset</Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-3">Focus stats</h3>
            <div className="space-y-3">
              <Stat label="Today" value={`${(todayMins / 60).toFixed(1)}h`} />
              <Stat label="This week" value={`${(weekMins / 60).toFixed(1)}h`} />
              <Stat label="Sessions (7d)" value={String(sessions.length)} />
            </div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-3 text-sm">Recent sessions</h3>
            {sessions.length === 0 ? <p className="text-xs text-muted-foreground italic">No sessions yet</p> :
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {sessions.slice(0, 10).map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{new Date(s.started_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    <span className="font-semibold">{s.duration_minutes}m</span>
                  </li>
                ))}
              </ul>
            }
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><span className="font-bold tabular-nums">{value}</span></div>;
}