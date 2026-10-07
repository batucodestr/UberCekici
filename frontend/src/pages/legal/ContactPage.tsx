import { Mail, MapPin, Phone } from "lucide-react";

import { CompanyFacts } from "@/components/legal/CompanyFacts";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/lib/company";

/**
 * iyzico üye işyeri başvurusunun istediği "İletişim" sayfası: açık adres,
 * telefon ve e-posta girişsiz erişilebilir olmalı.
 */
export default function ContactPage() {
  return (
    <LegalLayout title="İletişim">
      <section className="space-y-3">
        <p>
          {COMPANY.brandName} ile ilgili her türlü soru, talep, şikayet ve iade başvurunuz için
          aşağıdaki kanallardan bize ulaşabilirsiniz. Başvurularınız en geç 3 iş günü içinde
          yanıtlanır.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
          <Phone className="mb-2 h-5 w-5 text-primary-600" />
          <p className="text-xs font-semibold text-zinc-500">Telefon</p>
          <a
            href={`tel:${COMPANY.phoneHref}`}
            className="mt-0.5 block font-semibold text-zinc-800 hover:text-primary-600"
          >
            {COMPANY.phone}
          </a>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
          <Mail className="mb-2 h-5 w-5 text-primary-600" />
          <p className="text-xs font-semibold text-zinc-500">E-posta</p>
          <a
            href={`mailto:${COMPANY.email}`}
            className="mt-0.5 block break-words font-semibold text-zinc-800 hover:text-primary-600"
          >
            {COMPANY.email}
          </a>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
          <MapPin className="mb-2 h-5 w-5 text-primary-600" />
          <p className="text-xs font-semibold text-zinc-500">Adres</p>
          <p className="mt-0.5 font-semibold text-zinc-800">{COMPANY.address}</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Çalışma Saatleri</h2>
        <p>
          Çekici ve yol yardımı hizmetimiz 7 gün 24 saat açıktır. İade, fatura ve sözleşme
          konularındaki yazılı başvurular hafta içi 09:00–18:00 arasında işleme alınır.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Resmi Bilgilerimiz</h2>
        <CompanyFacts />
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Uyuşmazlık Çözümü</h2>
        <p>
          Şikayetinizin çözüme ulaşmaması halinde, Ticaret Bakanlığı'nca her yıl ilan edilen
          parasal sınırlar dahilinde, hizmetin satın alındığı veya yerleşim yerinizin
          bulunduğu yerdeki Tüketici Hakem Heyetlerine ya da Tüketici Mahkemelerine
          başvurabilirsiniz.
        </p>
      </section>
    </LegalLayout>
  );
}
