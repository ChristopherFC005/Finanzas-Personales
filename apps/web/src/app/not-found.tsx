import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-semibold text-foreground">Página no encontrada</h1>
      <p className="text-muted-foreground">La página que buscas no existe o fue movida.</p>
      <Link href="/">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
