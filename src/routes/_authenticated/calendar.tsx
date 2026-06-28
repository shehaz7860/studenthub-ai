import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — StudentHub AI" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();

  const monthStart = new Date(year, month, 1).toISOString();
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: assignments = [] } = useQuery({
    queryKey: ["cal-assignments", year, month],
    queryFn: async () => (await supabase.from("assignments").select("id,title,due_date,priority").gte("due_date", monthStart).lte("due_date", monthEnd)).data ?? [],
  });
  const { data: exams = [] } = useQuery({
    queryKey: ["cal-exams", year, month],
    queryFn: async () => (await supabase.from("exams").select("id,title,exam_date").gte("exam_date", monthStart).lte("exam_date", monthEnd)).data ?? [],
  });

  const byDay: Record<number, { type: "task" | "exam"; title: string; id: string }[]> = {};
  assignments.forEach((a: any) => {
    if (!a.due_date) return;
    const d = new Date(a.due_date).getDate();
    (byDay[d] ??= []).push({ type: "task", title: a.title, id: a.id });
  });
  exams.forEach((e: any) => {
    const d = new Date(e.exam_date).getDate();
    (byDay[d] ??= []).push({ type: "exam", title: e.title, id: e.id });
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <PageShell title="Calendar" description="Deadlines, exams, and your study rhythm."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="size-4" /></Button>
          <span className="text-sm font-semibold w-36 text-center">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="size-4" /></Button>
          <Button variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
        </div>
      }
    >
      <div className="glass-card rounded-2xl p-3 md:p-4">
        <div className="grid grid-cols-7 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-[10px] uppercase tracking-widest text-muted-foreground text-center py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => (
            <div key={i} className={`aspect-square md:aspect-[1.1] rounded-lg p-1.5 border ${d ? "border-border bg-secondary/30" : "border-transparent"} ${d && isToday(d) ? "ring-2 ring-brand" : ""}`}>
              {d && (
                <>
                  <div className={`text-xs font-semibold ${isToday(d) ? "text-brand" : ""}`}>{d}</div>
                  <div className="space-y-0.5 mt-1">
                    {(byDay[d] ?? []).slice(0, 3).map((ev) => (
                      <div key={ev.id} className={`text-[10px] truncate px-1 rounded ${ev.type === "exam" ? "bg-destructive/20 text-destructive" : "bg-brand/20 text-brand"}`}>{ev.title}</div>
                    ))}
                    {(byDay[d] ?? []).length > 3 && <div className="text-[9px] text-muted-foreground">+{byDay[d].length - 3}</div>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
