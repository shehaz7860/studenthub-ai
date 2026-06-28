import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() })),
});

const SYSTEM = `You are StudentHub AI, a friendly and brilliant study assistant for high school and college students.

Help students with:
- Explaining difficult concepts simply, with examples
- Step-by-step math solutions (show every step)
- Summarizing notes and lectures
- Generating practice questions and quizzes
- Improving essays (give specific, actionable feedback)
- Creating revision plans
- Answering homework questions (teach, don't just give the answer)

Use clear markdown formatting: headings, bullet lists, code blocks, bold for emphasis. Be encouraging and concise.`;

export const askAI = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Body.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM }, ...data.messages],
      }),
    });

    if (res.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your workspace billing.");
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);

    const json = await res.json();
    return { content: (json.choices?.[0]?.message?.content as string) ?? "" };
  });