import { Link } from "react-router-dom";

import { CompanyFacts } from "@/components/legal/CompanyFacts";
import { PaymentBadges } from "@/components/legal/PaymentBadges";
import { COMPANY } from "@/lib/company";
import { LEGAL_LINKS } from "@/lib/legalLinks";

export function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.jpeg" alt={COMPANY.brandName} className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-semibold text-zinc-800">{COMPANY.brandName}</span>
        </div>
        <ul className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
          {LEGAL_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="text-sm text-zinc-600 transition hover:text-primary-600"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* iyzico şartı: ödeme logoları her sayfanın altında görünür olmalı. */}
      <div className="mx-auto mt-6 max-w-3xl border-t border-zinc-100 pt-6">
        <PaymentBadges />
      </div>

      {/* iyzico şartı: resmi belgelerdeki künye bilgileri sitede yayınlanmalı. */}
      <div className="mx-auto mt-6 max-w-3xl border-t border-zinc-100 pt-6">
        <CompanyFacts variant="grid" />
      </div>

      <div className="mx-auto mt-6 max-w-3xl border-t border-zinc-100 pt-5 text-center text-xs text-zinc-400 sm:text-left">
        © {new Date().getFullYear()} {COMPANY.brandName}. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
