import type { ReactNode } from "react";

export function PageShell({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 animate-fade-in-up">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-10 text-center">
      <div className="size-14 rounded-2xl gradient-brand grid place-items-center mx-auto mb-4 text-white shadow-[var(--shadow-glow)]">
        <Icon className="size-6" />
      </div>
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">{description}</p>
      {action}
    </div>
  );
}