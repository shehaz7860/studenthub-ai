import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { askAI } from "@/lib/ai.functions";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, User, Loader2, Lightbulb } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — StudentHub AI" }] }),
  component: AIPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Explain photosynthesis like I'm 14",
  "Solve: ∫ x·e^x dx step by step",
  "Quiz me on the French Revolution (5 questions)",
  "Give me a 7-day revision plan for biology finals",
];

function AIPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const res = await askAI({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.content }]);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <PageShell title="AI Study Assistant" description="Your personal tutor — explain, summarize, quiz, and more.">
      <div className="glass-card rounded-2xl flex flex-col h-[calc(100vh-14rem)] min-h-[500px]">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="size-14 rounded-2xl gradient-brand grid place-items-center mx-auto mb-4 text-white shadow-[var(--shadow-glow)]"><Sparkles className="size-6" /></div>
              <h3 className="text-lg font-semibold">How can I help you study today?</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Ask anything — homework, concepts, essays, math, revision plans.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto mt-6">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-left p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 hover:border-brand/30 transition-all text-sm flex items-start gap-2">
                    <Lightbulb className="size-4 text-brand shrink-0 mt-0.5" /> <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`size-8 rounded-lg grid place-items-center shrink-0 ${m.role === "user" ? "bg-secondary" : "gradient-brand text-white"}`}>
                {m.role === "user" ? <User className="size-4" /> : <Sparkles className="size-4" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-brand/15 border border-brand/20" : "bg-secondary/50 border border-border"}`}>
                {m.role === "assistant"
                  ? <div className="prose prose-invert prose-sm max-w-none prose-headings:font-bold prose-a:text-brand prose-code:text-brand-2 prose-pre:bg-background/50"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  : <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <div className="size-8 rounded-lg gradient-brand grid place-items-center text-white"><Sparkles className="size-4" /></div>
              <div className="bg-secondary/50 border border-border rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Thinking…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border p-3">
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-end">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask anything…" rows={1} className="resize-none min-h-[44px] max-h-32 bg-transparent" />
            <Button type="submit" disabled={busy || !input.trim()} size="icon" className="size-11 shrink-0 gradient-brand text-white border-0"><Send className="size-4" /></Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">Powered by Gemini · For learning, not for cheating on graded work</p>
        </div>
      </div>
    </PageShell>
  );
}
