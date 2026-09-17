import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <span className="text-2xl font-bold text-primary">FinanZen</span>
        </Link>
        <div className="rounded-xl border border-border bg-surface p-8 shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
}
