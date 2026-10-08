import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/lib/company";
import { CITY_TARIFFS, TARIFF } from "@/lib/tariff";

/**
 * Cevaplar mevcut işleyişi anlatır: talep oluşturma ve canlı takip mobil
 * uygulamada yürütülür, fiyatlandırma sitede yayınlanan tarifeye dayanır.
 */
const FAQS = [
  {
    q: "Çekici talebimi nasıl oluşturabilirim?",
    a: `Talebinizi ${COMPANY.brandName} mobil uygulaması üzerinden oluşturabilir ya da ${COMPANY.phone} numarasından bize doğrudan ulaşabilirsiniz. Uygulamada araç tipinizi ve ihtiyacınız olan hizmeti seçip aracınızın alınacağı ve bırakılacağı noktaları belirtmeniz yeterlidir.`,
  },
  {
    q: "Fiyat nasıl hesaplanıyor?",
    a: `Ücret; talebin oluşturulduğu şehrin açılış ücreti ile kilometre ücretine, araç tipi ve hizmet tipi katsayılarının uygulanmasıyla hesaplanır. ${TARIFF.nightStartHour}:00–0${TARIFF.nightEndHour}:00 arasındaki taleplere gece tarifesi eklenir. Şehir bazlı güncel tarifenin tamamı ve hesaplama formülü "Hizmetler ve Fiyatlandırma" sayfasında yayınlanmaktadır.`,
  },
  {
    q: "Hangi şehirlerde hizmet veriyorsunuz?",
    a: `${CITY_TARIFFS.map((t) => t.city).join(", ")} illerinde hizmet veriyoruz. Her şehrin tarifesi ayrı ayrı yayınlanmaktadır. Bu illerin dışındaki konumlardan gelen talepler "Diğer şehirler" genel tarifesinden ücretlendirilir; ayrıntılı bilgi için ${COMPANY.phone} numarasından bize ulaşabilirsiniz.`,
  },
  {
    q: "Sürücümü nasıl takip edebilirim?",
    a: "Talebiniz oluşturulduktan sonra mobil uygulamadaki takip ekranından sürücünüzün konumunu ve talebinizin durumunu (Operatör Aranıyor, Sürücü Bulundu, Yolda, Geldi, Tamamlandı) anlık olarak görebilirsiniz.",
  },
  {
    q: "Ödeme nasıl yapılıyor?",
    a: "Ödemeler iyzico ödeme altyapısı üzerinden, Visa ve MasterCard logolu kredi/banka kartlarıyla ve 3D Secure doğrulamasıyla alınır. Kart bilgileriniz bizim sunucularımızda saklanmaz. Ödenecek tutar, onayınızdan önce net olarak gösterilir.",
  },
  {
    q: "Talebimi iptal edebilir miyim?",
    a: 'Bir sürücü atanmadan önce talebinizi ücretsiz olarak iptal edebilir, ödediğiniz tutarın tamamını geri alabilirsiniz. Sürücü atandıktan sonraki iptallerde, sürücü yola çıkmışsa yol maliyetini karşılayan bir iptal bedeli uygulanabilir. Ayrıntılar "Teslimat ve İade Koşulları" sayfasındadır.',
  },
  {
    q: "Ücret iadesi nasıl yapılıyor?",
    a: `Hizmetin verilmemesi veya ayıplı ifa edilmesi halinde iade talebinizi ${COMPANY.email} adresine veya ${COMPANY.phone} numarasına iletebilirsiniz. Onaylanan iadeler, ödemenin yapıldığı karta en geç 14 gün içinde aktarılır.`,
  },
  {
    q: "Çekici sürücüsü olarak nasıl çalışabilirim?",
    a: `Çekici ve yol yardımı sürücüsü olarak çalışmak için ${COMPANY.phone} numarasından bize ulaşabilirsiniz. Sürücü hesapları, gerekli belgelerin kontrolünün ardından yönetici onayıyla aktif hale gelir.`,
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <LegalLayout title="Sıkça Sorulan Sorular">
      <div className="space-y-3">
        {FAQS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={item.q} className="overflow-hidden rounded-2xl border border-zinc-200">
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold text-zinc-900"
              >
                {item.q}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && <p className="px-5 pb-4 text-sm text-zinc-600">{item.a}</p>}
            </div>
          );
        })}
      </div>
    </LegalLayout>
  );
}
