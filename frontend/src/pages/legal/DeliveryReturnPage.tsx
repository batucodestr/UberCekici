import { CompanyFacts } from "@/components/legal/CompanyFacts";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/lib/company";

/**
 * iyzico üye işyeri başvurusunun zorunlu tuttuğu "Teslimat ve İade" sayfası.
 * Hizmet fiziksel bir ürün teslimi içermediği için metin, hizmetin ifası ve
 * ücret iadesi üzerinden kurgulanmıştır.
 */
export default function DeliveryReturnPage() {
  return (
    <LegalLayout title="Teslimat ve İade Koşulları">

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">1. Satıcı Bilgileri</h2>
        <CompanyFacts />
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">2. Hizmetin Niteliği ve Teslimat</h2>
        <p>
          {COMPANY.brandName} üzerinden satın alınan hizmet, çekici ve yol yardımı
          hizmetidir. Fiziksel bir ürün gönderimi yapılmadığı için kargo veya posta yoluyla
          teslimat söz konusu değildir; hizmet, talebinizde belirttiğiniz adreste yerinde
          ifa edilir.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Ödemesi tamamlanan talep, uygun bir sürücüye atandığı anda teslimat süreci
            başlamış sayılır.
          </li>
          <li>
            Sürücünün adrese varış süresi; konum, trafik ve hava koşullarına göre değişir ve
            talep ekranında tahmini olarak gösterilir.
          </li>
          <li>
            Hizmetin ifası, aracınızın belirtilen varış noktasına ulaştırılması ya da yol
            yardımı işleminin tamamlanmasıyla sona erer.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">3. İptal Koşulları</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Talebinize henüz bir sürücü atanmadıysa iptal ücretsizdir; tahsil edilen tutarın
            tamamı iade edilir.
          </li>
          <li>
            Sürücü atandıktan sonra, sürücü adrese hareket etmişse yol maliyetini karşılayan
            bir iptal bedeli uygulanabilir; kalan tutar iade edilir.
          </li>
          <li>
            Hizmet tamamlandıktan sonra iptal yapılamaz; bu aşamada 4. maddedeki ayıplı
            hizmet hükümleri uygulanır.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">4. Cayma Hakkı ve İade</h2>
        <p>
          Mesafeli Sözleşmeler Yönetmeliği uyarınca tüketicinin 14 gün içinde cayma hakkı
          bulunur. Ancak aynı Yönetmeliğin 15. maddesi gereği, tüketicinin onayı ile ifasına
          başlanan ve anında ifa edilen hizmetlerde cayma hakkı kullanılamaz. Çekici ve yol
          yardımı hizmeti bu kapsamda olduğundan, hizmet tamamlandıktan sonra cayma hakkı
          işletilemez.
        </p>
        <p>
          Hizmetin hiç verilmemesi, eksik verilmesi veya ayıplı ifa edilmesi halinde ücret
          iadesi talep edebilirsiniz. İade talepleri{" "}
          <span className="font-semibold text-zinc-700">{COMPANY.email}</span> adresine veya{" "}
          <span className="font-semibold text-zinc-700">{COMPANY.phone}</span> numarasına
          iletilebilir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">5. İade Süreci ve Süresi</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>İade talebiniz en geç 3 iş günü içinde incelenir ve tarafınıza bilgi verilir.</li>
          <li>
            Onaylanan iadeler, ödemenin yapıldığı karta iyzico altyapısı üzerinden yapılır;
            farklı bir hesaba veya nakit olarak iade yapılamaz.
          </li>
          <li>
            İade tutarı, onay tarihinden itibaren en geç 14 gün içinde bankaya aktarılır.
            Tutarın kart ekstrenize yansıması bankanızın işlem süresine bağlı olarak 2–10 iş
            günü sürebilir.
          </li>
          <li>İade işlemi için tüketiciden herhangi bir masraf veya komisyon alınmaz.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">6. Ödeme Güvenliği</h2>
        <p>
          Tüm kart ödemeleri iyzico ödeme altyapısı üzerinden 3D Secure doğrulamasıyla alınır.
          Visa ve MasterCard logolu kartlar kabul edilir. Kart bilgileriniz
          {" "}{COMPANY.brandName} sunucularında saklanmaz.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">7. Uyuşmazlık Çözümü</h2>
        <p>
          Şikayet ve itirazlarınız için öncelikle yukarıdaki iletişim kanallarına
          başvurabilirsiniz. Çözüme ulaşılamaması halinde, Gümrük ve Ticaret Bakanlığı'nca
          ilan edilen parasal sınırlar dahilinde, hizmetin satın alındığı veya tüketicinin
          yerleşim yerindeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.
        </p>
      </section>
    </LegalLayout>
  );
}
