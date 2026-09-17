"use client";

import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
      <AlertOctagon className="h-12 w-12 text-danger" />
      <h1 className="text-2xl font-semibold text-foreground">Algo salió mal</h1>
      <p className="text-muted-foreground">
        Ocurrió un error inesperado. Puedes intentarlo nuevamente.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
