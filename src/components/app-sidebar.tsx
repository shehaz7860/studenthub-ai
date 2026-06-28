import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, BookCheck, Calendar, FileText, Layers, MessageSquare,
  FileQuestion, Timer, Target, CalendarDays, FolderOpen, BarChart3, Settings,
  GraduationCap, LogOut, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";

const NAV = [
  { group: "Workspace", items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/assignments", label: "Assignments", icon: BookCheck },
    { to: "/timetable", label: "Timetable", icon: Calendar },
    { to: "/notes", label: "Notes", icon: FileText },
  ]},
  { group: "Study", items: [
    { to: "/flashcards", label: "Flashcards", icon: Layers },
    { to: "/ai-assistant", label: "AI Assistant", icon: MessageSquare, accent: true },
    { to: "/past-papers", label: "Past Papers", icon: FileQuestion },
    { to: "/timer", label: "Focus Timer", icon: Timer },
  ]},
  { group: "Plan", items: [
    { to: "/goals", label: "Goals", icon: Target },
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/files", label: "Files", icon: FolderOpen },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
  ]},
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile-mini"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("full_name, avatar_url, school").eq("id", user.id).maybeSingle();
      return { email: user.email, ...data };
    },
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.full_name || profile?.email || "U").split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col glass-panel border-r border-sidebar-border h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="size-9 rounded-xl gradient-brand grid place-items-center text-white shadow-[var(--shadow-glow)]">
          <GraduationCap className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">StudentHub <span className="gradient-text">AI</span></div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Study workspace</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{g.group}</div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.to;
                const Icon = it.icon;
                const accent = "accent" in it && it.accent;
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        active
                          ? "bg-sidebar-accent text-foreground font-medium shadow-sm"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`size-4 ${active ? "text-brand" : ""}`} />
                      <span>{it.label}</span>
                      {accent && !active && <Sparkles className="size-3 ml-auto text-brand-2" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/40 transition-colors">
          <div className="size-9 rounded-full gradient-brand grid place-items-center text-white text-xs font-bold shrink-0 overflow-hidden">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-9 rounded-full object-cover" /> : initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{profile?.full_name || "Student"}</div>
            <div className="text-[10px] text-muted-foreground truncate">{profile?.school || profile?.email || "—"}</div>
          </div>
          <button onClick={signOut} title="Sign out" className="p-2 rounded-md hover:bg-destructive/15 hover:text-destructive transition-colors">
            <LogOut className="size-3.5" />
          </button>
        </div>
        <Link to="/settings" className="mt-1 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
          <Settings className="size-3" /> Settings
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/dashboard" as const, icon: LayoutDashboard, label: "Home" },
    { to: "/assignments" as const, icon: BookCheck, label: "Tasks" },
    { to: "/ai-assistant" as const, icon: MessageSquare, label: "AI" },
    { to: "/notes" as const, icon: FileText, label: "Notes" },
    { to: "/timer" as const, icon: Timer, label: "Focus" },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-panel border-t border-border px-2 py-2">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link to={it.to} className={`flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] ${active ? "text-brand" : "text-muted-foreground"}`}>
                <Icon className="size-5" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
