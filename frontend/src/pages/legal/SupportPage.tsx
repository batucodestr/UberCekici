import { Mail, MessageCircle, Phone } from "lucide-react";

import { LegalLayout } from "@/components/legal/LegalLayout";

const CHANNELS = [
  {
    icon: Phone,
    title: "Telefon",
    detail: "0850 000 00 00",
    note: "7/24 acil yol yardım hattı",
  },
  {
    icon: Mail,
    title: "E-posta",
    detail: "destek@ubercekici.com",
    note: "Ortalama yanıt süresi: 24 saat",
  },
  {
    icon: MessageCircle,
    title: "Canlı Destek",
    detail: "Uygulama içi sohbet",
    note: "Giriş yaptıktan sonra ulaşılabilir",
  },
];

export default function SupportPage() {
  return (
    <LegalLayout title="Destek">
      <p>
        Talebinizle, hesabınızla veya bir sürücü/müşteri şikayetiyle ilgili yardıma mı
        ihtiyacınız var? Aşağıdaki kanallardan bize ulaşabilirsiniz.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {CHANNELS.map(({ icon: Icon, title, detail, note }) => (
          <div key={title} className="rounded-2xl border border-zinc-200 p-5">
            <Icon className="h-5 w-5 text-primary-600" />
            <p className="mt-3 font-semibold text-zinc-900">{title}</p>
            <p className="text-sm text-zinc-700">{detail}</p>
            <p className="mt-1 text-xs text-zinc-400">{note}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-zinc-50 p-5 text-sm">
        <p className="font-semibold text-zinc-900">Acil bir durumda mısınız?</p>
        <p className="mt-1 text-zinc-600">
          Trafik güvenliğinizi tehlikeye atan bir durumdaysanız önce 112'yi arayın, ardından
          çekici talebinizi oluşturun.
        </p>
      </div>
    </LegalLayout>
  );
}
