import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { askAI } from "@/lib/ai.functions";
import { PageShell, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Layers, Sparkles, Trash2, ChevronLeft, RotateCw, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({ meta: [{ title: "Flashcards — StudentHub AI" }] }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const qc = useQueryClient();
  const [openDeck, setOpenDeck] = useState<string | null>(null);
  const [studying, setStudying] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: decks = [] } = useQuery({
    queryKey: ["decks"],
    queryFn: async () => (await supabase.from("flashcard_decks").select("*, flashcards(id,next_review)").order("created_at", { ascending: false })).data ?? [],
  });

  if (studying) return <StudyMode deckId={studying} onExit={() => setStudying(null)} />;
  if (openDeck) return <DeckEditor deckId={openDeck} onBack={() => setOpenDeck(null)} onStudy={() => setStudying(openDeck)} />;

  return (
    <PageShell title="Flashcards" description="Spaced-repetition decks to lock in knowledge."
      actions={
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gradient-brand text-white border-0"><Plus className="size-4 mr-1.5" /> New deck</Button></DialogTrigger>
          <NewDeckDialog onDone={(id) => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ["decks"] }); if (id) setOpenDeck(id); }} />
        </Dialog>
      }
    >
      {decks.length === 0 ? (
        <EmptyState icon={Layers} title="No decks yet" description="Create a deck and add cards — or let AI generate them for you." action={<Button onClick={() => setCreateOpen(true)} className="gradient-brand text-white"><Plus className="size-4 mr-1.5" /> New deck</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((d: any) => {
            const due = (d.flashcards ?? []).filter((c: any) => new Date(c.next_review) <= new Date()).length;
            return (
              <button key={d.id} onClick={() => setOpenDeck(d.id)} className="glass-card rounded-2xl p-5 text-left hover:border-brand/40 transition-all group">
                <div className="size-10 rounded-xl gradient-brand grid place-items-center text-white mb-3 group-hover:scale-110 transition-transform"><Layers className="size-5" /></div>
                <h3 className="font-semibold truncate">{d.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">{d.description || "No description"}</p>
                <div className="flex items-center justify-between mt-4 text-xs">
                  <span className="text-muted-foreground">{(d.flashcards ?? []).length} cards</span>
                  {due > 0 && <span className="text-brand font-semibold">{due} due</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function NewDeckDialog({ onDone }: { onDone: (id?: string) => void }) {
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !name) return;
    const { data, error } = await supabase.from("flashcard_decks").insert({ user_id: user.id, name, description: desc || null }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Deck created"); onDone(data.id);
  };
  return (
    <DialogContent className="glass-card border-border">
      <DialogHeader><DialogTitle>New deck</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <Input placeholder="Deck name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Textarea placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
        <DialogFooter><Button type="submit" className="gradient-brand text-white">Create</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function DeckEditor({ deckId, onBack, onStudy }: { deckId: string; onBack: () => void; onStudy: () => void }) {
  const qc = useQueryClient();
  const [front, setFront] = useState(""); const [back, setBack] = useState("");
  const [aiTopic, setAiTopic] = useState(""); const [aiBusy, setAiBusy] = useState(false);

  const { data: deck } = useQuery({ queryKey: ["deck", deckId], queryFn: async () => (await supabase.from("flashcard_decks").select("*").eq("id", deckId).single()).data });
  const { data: cards = [] } = useQuery({ queryKey: ["cards", deckId], queryFn: async () => (await supabase.from("flashcards").select("*").eq("deck_id", deckId).order("created_at")).data ?? [] });

  const addCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !front || !back) return;
    await supabase.from("flashcards").insert({ user_id: user.id, deck_id: deckId, front, back });
    setFront(""); setBack("");
    qc.invalidateQueries({ queryKey: ["cards", deckId] });
  };

  const generateAI = async () => {
    if (!aiTopic) return;
    setAiBusy(true);
    try {
      const res = await askAI({ data: { messages: [{ role: "user", content: `Generate 8 study flashcards on the topic "${aiTopic}". Return ONLY a JSON array like [{"front":"...","back":"..."}]. No prose, no markdown fences.` }] } });
      const match = res.content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("AI did not return cards");
      const parsed = JSON.parse(match[0]) as { front: string; back: string }[];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const rows = parsed.map((c) => ({ user_id: user.id, deck_id: deckId, front: c.front, back: c.back }));
      await supabase.from("flashcards").insert(rows);
      qc.invalidateQueries({ queryKey: ["cards", deckId] });
      toast.success(`Generated ${rows.length} cards`); setAiTopic("");
    } catch (e: any) { toast.error(e.message); } finally { setAiBusy(false); }
  };

  const del = async (id: string) => { await supabase.from("flashcards").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["cards", deckId] }); };

  return (
    <PageShell title={deck?.name ?? "Deck"} description={`${cards.length} cards`}
      actions={<div className="flex gap-2"><Button variant="outline" onClick={onBack}><ChevronLeft className="size-4 mr-1" /> Back</Button><Button onClick={onStudy} disabled={cards.length === 0} className="gradient-brand text-white">Study now</Button></div>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <form onSubmit={addCard} className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Plus className="size-4 text-brand" /> Add card</h3>
          <Textarea placeholder="Front (question)" value={front} onChange={(e) => setFront(e.target.value)} rows={2} required />
          <Textarea placeholder="Back (answer)" value={back} onChange={(e) => setBack(e.target.value)} rows={2} required />
          <Button type="submit" className="w-full">Add card</Button>
        </form>
        <div className="glass-card rounded-2xl p-5 space-y-3" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--color-brand) 12%, transparent), color-mix(in oklab, var(--color-brand-2) 12%, transparent))" }}>
          <h3 className="font-semibold text-sm flex items-center gap-2"><Sparkles className="size-4 text-brand" /> Generate with AI</h3>
          <Input placeholder="Topic (e.g., Newton's laws of motion)" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} />
          <Button onClick={generateAI} disabled={aiBusy || !aiTopic} className="w-full gradient-brand text-white">{aiBusy ? "Generating…" : "Generate 8 cards"}</Button>
        </div>
      </div>

      <ul className="space-y-2">
        {cards.map((c: any) => (
          <li key={c.id} className="glass-card rounded-xl p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-start">
            <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Front</div><div className="text-sm">{c.front}</div></div>
            <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Back</div><div className="text-sm">{c.back}</div></div>
            <button onClick={() => del(c.id)} className="p-2 rounded-md hover:bg-destructive/15 hover:text-destructive text-muted-foreground self-center"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

function StudyMode({ deckId, onExit }: { deckId: string; onExit: () => void }) {
  const qc = useQueryClient();
  const { data: cards = [] } = useQuery({
    queryKey: ["study-cards", deckId],
    queryFn: async () => {
      const { data } = await supabase.from("flashcards").select("*").eq("deck_id", deckId).order("next_review");
      return data ?? [];
    },
  });
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  const card = cards[idx];

  const grade = async (correct: boolean) => {
    if (!card) return;
    const ease = Math.max(1.3, (card.ease ?? 2.5) + (correct ? 0.15 : -0.2));
    const interval = correct ? Math.max(1, Math.round((card.interval_days || 1) * ease)) : 1;
    const next = new Date(); next.setDate(next.getDate() + interval);
    await supabase.from("flashcards").update({ ease, interval_days: interval, next_review: next.toISOString() }).eq("id", card.id);
    setFlipped(false);
    setDone(done + 1);
    if (idx + 1 >= cards.length) {
      qc.invalidateQueries({ queryKey: ["decks"] });
      toast.success("Session complete!");
      onExit();
    } else setIdx(idx + 1);
  };

  if (cards.length === 0) {
    return <PageShell title="Study" actions={<Button variant="outline" onClick={onExit}><ChevronLeft className="size-4 mr-1" /> Back</Button>}><EmptyState icon={Layers} title="No cards" description="Add some cards to start studying." /></PageShell>;
  }

  return (
    <PageShell title="Study session" description={`Card ${idx + 1} of ${cards.length} · ${done} reviewed`}
      actions={<Button variant="outline" onClick={onExit}><ChevronLeft className="size-4 mr-1" /> Exit</Button>}
    >
      <div className="max-w-2xl mx-auto">
        <div onClick={() => setFlipped(!flipped)} className="glass-card rounded-2xl p-10 min-h-[300px] grid place-items-center text-center cursor-pointer select-none hover:border-brand/40 transition-all">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{flipped ? "Answer" : "Question"}</div>
            <div className="text-2xl font-medium leading-relaxed">{flipped ? card.back : card.front}</div>
            <div className="text-xs text-muted-foreground mt-6">{flipped ? "How did you do?" : "Tap to reveal"}</div>
          </div>
        </div>
        {flipped && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button onClick={() => grade(false)} variant="outline" size="lg" className="border-destructive/40 text-destructive hover:bg-destructive/10"><X className="size-4 mr-2" /> Again</Button>
            <Button onClick={() => grade(true)} size="lg" className="gradient-brand text-white border-0"><Check className="size-4 mr-2" /> Got it</Button>
          </div>
        )}
        {!flipped && (
          <Button onClick={() => setFlipped(true)} variant="outline" className="w-full mt-4"><RotateCw className="size-4 mr-2" /> Reveal answer</Button>
        )}
      </div>
    </PageShell>
  );
}
