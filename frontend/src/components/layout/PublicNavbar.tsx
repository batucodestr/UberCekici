import { Menu, Phone, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { COMPANY } from "@/lib/company";

const NAV_LINKS = [
  { to: "/", label: "Ana Sayfa" },
  { to: "/hizmetlerimiz", label: "Hizmetler ve Fiyatlar" },
  { to: "/kurumsal-cozumler", label: "Kurumsal Çözümler" },
  { to: "/sss", label: "S.S.S." },
  { to: "/iletisim", label: "İletişim" },
];

/**
 * Sitenin halka açık üst menüsü. Ziyaretçi için ana eylem telefonla aramaktır;
 * talep oluşturma ve canlı takip mobil uygulamada yürütülür, bu yüzden burada
 * müşteriye "giriş yap" dedirten bir aksiyon yok. Yönetici girişi ayrı durur.
 */
export function PublicNavbar({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header
      className={`sticky top-0 z-20 border-b px-4 backdrop-blur sm:px-6 ${
        dark
          ? "border-white/10 bg-zinc-950/90 text-white"
          : "border-zinc-100 bg-white/90 text-zinc-900"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo.jpeg"
            alt={COMPANY.brandName}
            className="h-9 w-9 rounded-xl object-cover"
          />
          <span className="font-bold">{COMPANY.brandName}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={
                dark ? "text-zinc-300 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => navigate("/giris")}
            className={
              dark
                ? "rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
                : "rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
            }
          >
            Yönetici Girişi
          </button>
          <a
            href={`tel:${COMPANY.phoneHref}`}
            className={
              dark
                ? "inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
                : "inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            }
          >
            <Phone className="h-4 w-4" />
            {COMPANY.phone}
          </a>
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menü">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav
          className={`space-y-1 border-t px-1 pb-4 pt-2 md:hidden ${
            dark ? "border-white/10" : "border-zinc-100"
          }`}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`block rounded-xl px-3 py-2 text-sm font-medium ${
                dark ? "text-zinc-200 hover:bg-white/10" : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={`tel:${COMPANY.phoneHref}`}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ${
              dark ? "bg-white text-zinc-950" : "bg-zinc-950 text-white"
            }`}
          >
            <Phone className="h-4 w-4" />
            {COMPANY.phone}
          </a>
          <Link
            to="/giris"
            onClick={() => setOpen(false)}
            className={`block rounded-xl px-3 py-2 text-center text-sm font-medium ${
              dark ? "text-zinc-400 hover:bg-white/10" : "text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            Yönetici Girişi
          </Link>
        </nav>
      )}
    </header>
  );
}
