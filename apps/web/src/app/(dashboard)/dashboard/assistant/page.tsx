"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { useAskAssistant } from "@/hooks/use-assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "¿Cuánto gasté este mes?",
  "¿En qué categoría gasté más?",
  "¿Cómo voy con mi presupuesto?",
  "Compara este mes con el anterior.",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const ask = useAskAssistant();

  async function send(question: string) {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    try {
      const { answer } = await ask.mutateAsync(question);
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "No pude responder en este momento. Intenta de nuevo." },
      ]);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Asistente financiero
          </h1>
          <p className="text-xs text-muted-foreground">Impulsado por IA · solo ve tus datos</p>
        </div>
      </div>

      <div className="glass-surface flex-1 space-y-3 overflow-y-auto rounded-2xl p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Sparkles className="h-7 w-7" />
            </span>
            <p className="text-sm text-muted-foreground">
              Pregúntame sobre tus finanzas de este mes.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                m.role === "user"
                  ? "gradient-brand text-white"
                  : "border border-border bg-muted text-foreground",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}

        {ask.isPending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
        />
        <Button type="submit" variant="gradient" disabled={ask.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
