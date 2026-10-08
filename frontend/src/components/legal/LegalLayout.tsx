import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicNavbar />

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
