import { Link } from "react-router-dom";

const LINK_GROUPS = [
  {
    title: "Şirket",
    links: [
      { to: "/hizmetlerimiz", label: "Hizmetlerimiz" },
      { to: "/kurumsal-cozumler", label: "Kurumsal Çözümler" },
      { to: "/sss", label: "Sıkça Sorulan Sorular" },
      { to: "/destek", label: "İletişim / Destek" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { to: "/kvkk", label: "KVKK Aydınlatma Metni" },
      { to: "/gizlilik-sozlesmesi", label: "Gizlilik Sözleşmesi" },
      { to: "/kullanim-sartlari", label: "Kullanım Şartları" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Uber Çekici" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-semibold text-zinc-800">Uber Çekici</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-zinc-500">
            Anlık fiyat, canlı takip ve güvenilir sürücülerle 7/24 çekici ve yol yardım hizmeti.
          </p>
        </div>
        {LINK_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {group.title}
            </p>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
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
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-zinc-100 pt-6 text-center text-xs text-zinc-400 sm:text-left">
        © {new Date().getFullYear()} Uber Çekici. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
