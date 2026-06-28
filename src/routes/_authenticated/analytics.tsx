import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { BarChart3, Clock, BookCheck, Award, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — StudentHub AI" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data: sessions = [] } = await supabase.from("study_sessions").select("duration_minutes, started_at, subject_id, subjects(name,color)").gte("started_at", since.toISOString());
      const { data: assignments = [] } = await supabase.from("assignments").select("status, created_at, updated_at");

      // Last 14 days line chart
      const days: { date: string; minutes: number; label: string }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const mins = (sessions ?? []).filter((s: any) => s.started_at.slice(0, 10) === key).reduce((a: number, b: any) => a + b.duration_minutes, 0);
        days.push({ date: key, minutes: mins, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) });
      }

      // Subject breakdown
      const subjMap = new Map<string, { name: string; color: string; minutes: number }>();
      (sessions ?? []).forEach((s: any) => {
        const name = s.subjects?.name ?? "Unspecified";
        const color = s.subjects?.color ?? "#6366f1";
        const prev = subjMap.get(name) ?? { name, color, minutes: 0 };
        prev.minutes += s.duration_minutes;
        subjMap.set(name, prev);
      });
      const bySubject = Array.from(subjMap.values()).sort((a, b) => b.minutes - a.minutes);

      const totalMins = (sessions ?? []).reduce((a: number, b: any) => a + b.duration_minutes, 0);
      const completed = (assignments ?? []).filter((a: any) => a.status === "done").length;
      const total = (assignments ?? []).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const productivity = Math.min(100, Math.round((totalMins / 60 / 30) * 100 / 4)); // simple score

      return { days, bySubject, totalMins, completed, total, completionRate, productivity };
    },
  });

  const totalHours = ((data?.totalMins ?? 0) / 60).toFixed(1);

  return (
    <PageShell title="Analytics" description="See your study patterns and what's working.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatBlock icon={Clock} label="Study hours (30d)" value={totalHours} />
        <StatBlock icon={BookCheck} label="Tasks completed" value={String(data?.completed ?? 0)} />
        <StatBlock icon={Award} label="Completion rate" value={`${data?.completionRate ?? 0}%`} />
        <StatBlock icon={TrendingUp} label="Productivity score" value={`${data?.productivity ?? 0}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><BarChart3 className="size-4 text-brand" /> Study time (last 14 days)</h3>
          <p className="text-xs text-muted-foreground mb-4">Minutes per day</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.days ?? []}>
                <defs>
                  <linearGradient id="study" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.21 280)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.65 0.21 280)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "oklch(0.7 0 0)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.7 0 0)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.02 280)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="minutes" stroke="oklch(0.7 0.2 320)" fill="url(#study)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Time by subject</h3>
          {(data?.bySubject ?? []).length === 0 ? <p className="text-xs text-muted-foreground italic">No data yet</p> :
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(data?.bySubject ?? []).map((s) => ({ name: s.name, minutes: s.minutes, fill: s.color }))} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: "oklch(0.7 0 0)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "oklch(0.16 0.02 280)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="minutes" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
        </div>
      </div>
    </PageShell>
  );
}

function StatBlock({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">{label}</p><Icon className="size-4 text-brand" /></div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
