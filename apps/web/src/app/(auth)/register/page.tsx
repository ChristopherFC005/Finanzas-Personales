"use client";

import { useState } from "react";
import Link from "next/link";
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
    firstName: z.string().min(1, "Ingresa tus nombres."),
    lastName: z.string().min(1, "Ingresa tus apellidos."),
    email: z.string().email("Correo inválido."),
    phone: z.string().optional(),
    password: z.string().min(8, "Mínimo 8 caracteres."),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Debes aceptar los Términos y Condiciones." }),
    }),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({ message: "Debes aceptar la Política de Privacidad." }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
          phone: values.phone || undefined,
        },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }
    setEmailSent(true);
  }

  if (emailSent) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Te enviamos un enlace de verificación. Confirma tu correo para
          activar tu cuenta y empezar a usar Cyfra.
        </p>
        <Button className="mt-6" onClick={() => router.push("/login")}>
          Ir a iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Crea tu cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Toma el control de tu futuro financiero.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">Nombres</Label>
            <Input id="firstName" {...register("firstName")} error={errors.firstName?.message} />
          </div>
          <div>
            <Label htmlFor="lastName">Apellidos</Label>
            <Input id="lastName" {...register("lastName")} error={errors.lastName?.message} />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" {...register("email")} error={errors.email?.message} />
        </div>

        <div>
          <Label htmlFor="phone">Celular (opcional)</Label>
          <Input id="phone" {...register("phone")} error={errors.phone?.message} />
        </div>

        <div>
          <Label htmlFor="password">Contraseña</Label>
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

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" {...register("acceptTerms")} />
          <span>Acepto los Términos y Condiciones.</span>
        </label>
        {errors.acceptTerms && (
          <p className="text-xs text-danger">{errors.acceptTerms.message}</p>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" {...register("acceptPrivacy")} />
          <span>Acepto la Política de Privacidad.</span>
        </label>
        {errors.acceptPrivacy && (
          <p className="text-xs text-danger">{errors.acceptPrivacy.message}</p>
        )}

        {serverError && <p className="text-sm text-danger">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creando cuenta…" : "Crear mi cuenta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
