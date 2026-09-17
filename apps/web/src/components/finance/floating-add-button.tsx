"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { TransactionForm } from "./transaction-form";

export function FloatingAddButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="focus-ring fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Registrar movimiento"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar movimiento">
        <TransactionForm onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
