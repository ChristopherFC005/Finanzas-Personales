"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUpdateCurrency, useUpdateProfile } from "@/hooks/use-update-profile";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/theme/color-picker";
import { ThemeModeSelector } from "@/components/theme/theme-mode-selector";

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  phone: string;
}

export default function ProfilePage() {
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const updateCurrency = useUpdateCurrency();
  const { register, handleSubmit, reset, formState: { isSubmitting } } =
    useForm<ProfileFormValues>();

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? "",
      });
    }
  }, [user, reset]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Información personal</CardTitle>
        </CardHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => updateProfile.mutate(values))}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">Nombres</Label>
              <Input id="firstName" {...register("firstName")} />
            </div>
            <div>
              <Label htmlFor="lastName">Apellidos</Label>
              <Input id="lastName" {...register("lastName")} />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Celular</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            Guardar cambios
          </Button>
          {updateProfile.isSuccess && (
            <p className="text-sm text-success">Perfil actualizado.</p>
          )}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moneda</CardTitle>
        </CardHeader>
        <Select
          defaultValue={user?.preferences?.currency ?? "PEN"}
          onChange={(e) => updateCurrency.mutate(e.target.value)}
          className="max-w-xs"
        >
          <option value="PEN">Sol peruano (S/)</option>
          <option value="USD">Dólar estadounidense ($)</option>
          <option value="EUR">Euro (€)</option>
        </Select>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
        </CardHeader>
        <div className="space-y-6">
          <ThemeModeSelector />
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Color principal</p>
            <ColorPicker />
          </div>
        </div>
      </Card>
    </div>
  );
}
