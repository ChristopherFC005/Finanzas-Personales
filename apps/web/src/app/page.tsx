import Link from "next/link";
import { ShieldCheck, PiggyBank, LineChart, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: LineChart,
    title: "Control total",
    description: "Registra ingresos y gastos en segundos y visualiza tu situación financiera al instante.",
  },
  {
    icon: PiggyBank,
    title: "Presupuestos inteligentes",
    description: "Define límites por categoría y recibe alertas antes de excederlos.",
  },
  {
    icon: Target,
    title: "Metas de ahorro",
    description: "Crea metas, aporta y retira, y sigue tu progreso con historial completo.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad primero",
    description: "Tus datos están protegidos con autenticación segura y aislamiento total entre usuarios.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-xl font-bold text-primary">FinanZen</span>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#inicio">Inicio</a>
            <a href="#caracteristicas">Características</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#seguridad">Seguridad</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-foreground">
              Iniciar sesión
            </Link>
            <Link href="/register">
              <Button size="sm">Crear cuenta</Button>
            </Link>
          </div>
        </div>
      </header>

      <section id="inicio" className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Toma el control de tu futuro financiero
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Organiza tus ingresos, controla tus gastos, ahorra y alcanza tus
          metas, todo en un solo lugar.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg">Comenzar gratis</Button>
          </Link>
          <a href="#caracteristicas">
            <Button size="lg" variant="outline">
              Conocer más
            </Button>
          </a>
        </div>
      </section>

      <section id="caracteristicas" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <feature.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-foreground">Cómo funciona</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Crea tu cuenta, personaliza tu experiencia y empieza a registrar tus
          movimientos. FinanZen calcula por ti presupuestos, ahorro y
          estadísticas en tiempo real.
        </p>
      </section>

      <section id="seguridad" className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-foreground">Seguridad</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Autenticación con Supabase Auth, aislamiento de datos por usuario
          mediante Row Level Security y verificación de identidad en cada
          operación sensible del backend.
        </p>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} FinanZen. Todos los derechos reservados.
      </footer>
    </div>
  );
}
