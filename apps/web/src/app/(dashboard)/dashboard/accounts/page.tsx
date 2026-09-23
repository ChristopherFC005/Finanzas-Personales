"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Account, useAccounts } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountCard } from "@/components/finance/account-card";
import { AccountForm } from "@/components/finance/account-form";
import { formatMoney } from "@/lib/utils";

export default function AccountsPage() {
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";
  const { data: accounts, isLoading } = useAccounts();

  const total = accounts?.reduce((sum, a) => sum + a.currentBalance, 0) ?? 0;

  function openCreate() {
    setEditingAccount(null);
    setOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cuentas y tarjetas</h1>
          <p className="text-sm text-muted-foreground">
            Saldo total: <span className="gradient-text font-semibold">{formatMoney(total, currency)}</span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva cuenta
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Aún no tienes cuentas registradas"
          description="Agrega tu efectivo, tarjeta de débito o crédito con el saldo con el que empiezas."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Agregar mi primera cuenta
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} currency={currency} onEdit={() => openEdit(a)} />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingAccount ? "Editar cuenta" : "Nueva cuenta"}
      >
        <AccountForm account={editingAccount ?? undefined} onSuccess={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
