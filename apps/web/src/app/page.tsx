import Link from "next/link";
import {
  ShieldCheck,
  LineChart,
  Target,
  Sparkles,
  ArrowRight,
  Lock,
  Zap,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: LineChart,
    title: "Control total en tiempo real",
    description:
      "Registra ingresos y gastos en segundos y visualiza tu situación financiera al instante, con gráficos que se adaptan a ti.",
  },
  {
    icon: Wallet,
    title: "Cuentas y tarjetas",
    description:
      "Controla efectivo, débito, ahorros y tarjetas de crédito con colores personalizados en un solo lugar.",
  },
  {
    icon: Target,
    title: "Metas de ahorro",
    description:
      "Crea metas, aporta y retira, y sigue tu progreso con historial completo de cada movimiento.",
  },
  {
    icon: Sparkles,
    title: "Asistente financiero IA",
    description:
      "Pregúntale en lenguaje natural cómo vas este mes. Analiza tus datos y responde al instante.",
    accent: true,
  },
];

const STEPS = [
  { n: "01", title: "Crea tu cuenta", desc: "Regístrate gratis en menos de un minuto." },
  { n: "02", title: "Personaliza", desc: "Elige moneda, tema y color de tu FinanZen." },
  { n: "03", title: "Toma el control", desc: "Registra movimientos y deja que los números trabajen para ti." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="glass-surface sticky top-0 z-40 border-l-0 border-r-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand text-white shadow-glow">
              <Zap className="h-4 w-4" fill="currentColor" />
            </span>
            <span className="font-display text-xl font-bold gradient-text">FinanZen</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#inicio" className="transition-colors hover:text-foreground">Inicio</a>
            <a href="#caracteristicas" className="transition-colors hover:text-foreground">Características</a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">Cómo funciona</a>
            <a href="#seguridad" className="transition-colors hover:text-foreground">Seguridad</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-foreground sm:block">
              Iniciar sesión
            </Link>
            <Link href="/register">
              <Button size="sm" variant="gradient">Crear cuenta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="inicio" className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 grid-pattern opacity-40"
        />
        <div
          aria-hidden
          className="animate-blob pointer-events-none absolute -top-32 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full gradient-brand opacity-20 blur-[100px]"
        />

        <div className="mx-auto max-w-4xl px-4 py-28 text-center">
          <div className="animate-fade-up mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Ahora con asistente financiero impulsado por IA
          </div>
          <h1 className="animate-fade-up font-display text-4xl font-bold tracking-tight text-foreground [animation-delay:80ms] md:text-6xl">
            Toma el control de{" "}
            <span className="gradient-text">tu futuro financiero</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-muted-foreground [animation-delay:160ms]">
            Organiza tus ingresos, controla tus gastos, ahorra y alcanza tus
            metas, todo en un solo lugar.
          </p>
          <div className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-4 [animation-delay:240ms] sm:flex-row">
            <Link href="/register">
              <Button size="lg" variant="gradient" className="group">
                Comenzar gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <a href="#caracteristicas">
              <Button size="lg" variant="outline">Conocer más</Button>
            </a>
          </div>
        </div>

        {/* Mock dashboard preview */}
        <div className="animate-fade-up mx-auto max-w-4xl px-4 pb-24 [animation-delay:320ms]">
          <Card className="mx-auto grid max-w-3xl gap-4 p-6 sm:grid-cols-3">
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs text-muted-foreground">Saldo disponible</p>
              <p className="mt-1 font-display text-xl font-semibold gradient-text">S/ 4,280.50</p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs text-muted-foreground">Ahorro del mes</p>
              <p className="mt-1 font-display text-xl font-semibold text-success">+S/ 620.00</p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs text-muted-foreground">Tasa de ahorro</p>
              <p className="mt-1 font-display text-xl font-semibold text-accent">24%</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section id="caracteristicas" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">
            Todo lo que necesitas para tus finanzas
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Herramientas simples y potentes, pensadas para que entiendas tu
            dinero en segundos.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="group">
              <div
                className={
                  feature.accent
                    ? "flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent"
                    : "flex h-11 w-11 items-center justify-center rounded-xl gradient-brand text-white shadow-glow"
                }
              >
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="relative overflow-hidden py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground">Cómo funciona</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Tres pasos y ya estás viendo tu dinero con claridad.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="relative">
                <span className="font-display text-5xl font-bold text-border">{step.n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="seguridad" className="mx-auto max-w-6xl px-4 py-20">
        <Card className="overflow-hidden p-8 md:p-12">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                <Lock className="h-3.5 w-3.5" />
                Seguridad de nivel producción
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold text-foreground">
                Tus datos, aislados y protegidos
              </h2>
              <p className="mt-4 text-muted-foreground">
                Autenticación con Supabase Auth, Row Level Security en cada
                tabla y verificación de identidad en cada operación del
                backend. Ningún usuario puede ver ni tocar los datos de otro,
                ni siquiera manipulando la petición.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: ShieldCheck, label: "Row Level Security" },
                { icon: Lock, label: "Tokens verificados" },
                { icon: Wallet, label: "Precisión decimal exacta" },
                { icon: Zap, label: "Aislamiento por usuario" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl bg-muted p-4"
                >
                  <item.icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-24 text-center">
        <h2 className="font-display text-3xl font-bold text-foreground">
          Empieza a organizar tu dinero hoy
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Gratis, sin tarjeta de crédito. Toma menos de un minuto.
        </p>
        <Link href="/register" className="mt-8 inline-block">
          <Button size="lg" variant="gradient" className="group">
            Comenzar gratis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} FinanZen. Todos los derechos reservados.
      </footer>
    </div>
  );
}
