import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex relative overflow-hidden">
      <div className="pointer-events-none fixed -top-40 -left-40 size-[600px] rounded-full opacity-20 blur-[140px] gradient-brand" />
      <div className="pointer-events-none fixed top-1/3 -right-40 size-[500px] rounded-full opacity-15 blur-[140px] bg-[oklch(0.7_0.2_320)]" />
      <AppSidebar />
      <main className="flex-1 min-w-0 relative z-10">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}