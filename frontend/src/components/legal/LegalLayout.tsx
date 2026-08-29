import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Footer } from "@/components/layout/Footer";

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-zinc-100 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <img src="/logo.png" alt="Uber Çekici" className="h-8 w-8 rounded-lg object-cover" />
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Ana Sayfa
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-3xl font-extrabold text-zinc-900">{title}</h1>
          <div className="prose-legal space-y-6 text-sm leading-relaxed text-zinc-600">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
