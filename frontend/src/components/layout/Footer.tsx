import { Link } from "react-router-dom";

const LEGAL_LINKS = [
  { to: "/kvkk", label: "KVKK Aydınlatma Metni" },
  { to: "/gizlilik-sozlesmesi", label: "Gizlilik Sözleşmesi" },
  { to: "/kullanim-sartlari", label: "Kullanım Şartları" },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Uber Çekici" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-semibold text-zinc-800">Uber Çekici</span>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
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
      <div className="mx-auto mt-6 max-w-3xl border-t border-zinc-100 pt-5 text-center text-xs text-zinc-400 sm:text-left">
        © {new Date().getFullYear()} Uber Çekici. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
