import { Building2, FileText, Plug, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";

const OFFERS = [
  {
    icon: Users,
    title: "Filo Yönetimi",
    description:
      "Filonuzdaki tüm araçlar için çekici ve yol yardımı taleplerini tek bir kurumsal hesaptan yönetin.",
  },
  {
    icon: FileText,
    title: "Aylık Cari Hesap",
    description: "Talep başına ödeme yerine, tüm hizmetleriniz aylık tek faturada toplansın.",
  },
  {
    icon: Plug,
    title: "Yol Yardım & Çekici API",
    description:
      "Kendi sisteminizden doğrudan talep oluşturun; sigorta, filo veya kiralama platformunuza entegre edin.",
  },
  {
    icon: Building2,
    title: "Öncelikli Operatör Ağı",
    description: "Kurumsal talepleriniz, geniş operatör ağımızda öncelikli olarak eşleştirilir.",
  },
];

export default function KurumsalPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <section className="bg-zinc-950 px-4 py-20 text-center text-white">
        <h1 className="mx-auto max-w-2xl text-3xl font-extrabold sm:text-4xl">
          Şirketiniz için çekici mi arıyorsunuz?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400">
          Taleplerinizi tek panelden açın, aylık cari hesaba yazdırın. Filo, sigorta ve kiralama
          şirketleri için kurumsal çözümler sunuyoruz.
        </p>
        <button
          onClick={() => navigate("/destek")}
          className="mt-8 rounded-2xl bg-white px-6 py-3 font-semibold text-zinc-950 hover:bg-zinc-200"
        >
          Kurumsal Teklif Alın
        </button>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          {OFFERS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-zinc-900">{title}</h3>
              <p className="mt-1.5 text-sm text-zinc-500">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-zinc-50 p-8 text-center">
          <h2 className="text-xl font-bold text-zinc-900">Kimler için uygun?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">
            Filo şirketleri, sigorta şirketleri, oto kiralama platformları ve düzenli çekici/yol
            yardımı ihtiyacı olan tüm kurumsal müşteriler için özel anlaşma koşulları sunuyoruz.
          </p>
          <button
            onClick={() => navigate("/destek")}
            className="btn-primary mt-5"
          >
            Bize Ulaşın
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
