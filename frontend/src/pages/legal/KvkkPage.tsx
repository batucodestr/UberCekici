import { LegalLayout } from "@/components/legal/LegalLayout";

export default function KvkkPage() {
  return (
    <LegalLayout title="KVKK Aydınlatma Metni">
      <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında bilgilendirme
        amacıyla hazırlanmış bir taslaktır. Yayına almadan önce bir hukuk danışmanına
        onaylatmanızı öneririz.
      </p>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">1. Veri Sorumlusu</h2>
        <p>
          Uber Çekici platformu ("Platform"), 6698 sayılı KVKK uyarınca "veri sorumlusu" sıfatıyla,
          kişisel verilerinizi aşağıda açıklanan kapsamda işlemektedir.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">2. İşlenen Kişisel Veriler</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Kimlik bilgileri: ad, soyad, kullanıcı adı</li>
          <li>İletişim bilgileri: telefon numarası, e-posta adresi</li>
          <li>Konum verileri: talep oluşturulurken paylaşılan başlangıç/varış konumu, sürücü konumu</li>
          <li>İşlem güvenliği bilgileri: IP adresi, oturum ve log kayıtları</li>
          <li>Müşteri işlem bilgileri: talep geçmişi, ödeme/fatura bilgileri, hizmet değerlendirmeleri</li>
          <li>Sürücüler için: araç bilgileri, ehliyet/ruhsat belgeleri, onay durumu</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">3. İşleme Amaçları</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Çekici/yol yardımı talebinin oluşturulması, sürücü eşleştirmesi ve hizmetin ifası</li>
          <li>Anlık fiyat hesaplama ve canlı takip hizmetlerinin sunulması</li>
          <li>Kullanıcı hesabının oluşturulması, kimlik doğrulama ve yetkilendirme</li>
          <li>Müşteri destek süreçlerinin yürütülmesi</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi ve hukuki uyuşmazlıkların çözümü</li>
          <li>Hizmet kalitesinin ölçülmesi ve platformun geliştirilmesi</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">4. Aktarım</h2>
        <p>
          Kişisel verileriniz, hizmetin ifası için gerekli olduğu ölçüde eşleştirilen sürücü/müşteri
          ile (yalnızca iletişim ve konum bilgisi), yasal zorunluluk halinde yetkili kamu kurum ve
          kuruluşlarıyla paylaşılabilir. Verileriniz açık rızanız olmaksızın pazarlama amacıyla
          üçüncü taraflarla paylaşılmaz.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">5. Haklarınız</h2>
        <p>
          KVKK'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme,
          işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp
          kullanılmadığını öğrenme, düzeltilmesini/silinmesini isteme ve işlemeye itiraz etme
          haklarına sahipsiniz. Taleplerinizi{" "}
          <a href="/destek" className="text-primary-600 underline">
            Destek
          </a>{" "}
          sayfasından bize iletebilirsiniz.
        </p>
      </section>
    </LegalLayout>
  );
}
