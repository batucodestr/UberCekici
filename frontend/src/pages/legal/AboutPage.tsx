import { CompanyFacts } from "@/components/legal/CompanyFacts";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/lib/company";
import { CITY_TARIFFS } from "@/lib/tariff";

/**
 * iyzico üye işyeri başvurusunun istediği "Hakkımızda" sayfası:
 * işletmenin kim olduğu, ne sattığı ve resmi künyesi girişsiz görünür.
 */
export default function AboutPage() {
  return (
    <LegalLayout title="Hakkımızda">
      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Biz Kimiz?</h2>
        <p>
          {COMPANY.brandName}, {COMPANY.ownerName} tarafından İzmir'de işletilen bir çekici ve
          yol yardımı hizmetidir. İşletmemiz {COMPANY.startDate} tarihinde{" "}
          {COMPANY.taxOffice} nezdinde faaliyetine başlamış olup {COMPANY.chamber}'na
          kayıtlıdır. Ana faaliyet konumuz, {COMPANY.activityCode} kodlu "{COMPANY.activity}"
          faaliyetidir.
        </p>
        <p>
          Yolda kalan araç sahiplerini, bölgedeki uygun çekici ve yol yardımı sürücüleriyle
          mobil uygulamamız üzerinden buluşturuyoruz. Talep oluşturulduğu anda konumunuza en
          yakın sürücü eşleştirilir, fiyat şeffaf biçimde önceden gösterilir ve aracınızın
          taşınma süreci uygulama üzerinden takip edilir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Faaliyet Alanlarımız</h2>
        <p>
          Ana faaliyetimizin yanı sıra vergi kaydımızda yer alan diğer faaliyet alanlarımız
          şunlardır:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {COMPANY.otherActivities.map((activity) => (
            <li key={activity}>{activity}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Hizmet Bölgemiz</h2>
        <p>
          Merkezimiz İzmir'dedir. Çekici ve yol yardımı taleplerimiz{" "}
          {CITY_TARIFFS.map((t) => t.city).join(", ")} şehirlerinde karşılanmaktadır. Her şehrin
          kendi tarifesi{" "}
          <span className="font-semibold text-zinc-700">Hizmetler ve Fiyatlandırma</span>{" "}
          sayfasında yayınlanmaktadır. Bu illerin dışındaki konumlar için genel tarifemiz
          geçerlidir. Şehirler arası çekim talepleri mesafeye göre fiyatlandırılır.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Çalışma Saatleri</h2>
        <p>
          Çekici ve yol yardımı taleplerimiz haftanın 7 günü, 24 saat karşılanmaktadır.
          22:00–06:00 arasındaki taleplerde gece tarifesi uygulanır.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Resmi Bilgilerimiz</h2>
        <CompanyFacts />
      </section>
    </LegalLayout>
  );
}
