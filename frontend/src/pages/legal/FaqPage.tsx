import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { LegalLayout } from "@/components/legal/LegalLayout";

const FAQS = [
  {
    q: "Çekici talebimi nasıl oluşturabilirim?",
    a: "Giriş yaptıktan sonra müşteri ekranında araç tipinizi seçin, haritadan başlangıç ve varış konumunuzu belirleyin, ihtiyacınız olan hizmeti seçin ve anlık fiyat teklifini onaylayarak talebinizi oluşturun.",
  },
  {
    q: "Fiyat nasıl hesaplanıyor?",
    a: "Fiyat; mesafe, araç tipi, hizmet türü, şehir ve gece tarifesi gibi kurallara göre sunucu tarafında hesaplanır. Talep oluşturulmadan önce gösterilen tutar bir ön tahmindir, nihai tutar talep oluşturulurken belirlenir.",
  },
  {
    q: "Sürücümü nasıl takip edebilirim?",
    a: "Talebiniz oluşturulduktan sonra canlı takip ekranına yönlendirilirsiniz. Bu ekranda sürücünüzün konumu ve talebinizin durumu (Operatör Aranıyor, Sürücü Bulundu, Yolda, Geldi, Tamamlandı) anlık olarak güncellenir.",
  },
  {
    q: "Çekici olarak nasıl kayıt olabilirim?",
    a: "Kayıt ekranında 'Çekici' rolünü seçip bilgilerinizi girerek kayıt olabilirsiniz. Hesabınız, platform yöneticisi tarafından onaylandıktan sonra aktif talep alabilir hale gelir.",
  },
  {
    q: "Talebimi iptal edebilir miyim?",
    a: "Bir sürücü size atanmadan önce talebinizi ücretsiz olarak iptal edebilirsiniz. Sürücü atandıktan sonraki iptallerde iptal politikası uygulanır.",
  },
  {
    q: "Ödeme nasıl yapılıyor?",
    a: "Ödeme yöntemleri ve tahsilat süreci hakkında güncel bilgi için Destek ekibimizle iletişime geçebilirsiniz.",
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
                className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold text-zinc-900"
              >
                {item.q}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-zinc-100 px-5 py-4 text-sm text-zinc-600">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </LegalLayout>
  );
}
