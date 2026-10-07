import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/lib/company";
import { CITY_TARIFFS, SERVICES, TARIFF, VEHICLE_MULTIPLIERS } from "@/lib/tariff";

/**
 * iyzico üye işyeri başvurusunun istediği "satılan hizmet ve fiyat bilgisi"
 * sayfası: hangi hizmetin satıldığı ve ücretin nasıl hesaplandığı girişsiz
 * görünür olmalıdır.
 *
 * Tablolardaki değerler backend'deki fiyat kurallarıyla aynı tutulmalıdır;
 * bkz. `@/lib/tariff`.
 */
export default function ServicesPage() {
  const nightEnd = String(TARIFF.nightEndHour).padStart(2, "0");

  return (
    <LegalLayout title="Hizmetler ve Fiyatlandırma">
      <section className="space-y-3">
        <p>
          {COMPANY.brandName} olarak aşağıdaki çekici ve yol yardımı hizmetlerini sunuyoruz.
          Hizmet bedeli, talebi onaylamadan önce uygulamada net tutar olarak gösterilir;
          onaylamadığınız bir tutar için tahsilat yapılmaz.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Sunduğumuz Hizmetler</h2>
        <div className="space-y-2">
          {SERVICES.map((service) => (
            <div key={service.name} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-zinc-800">{service.name}</p>
                <p className="text-xs text-zinc-500">
                  Hizmet katsayısı: {service.multiplier.toFixed(2)}
                </p>
              </div>
              <p className="mt-0.5">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Şehir Bazlı Tarife</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="p-3 font-semibold">Şehir</th>
                <th className="p-3 font-semibold">Açılış ücreti</th>
                <th className="p-3 font-semibold">Km ücreti</th>
                <th className="p-3 font-semibold">Gece tarifesi</th>
              </tr>
            </thead>
            <tbody>
              {CITY_TARIFFS.map((row) => (
                <tr key={row.city} className="border-b border-zinc-100">
                  <td className="p-3 font-semibold text-zinc-700">{row.city}</td>
                  <td className="p-3">{row.baseFee} TL</td>
                  <td className="p-3">{row.pricePerKm} TL / km</td>
                  <td className="p-3">+{row.nightSurcharge} TL</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-400">
          Gece tarifesi {TARIFF.nightStartHour}:00 – {nightEnd}:00 arasında oluşturulan
          taleplere uygulanır. Tarifenin son güncellenme tarihi: {TARIFF.updatedAt}.
          Fiyatlara KDV dahildir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Araç Tipi Katsayıları</h2>
        <p>
          Katsayılar yalnızca mesafe ücretine uygulanır; açılış ücreti ve gece tarifesi araç
          tipinden etkilenmez.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <tbody>
              {VEHICLE_MULTIPLIERS.map((row) => (
                <tr key={row.name} className="border-b border-zinc-100">
                  <td className="p-3 font-semibold text-zinc-700">{row.name}</td>
                  <td className="p-3">{row.multiplier.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Ücret Nasıl Hesaplanır?</h2>
        <p>Hizmet bedeli şu formülle hesaplanır:</p>
        <p className="rounded-xl bg-zinc-100 p-4 font-mono text-xs leading-relaxed text-zinc-700">
          Toplam = Açılış ücreti
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;+ (Km ücreti × Mesafe) × (Araç katsayısı + Hizmet katsayısı −
          1)
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;+ Gece tarifesi
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-semibold text-zinc-700">Mesafe:</span> Alınacak nokta ile varış
            noktası arasındaki güzergah uzunluğu, harita servisi üzerinden otomatik hesaplanır.
          </li>
          <li>
            <span className="font-semibold text-zinc-700">Açılış ücreti:</span> Talebin
            oluşturulduğu şehrin tarifesine göre belirlenir ve katsayılardan etkilenmez.
          </li>
          <li>
            <span className="font-semibold text-zinc-700">Katsayılar:</span> Araç tipi ve hizmet
            tipi katsayıları yalnızca mesafe ücretini etkiler. Motosiklet, akü ve lastik gibi
            1'in altındaki katsayılarda mesafe ücreti düşer.
          </li>
          <li>
            <span className="font-semibold text-zinc-700">Gece tarifesi:</span>{" "}
            {TARIFF.nightStartHour}:00 ile {nightEnd}:00 arasında oluşturulan taleplere sabit ek
            ücret olarak yansır.
          </li>
        </ul>
        <p className="rounded-xl bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-600">
          <span className="font-semibold text-zinc-700">Örnek:</span> İzmir'de, gündüz saatinde,
          otomobilin (katsayı 1,00) 20 km çekilmesi →{" "}
          <span className="font-mono">750 + (50 × 20) × (1,00 + 1,00 − 1) = 1.750 TL</span>
        </p>
        <p>
          Uygulamada talep oluştururken gördüğünüz tutar bir ön tahmindir; nihai ücret, talep
          sunucu tarafında oluşturulurken güncel tarifeye göre yeniden hesaplanır ve ödeme
          öncesinde onayınıza sunulur.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="mb-2 text-lg font-bold text-zinc-900">Ödeme Yöntemleri</h2>
        <p>
          Ödemeler, iyzico ödeme altyapısı üzerinden Visa ve MasterCard logolu kredi/banka
          kartlarıyla, 3D Secure doğrulamasıyla alınır.
        </p>
      </section>
    </LegalLayout>
  );
}
