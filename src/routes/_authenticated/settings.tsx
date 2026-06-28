import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Palette, Shield, Download, Sun, Moon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — StudentHub AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["profile-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return { ...data, email: user.email };
    },
  });

  const [form, setForm] = useState({ full_name: "", school: "", grade: "", daily_goal_hours: 4, avatar_url: "" });
  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name ?? "", school: profile.school ?? "", grade: profile.grade ?? "",
      daily_goal_hours: Number(profile.daily_goal_hours ?? 4), avatar_url: profile.avatar_url ?? "",
    });
  }, [profile?.id]);

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    if (error) toast.error(error.message);
    else { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["profile"] }); qc.invalidateQueries({ queryKey: ["profile-mini"] }); }
  };

  const [theme, setTheme] = useState<"dark" | "light">(typeof document !== "undefined" ? (document.documentElement.classList.contains("light") ? "light" : "dark") : "dark");
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const exportData = async () => {
    const [a, n, g, t, f] = await Promise.all([
      supabase.from("assignments").select("*"),
      supabase.from("notes").select("*"),
      supabase.from("goals").select("*"),
      supabase.from("timetable_entries").select("*"),
      supabase.from("flashcards").select("*"),
    ]);
    const blob = new Blob([JSON.stringify({ assignments: a.data, notes: n.data, goals: g.data, timetable: t.data, flashcards: f.data, exported_at: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "studenthub-export.json"; link.click(); URL.revokeObjectURL(url);
  };

  const signOut = async () => { await supabase.auth.signOut(); qc.clear(); navigate({ to: "/", replace: true }); };

  return (
    <PageShell title="Settings" description="Customize your workspace.">
      <Tabs defaultValue="profile" className="max-w-3xl">
        <TabsList className="glass-card border-border">
          <TabsTrigger value="profile"><User className="size-3.5 mr-1.5" /> Profile</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="size-3.5 mr-1.5" /> Appearance</TabsTrigger>
          <TabsTrigger value="account"><Shield className="size-3.5 mr-1.5" /> Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl gradient-brand grid place-items-center text-white font-bold text-xl overflow-hidden">
                {form.avatar_url ? <img src={form.avatar_url} alt="" className="size-16 object-cover" /> : (form.full_name || profile?.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <Label className="text-xs">Avatar URL</Label>
                <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" />
              </div>
            </div>
            <div><Label className="text-xs">Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">School</Label><Input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="Your school" /></div>
              <div><Label className="text-xs">Grade / class</Label><Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g., Year 12" /></div>
            </div>
            <div><Label className="text-xs">Daily study goal (hours)</Label><Input type="number" min={0.5} step={0.5} value={form.daily_goal_hours} onChange={(e) => setForm({ ...form, daily_goal_hours: Number(e.target.value) })} /></div>
            <Button onClick={save} className="gradient-brand text-white border-0">Save changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="appearance">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Theme</Label>
              <div className="flex gap-2">
                <button onClick={() => setTheme("dark")} className={`flex-1 rounded-xl p-4 border-2 transition-all ${theme === "dark" ? "border-brand bg-brand/10" : "border-border"}`}>
                  <Moon className="size-5 mx-auto mb-2" /><div className="text-sm font-semibold">Dark</div>
                </button>
                <button onClick={() => setTheme("light")} className={`flex-1 rounded-xl p-4 border-2 transition-all ${theme === "light" ? "border-brand bg-brand/10" : "border-border"}`}>
                  <Sun className="size-5 mx-auto mb-2" /><div className="text-sm font-semibold">Light</div>
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="account">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div><Label className="text-xs">Email</Label><Input value={profile?.email ?? ""} disabled /></div>
            <Button variant="outline" onClick={exportData}><Download className="size-4 mr-1.5" /> Export my data (JSON)</Button>
            <div className="border-t border-border pt-4">
              <Button variant="outline" onClick={signOut} className="text-destructive border-destructive/30 hover:bg-destructive/10">Sign out</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
