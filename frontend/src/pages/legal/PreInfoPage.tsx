import { CompanyFacts } from "@/components/legal/CompanyFacts";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/lib/company";
import { TARIFF } from "@/lib/tariff";

/**
 * iyzico üye işyeri başvurusunun istediği "Ön Bilgilendirme Formu".
 * Mesafeli Sözleşmeler Yönetmeliği m.5 uyarınca, tüketici sipariş vermeden
 * önce bilgilendirilmelidir.
 */
export default function PreInfoPage() {
  return (
    <LegalLayout title="Ön Bilgilendirme Formu">

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">1. Hizmet Sağlayıcı Bilgileri</h2>
        <CompanyFacts />
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">2. Hizmetin Temel Nitelikleri</h2>
        <p>
          Sözleşmeye konu hizmet; {COMPANY.brandName} mobil uygulaması üzerinden talep edilen
          çekici, kurtarma ve yol yardımı hizmetidir. Hizmetin kapsamı (çekici, yol yardım, akü,
          lastik, kurtarma veya çoklu araç çekimi), aracın alınacağı ve bırakılacağı noktalar
          ile araç tipi, talep oluşturulurken tüketici tarafından seçilir ve onay ekranında
          özetlenir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">3. Hizmet Bedeli ve Ödeme</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Hizmet bedeli; talebin oluşturulduğu şehrin açılış ücreti ile kilometre ücreti
            üzerinden, araç tipi ve hizmet tipi katsayıları uygulanarak hesaplanır. Şehir bazlı
            güncel tarife ve hesaplama formülü{" "}
            <span className="font-semibold text-zinc-700">Hizmetler ve Fiyatlandırma</span>{" "}
            sayfasında yayınlanmaktadır.
          </li>
          <li>
            {TARIFF.nightStartHour}:00 – {String(TARIFF.nightEndHour).padStart(2, "0")}:00
            arasında oluşturulan taleplere, ilgili şehrin tarifesindeki gece ek ücreti eklenir.
          </li>
          <li>
            Tüm vergiler dahil nihai tutar, ödeme adımından önce ekranda gösterilir; tüketicinin
            onayı olmadan tahsilat yapılmaz.
          </li>
          <li>
            Ödeme, iyzico ödeme altyapısı üzerinden Visa veya MasterCard logolu kredi/banka
            kartıyla, 3D Secure doğrulamasıyla tek çekimde alınır.
          </li>
          <li>Hizmet bedeli dışında tüketiciden ek bir masraf veya komisyon talep edilmez.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">4. İfa Süresi</h2>
        <p>
          Ödemesi tamamlanan talep, uygun bir sürücüye atandığında ifaya başlanmış sayılır.
          Sürücünün adrese tahmini varış süresi talep ekranında gösterilir; konum, trafik ve
          hava koşullarına göre değişebilir. Hizmet, aracın varış noktasına ulaştırılması ya da
          yol yardımı işleminin tamamlanmasıyla ifa edilmiş olur.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">5. Cayma Hakkı</h2>
        <p>
          Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin birinci fıkrasının (h) bendi
          uyarınca, tüketicinin onayı ile ifasına başlanan ve anında ifa edilen hizmetlerde
          cayma hakkı kullanılamaz. Çekici ve yol yardımı hizmeti bu kapsamdadır.
        </p>
        <p>
          Sürücü atanmadan önce talebini iptal eden tüketiciye tahsil edilen tutarın tamamı iade
          edilir. Sürücü atandıktan sonraki iptallerde, sürücünün yola çıkmış olması halinde yol
          maliyetini karşılayan bir iptal bedeli uygulanabilir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">6. İade Koşulları</h2>
        <p>
          Hizmetin hiç verilmemesi, eksik verilmesi veya ayıplı ifa edilmesi halinde ücret iadesi
          talep edilebilir. Onaylanan iadeler, ödemenin yapıldığı karta iyzico altyapısı
          üzerinden, onay tarihinden itibaren en geç 14 gün içinde aktarılır. Ayrıntılar{" "}
          <span className="font-semibold text-zinc-700">Teslimat ve İade Koşulları</span>{" "}
          sayfasında yer alır.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">7. Şikayet ve İtiraz</h2>
        <p>
          Şikayet ve itirazlarınızı {COMPANY.phone} numarasına veya {COMPANY.email} adresine
          iletebilirsiniz. Çözüme ulaşılamaması halinde, Ticaret Bakanlığı'nca ilan edilen
          parasal sınırlar dahilinde Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri
          yetkilidir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">8. Onay</h2>
        <p>
          Tüketici, talebini onaylamadan önce bu Ön Bilgilendirme Formunun tamamını okuduğunu,
          hizmetin temel nitelikleri, tüm vergiler dahil fiyatı, ödeme ve ifa koşulları ile
          cayma hakkına ilişkin bilgileri edindiğini kabul eder.
        </p>
      </section>
    </LegalLayout>
  );
}
