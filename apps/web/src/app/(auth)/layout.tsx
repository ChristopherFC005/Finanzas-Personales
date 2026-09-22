import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full gradient-brand opacity-20 blur-[100px]"
      />
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand text-white shadow-glow">
            <Zap className="h-4 w-4" fill="currentColor" />
          </span>
          <span className="font-display text-2xl font-bold gradient-text">FinanZen</span>
        </Link>
        <div className="glass-surface animate-fade-up rounded-2xl p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
