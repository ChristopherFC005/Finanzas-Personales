"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({ email: z.string().email("Correo inválido.") });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Si el correo existe en FinanZen, te enviamos instrucciones para
          restablecer tu contraseña.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Te enviaremos un enlace para restablecerla.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" {...register("email")} error={errors.email?.message} />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
