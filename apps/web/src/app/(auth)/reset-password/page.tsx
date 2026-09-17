"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Nueva contraseña</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Elige una nueva contraseña para tu cuenta.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            {...register("password")}
            error={errors.password?.message}
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />
        </div>

        {serverError && <p className="text-sm text-danger">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </div>
  );
}
