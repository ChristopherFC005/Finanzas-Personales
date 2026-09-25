"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { useUpdateCurrency } from "@/hooks/use-update-profile";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/theme/color-picker";
import { ThemeModeSelector } from "@/components/theme/theme-mode-selector";

const OBJECTIVES = [
  "Controlar gastos",
  "Ahorrar",
  "Organizar finanzas",
  "Alcanzar una meta",
];

const CURRENCIES = [
  { value: "PEN", label: "Sol peruano (S/)" },
  { value: "USD", label: "Dólar estadounidense ($)" },
  { value: "EUR", label: "Euro (€)" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState("PEN");
  const [objective, setObjective] = useState<string | null>(null);
  const { primaryColor } = useTheme();
  const updateCurrency = useUpdateCurrency();

  async function finish() {
    await updateCurrency.mutateAsync(currency);
    router.push("/dashboard");
  }

  const steps = [
    {
      title: "Bienvenido a Cyfra",
      content: (
        <p className="text-muted-foreground">
          Vamos a personalizar tu experiencia en unos simples pasos.
        </p>
      ),
    },
    {
      title: "Escoge tu moneda",
      content: (
        <div className="grid grid-cols-1 gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCurrency(c.value)}
              className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                currency === c.value ? "border-primary bg-primary-muted" : "border-border"
              }`}
            >
              {c.label}
              {currency === c.value && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Escoge apariencia",
      content: <ThemeModeSelector />,
    },
    {
      title: "Escoge tu color",
      content: (
        <div>
          <ColorPicker />
          <div
            className="mt-6 rounded-lg p-4 text-sm text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Vista previa de tu color Cyfra
          </div>
        </div>
      ),
    },
    {
      title: "¿Cuál es tu objetivo?",
      content: (
        <div className="grid grid-cols-1 gap-2">
          {OBJECTIVES.map((o) => (
            <button
              key={o}
              onClick={() => setObjective(o)}
              className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                objective === o ? "border-primary bg-primary-muted" : "border-border"
              }`}
            >
              {o}
              {objective === o && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      <h1 className="text-xl font-semibold text-foreground">{steps[step].title}</h1>
      <div className="mt-4">{steps[step].content}</div>

      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Atrás
        </Button>
        {isLast ? (
          <Button onClick={finish}>Ir a mi dashboard</Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)}>Siguiente</Button>
        )}
      </div>
    </div>
  );
}
