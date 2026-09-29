import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { AuroraBackground } from "@/components/aurora-background";

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
      <AuroraBackground subtle />
      <AppSidebar />
      <main className="flex-1 min-w-0 relative z-10">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
