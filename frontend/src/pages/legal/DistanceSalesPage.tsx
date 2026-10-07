import { CompanyFacts } from "@/components/legal/CompanyFacts";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/lib/company";

/**
 * iyzico üye işyeri başvurusunun istediği "Mesafeli Satış Sözleşmesi".
 * 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
 * Yönetmeliği kapsamında hazırlanmıştır.
 */
export default function DistanceSalesPage() {
  return (
    <LegalLayout title="Mesafeli Satış Sözleşmesi">

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">1. Taraflar</h2>
        <p className="font-semibold text-zinc-700">HİZMET SAĞLAYICI</p>
        <CompanyFacts />
        <p className="mt-4 font-semibold text-zinc-700">TÜKETİCİ</p>
        <p>
          {COMPANY.brandName} mobil uygulaması üzerinden talep oluşturan ve talebi onaylayan
          kişi. Tüketicinin ad-soyad, telefon, adres ve diğer bilgileri, talep oluşturulurken
          uygulamaya girdiği bilgilerdir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">2. Konu</h2>
        <p>
          İşbu sözleşmenin konusu, Tüketicinin {COMPANY.brandName} mobil uygulaması üzerinden
          elektronik ortamda siparişini verdiği çekici ve yol yardımı hizmetinin satışı ve
          ifasıyla ilgili olarak, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli
          Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin
          belirlenmesidir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">3. Sözleşme Konusu Hizmet</h2>
        <p>
          Hizmetin türü (çekici, yol yardım, akü, lastik, kurtarma veya çoklu araç çekimi), araç
          tipi, aracın alınacağı ve bırakılacağı noktalar ile tüm vergiler dahil hizmet bedeli,
          Tüketicinin talep oluştururken yaptığı seçimlere göre belirlenir ve ödeme öncesindeki
          onay ekranında gösterilir. Bu bilgiler işbu sözleşmenin ayrılmaz parçasıdır.
        </p>
        <p>
          Hizmet bedelinin nasıl hesaplandığı ve güncel tarife{" "}
          <span className="font-semibold text-zinc-700">Hizmetler ve Fiyatlandırma</span>{" "}
          sayfasında yayınlanmaktadır.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">4. Genel Hükümler</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Tüketici, sözleşme konusu hizmetin temel nitelikleri, tüm vergiler dahil satış
            fiyatı, ödeme şekli ve ifaya ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve
            elektronik ortamda gerekli teyidi verdiğini kabul eder.
          </li>
          <li>
            Hizmet Sağlayıcı, sözleşme konusu hizmeti eksiksiz, siparişte belirtilen niteliklere
            uygun ve mevzuatın gerektirdiği özen ve ihtimamla ifa etmeyi kabul eder.
          </li>
          <li>
            Hizmet Sağlayıcı, mücbir sebepler veya olağanüstü hava/trafik koşulları nedeniyle
            hizmeti süresinde ifa edemezse durumu Tüketiciye bildirir. Bu durumda Tüketici
            siparişi iptal ederek ödediği tutarın tamamını geri alabilir.
          </li>
          <li>
            Hizmetin ifası için Tüketicinin doğru adres ve iletişim bilgisi vermesi
            gerekmektedir. Hatalı bilgi nedeniyle sürücünün yanlış adrese gitmesi halinde doğan
            maliyet Tüketiciye yansıtılabilir.
          </li>
          <li>
            Platform, müşterileri bağımsız çekici ve yol yardımı sürücüleriyle buluşturur;
            hizmetin fiili ifası atanan sürücü tarafından gerçekleştirilir.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">5. Cayma Hakkı</h2>
        <p>
          Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca, Tüketicinin onayı ile
          ifasına başlanan ve anında ifa edilen hizmetlerde cayma hakkı kullanılamaz. Çekici ve
          yol yardımı hizmeti niteliği gereği bu istisna kapsamındadır.
        </p>
        <p>
          Sürücü ataması yapılmadan önceki iptallerde tahsil edilen tutarın tamamı iade edilir.
          İptal ve iade süreçlerinin ayrıntıları{" "}
          <span className="font-semibold text-zinc-700">Teslimat ve İade Koşulları</span>{" "}
          sayfasında düzenlenmiştir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">6. Ödeme ve Faturalandırma</h2>
        <p>
          Ödemeler, iyzico ödeme kuruluşu altyapısı üzerinden Visa ve MasterCard logolu
          kredi/banka kartlarıyla, 3D Secure doğrulamasıyla alınır. Kart bilgileri{" "}
          {COMPANY.brandName} sunucularında saklanmaz. Hizmet bedeline ilişkin fatura, hizmetin
          ifasının ardından Tüketicinin bildirdiği bilgiler üzerinden düzenlenir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">7. Kişisel Verilerin Korunması</h2>
        <p>
          Tüketiciye ait kişisel veriler, 6698 sayılı Kişisel Verilerin Korunması Kanunu'na uygun
          olarak işlenir. Ayrıntılı bilgi{" "}
          <span className="font-semibold text-zinc-700">KVKK Aydınlatma Metni</span> ve{" "}
          <span className="font-semibold text-zinc-700">Gizlilik Sözleşmesi</span> sayfalarında
          yer almaktadır.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">8. Uyuşmazlık Çözümü</h2>
        <p>
          İşbu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı'nca her yıl ilan edilen
          parasal sınırlar dahilinde, hizmetin satın alındığı veya Tüketicinin yerleşim yerinin
          bulunduğu yerdeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">9. Yürürlük</h2>
        <p>
          Tüketicinin talebini elektronik ortamda onaylaması ile işbu sözleşme kurulmuş sayılır
          ve taraflar arasında yürürlüğe girer. Sözleşmenin bir örneği Tüketicinin uygulama
          üzerindeki işlem geçmişinde erişilebilir durumda tutulur.
        </p>
      </section>
    </LegalLayout>
  );
}
