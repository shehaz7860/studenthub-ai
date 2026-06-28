import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Flame, Target, BookCheck, MessageSquare, Timer, FileText,
  Calendar, ArrowRight, Sparkles, Plus, Search, Clock,
} from "lucide-react";
import { formatTime, relativeDay, PRIORITY_STYLES, quoteOfDay, DAY_NAMES } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — StudentHub AI" }] }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const quote = quoteOfDay();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return { ...data, email: user.email };
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["dashboard-assignments"],
    queryFn: async () => {
      const { data } = await supabase.from("assignments")
        .select("*, subjects(name,color)")
        .neq("status", "done")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: todayClasses = [] } = useQuery({
    queryKey: ["dashboard-today-classes", dayOfWeek],
    queryFn: async () => {
      const { data } = await supabase.from("timetable_entries")
        .select("*, subjects(color)")
        .eq("day_of_week", dayOfWeek)
        .order("start_time", { ascending: true });
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: sessions } = await supabase.from("study_sessions")
        .select("duration_minutes, started_at")
        .gte("started_at", since.toISOString());
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayMins = (sessions ?? []).filter(s => s.started_at.slice(0, 10) === todayStr).reduce((a, b) => a + b.duration_minutes, 0);
      // streak: consecutive days with at least one session, ending today
      const days = new Set((sessions ?? []).map(s => s.started_at.slice(0, 10)));
      let streak = 0;
      for (let i = 0; i < 60; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        if (days.has(k)) streak++; else if (i > 0) break;
      }
      const { count: activeTasks } = await supabase.from("assignments").select("*", { count: "exact", head: true }).neq("status", "done");
      return { todayHours: todayMins / 60, streak, activeTasks: activeTasks ?? 0 };
    },
  });

  const goalHours = Number(profile?.daily_goal_hours ?? 4);
  const todayHours = stats?.todayHours ?? 0;
  const goalPct = Math.min(100, Math.round((todayHours / goalHours) * 100));

  const nextClass = todayClasses.find((c) => {
    const [h, m] = (c.start_time as string).split(":").map(Number);
    const t = new Date(); t.setHours(h, m, 0, 0);
    return t.getTime() > Date.now();
  });

  const firstName = (profile?.full_name || "").split(" ")[0] || "there";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {greeting()}, {firstName} <span className="inline-block animate-fade-in-up">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · {assignments.length > 0 ? `${assignments.length} active task${assignments.length === 1 ? "" : "s"}` : "Inbox is clear ✨"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input placeholder="Quick search…" className="pl-9 pr-4 h-10 rounded-lg glass-card border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 w-56" />
          </div>
          <Link to="/ai-assistant"><Button className="gradient-brand text-white border-0 shadow-[var(--shadow-glow)] h-10"><Sparkles className="size-4 mr-1.5" /> Ask AI</Button></Link>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard icon={Flame} label="Study streak" value={`${stats?.streak ?? 0} days`} accent="text-orange-400" />
        <StatCard icon={Clock} label="Today" value={`${todayHours.toFixed(1)}h`} accent="text-brand" />
        <StatCard icon={BookCheck} label="Active tasks" value={String(stats?.activeTasks ?? 0)} accent="text-brand-2" />
        <div className="glass-card rounded-2xl p-5 gradient-brand text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
          <div className="relative">
            <p className="text-white/80 text-xs uppercase tracking-wider font-medium">Next class</p>
            <p className="text-lg font-bold mt-1 leading-tight truncate">{nextClass ? nextClass.title : "Free!"}</p>
            <p className="text-white/70 text-[11px] mt-0.5">{nextClass ? `${formatTime(nextClass.start_time as string)} · ${nextClass.location || "—"}` : "No more classes today"}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left: Goal + Upcoming */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Daily goal */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 size-60 rounded-full gradient-brand opacity-20 blur-3xl" />
            <div className="relative flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold flex items-center gap-2"><Target className="size-4 text-brand" /> Daily study goal</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Stay consistent. Small wins compound.</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums">{todayHours.toFixed(1)}<span className="text-sm text-muted-foreground font-normal">/{goalHours}h</span></div>
                <div className="text-[11px] text-brand font-medium">{goalPct}% complete</div>
              </div>
            </div>
            <Progress value={goalPct} className="h-2.5" />
          </div>

          {/* Upcoming assignments */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><BookCheck className="size-4 text-brand" /> Upcoming assignments</h2>
              <Link to="/assignments" className="text-xs text-brand hover:underline">View all <ArrowRight className="inline size-3" /></Link>
            </div>
            {assignments.length === 0 ? (
              <div className="px-5 pb-6 text-sm text-muted-foreground">No active assignments. <Link to="/assignments" className="text-brand hover:underline">Add your first →</Link></div>
            ) : (
              <ul className="px-2 pb-2">
                {assignments.map((a: any) => {
                  const due = a.due_date ? new Date(a.due_date) : null;
                  return (
                    <li key={a.id}>
                      <Link to="/assignments" className="flex items-center gap-3 p-3 rounded-xl hover:bg-sidebar-accent/50 transition-colors group">
                        <div className="size-11 rounded-xl border border-border bg-background/40 grid place-items-center text-[10px] font-bold leading-none text-center px-1">
                          {due ? (
                            <>
                              <span className="text-muted-foreground uppercase">{due.toLocaleDateString(undefined, { month: "short" })}</span>
                              <span className="text-base block">{due.getDate()}</span>
                            </>
                          ) : <span>—</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate group-hover:text-brand transition-colors">{a.title}</div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            {a.subjects?.name && <span className="px-1.5 py-0.5 rounded bg-secondary">{a.subjects.name}</span>}
                            {due && <span>{relativeDay(due)}</span>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.medium}`}>{a.priority}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction to="/assignments" icon={Plus} label="New task" />
            <QuickAction to="/notes" icon={FileText} label="New note" />
            <QuickAction to="/timer" icon={Timer} label="Start timer" />
            <QuickAction to="/ai-assistant" icon={MessageSquare} label="Ask AI" accent />
          </div>
        </div>

        {/* Right: Schedule + Quote */}
        <div className="space-y-4 md:space-y-6">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><Calendar className="size-4 text-brand" /> Today · {DAY_NAMES[dayOfWeek]}</h2>
            {todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes today. <Link to="/timetable" className="text-brand hover:underline">Set up timetable →</Link></p>
            ) : (
              <ul className="space-y-4">
                {todayClasses.map((c: any) => {
                  const color = c.subjects?.color || c.color || "var(--color-brand)";
                  return (
                    <li key={c.id} className="relative pl-5 border-l border-border">
                      <span className="absolute -left-[5px] top-1 size-2.5 rounded-full ring-4 ring-background" style={{ background: color }} />
                      <div className="text-[11px] font-mono text-muted-foreground">{formatTime(c.start_time as string)} – {formatTime(c.end_time as string)}</div>
                      <div className="text-sm font-semibold mt-0.5">{c.title}</div>
                      {c.location && <div className="text-[11px] text-muted-foreground">{c.location}</div>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-2xl p-6 relative overflow-hidden border border-border" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--color-brand) 20%, transparent), color-mix(in oklab, var(--color-brand-2) 20%, transparent))" }}>
            <Sparkles className="size-4 text-brand mb-3" />
            <p className="text-sm italic leading-relaxed">"{quote.q}"</p>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">— {quote.a}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 md:p-5 hover:border-brand/30 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${accent ?? "text-brand"}`} />
      </div>
      <p className="text-xl md:text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, accent }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; accent?: boolean }) {
  return (
    <Link to={to} className={`glass-card rounded-xl p-4 hover:border-brand/40 transition-all group ${accent ? "border-brand/30" : ""}`}>
      <div className={`size-9 rounded-lg grid place-items-center mb-2 transition-transform group-hover:scale-110 ${accent ? "gradient-brand text-white" : "bg-brand/10 text-brand"}`}>
        <Icon className="size-4" />
      </div>
      <p className="text-xs font-semibold">{label}</p>
    </Link>
  );
}
