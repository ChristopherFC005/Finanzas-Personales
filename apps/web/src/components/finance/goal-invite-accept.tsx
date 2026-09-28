"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useAcceptGoalInvite, useGoalInvitePreview } from "@/hooks/use-goals";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/utils";

export function GoalInviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";
  const { data: preview, isLoading, isError } = useGoalInvitePreview(token);
  const acceptInvite = useAcceptGoalInvite();

  async function handleAccept() {
    await acceptInvite.mutateAsync(token);
    router.push("/dashboard/goals");
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError || !preview ? (
          <div className="text-center">
            <p className="text-sm text-foreground">
              Esta invitación ya no está disponible.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Puede que ya haya sido usada, o el link esté mal copiado.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-white">
              <Users className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{preview.invitedByName}</span> te
              invitó a colaborar en su meta
            </p>
            <p className="mt-1 font-display text-xl font-bold text-foreground">
              {preview.goalName}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Llevan {formatMoney(preview.currentAmount, currency)} de{" "}
              {formatMoney(preview.targetAmount, currency)}
            </p>

            <Button
              className="mt-6 w-full"
              onClick={handleAccept}
              disabled={acceptInvite.isPending}
            >
              {acceptInvite.isPending ? "Uniéndote…" : "Aceptar y colaborar"}
            </Button>

            {acceptInvite.isError && (
              <p className="mt-2 text-xs text-danger">
                {acceptInvite.error instanceof Error
                  ? acceptInvite.error.message
                  : "No se pudo aceptar la invitación."}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
