import { Building2, FileText, Handshake, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { COMPANY } from "@/lib/company";
import { CITY_TARIFFS } from "@/lib/tariff";

/**
 * Kurumsal müşterilere yönelik tanıtım sayfası.
 *
 * Metinler bilerek taahhüt içermeyecek biçimde yazılmıştır: koşullar
 * görüşmeye bağlı olarak belirlenir. Sunulmayan bir ürünü (ör. entegrasyon
 * API'si) vaat etmek hem yanıltıcı reklam hem de iyzico incelemesi açısından
 * risklidir.
 */
const OFFERS = [
  {
    icon: Users,
    title: "Filo Çözümleri",
    description:
      "Filonuzdaki araçlar için çekici ve yol yardımı taleplerini tek bir muhatapla yürütün.",
  },
  {
    icon: FileText,
    title: "Toplu Faturalandırma",
    description:
      "Talep başına ödeme yerine dönemsel faturalandırma, anlaşma koşullarına göre düzenlenebilir.",
  },
  {
    icon: Handshake,
    title: "Anlaşmalı Tarife",
    description:
      "Düzenli ve yüksek hacimli talepler için özel tarife koşulları görüşülerek belirlenir.",
  },
  {
    icon: Building2,
    title: "Öncelikli Karşılama",
    description: "Kurumsal anlaşmalı müşterilerimizin talepleri öncelikli olarak karşılanır.",
  },
];

export default function KurumsalPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <section className="relative isolate overflow-hidden bg-zinc-950 px-4 py-24 text-center text-white">
        <img
          src="/img/yol-yardim.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-zinc-950/85"
        />
        <h1 className="mx-auto max-w-2xl text-3xl font-extrabold sm:text-4xl">
          Şirketiniz için çekici mi arıyorsunuz?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400">
          Filo, sigorta ve araç kiralama şirketleri için {CITY_TARIFFS.length} şehirde çekici ve
          yol yardımı hizmeti sunuyoruz. Koşullar, ihtiyacınıza göre görüşülerek belirlenir.
        </p>
        <Link
          to="/iletisim"
          className="mt-8 inline-flex rounded-2xl bg-white px-6 py-3 font-semibold text-zinc-950 hover:bg-zinc-200"
        >
          Kurumsal Teklif Alın
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          {OFFERS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-zinc-900">{title}</p>
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 text-center">
        <h2 className="text-xl font-bold text-zinc-900">Görüşelim</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Kurumsal çalışma koşullarımız için {COMPANY.phone} numarasından veya {COMPANY.email}{" "}
          adresinden bize ulaşabilirsiniz.
        </p>
        <a
          href={`tel:${COMPANY.phoneHref}`}
          className="mt-6 inline-flex rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          {COMPANY.phone}
        </a>
      </section>

      <Footer />
    </div>
  );
}
