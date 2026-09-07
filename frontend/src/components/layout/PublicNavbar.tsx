import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Ana Sayfa" },
  { to: "/hizmetlerimiz", label: "Hizmetlerimiz" },
  { to: "/kurumsal-cozumler", label: "Kurumsal Çözümler" },
  { to: "/destek", label: "İletişim" },
];

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
          <img src="/logo.png" alt="Uber Çekici" className="h-9 w-9 rounded-xl object-cover" />
          <span className="font-bold">Uber Çekici</span>
          <span
            className={`hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${
              dark ? "bg-white/10 text-primary-300" : "bg-primary-50 text-primary-600"
            }`}
          >
            Yakında Sizlerle
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={dark ? "text-zinc-300 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}
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
            Giriş Yap
          </button>
          <button
            onClick={() => navigate("/giris")}
            className={
              dark
                ? "rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
                : "rounded-2xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            }
          >
            Anında Fiyat Al
          </button>
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)}>
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
          <button
            onClick={() => navigate("/giris")}
            className={`btn-primary mt-2 w-full ${dark ? "!bg-white !text-zinc-950" : ""}`}
          >
            Giriş Yap / Kayıt Ol
          </button>
        </nav>
      )}
    </header>
  );
}
