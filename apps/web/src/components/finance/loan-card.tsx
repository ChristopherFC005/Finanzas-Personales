"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Trash2, User } from "lucide-react";
import { Loan, useDeleteLoan, useRegisterLoanPayment } from "@/hooks/use-loans";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export function LoanCard({ loan, currency }: { loan: Loan; currency: string }) {
  const [amount, setAmount] = useState("");
  const registerPayment = useRegisterLoanPayment();
  const deleteLoan = useDeleteLoan();

  const percent = Math.min(
    100,
    Math.round((loan.amountReceived / Number(loan.totalAmount)) * 100),
  );

  function handleRegister() {
    if (!amount) return;
    registerPayment.mutate(
      { id: loan.id, amount },
      { onSuccess: () => setAmount("") },
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full gradient-brand text-white">
            <User className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">{loan.borrowerName}</p>
            <p className="text-xs text-muted-foreground">
              {loan.paymentType === "SINGLE" ? "Pago único" : `${loan.installmentsCount} cuotas`}
              {loan.account && ` · desde ${loan.account.name}`}
            </p>
          </div>
        </div>
        {loan.status === "ACTIVE" && (
          <button
            onClick={() => deleteLoan.mutate(loan.id)}
            className="text-muted-foreground hover:text-danger"
            aria-label="Eliminar préstamo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-foreground">
            {formatMoney(loan.amountReceived, currency)}
          </span>
          <span className="text-muted-foreground">
            de {formatMoney(loan.totalAmount, currency)}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-all",
              loan.status === "PAID" && "bg-success",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {loan.status === "PAID" ? (
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Pagado en su totalidad
          </span>
        ) : loan.nextDueDate ? (
          <span
            className={cn(
              "flex items-center gap-1",
              loan.isOverdue ? "text-danger" : "text-muted-foreground",
            )}
          >
            {loan.isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
            {loan.isOverdue ? "Venció el " : "Vence el "}
            {formatDate(loan.nextDueDate)}
          </span>
        ) : (
          <span />
        )}
      </div>

      {loan.status === "ACTIVE" && (
        <div className="mt-3 flex gap-2">
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button size="sm" onClick={handleRegister} disabled={registerPayment.isPending}>
            Registrar pago
          </Button>
        </div>
      )}

      {registerPayment.isError && (
        <p className="mt-2 text-xs text-danger">No se pudo registrar el pago.</p>
      )}
    </Card>
  );
}
