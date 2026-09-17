"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { useAskAssistant } from "@/hooks/use-assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <h1 className="mb-4 text-2xl font-semibold text-foreground">Asistente financiero</h1>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-surface p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">
              Pregúntame sobre tus finanzas de este mes.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
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
              className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {ask.isPending && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground">
              Pensando…
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
        <Button type="submit" disabled={ask.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
