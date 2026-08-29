import { LegalLayout } from "@/components/legal/LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout title="Kullanım Şartları">
      <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
        Bu metin taslak niteliğindedir; yayına almadan önce hukuk danışmanınıza incelettirin.
      </p>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">1. Taraflar ve Kabul</h2>
        <p>
          Bu Kullanım Şartları, Uber Çekici platformunu ("Platform") kullanan tüm müşteri ve
          sürücüleri bağlar. Platforma kayıt olarak bu şartları kabul etmiş sayılırsınız.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">2. Hizmetin Niteliği</h2>
        <p>
          Platform, müşterileri bağımsız çekici/yol yardımı sürücüleriyle buluşturan bir aracı
          hizmettir. Platform, sürücülerin işveren veya çalıştıranı değildir; hizmetin fiili
          ifası sürücü ile müşteri arasındadır.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">3. Hesap ve Rol Sorumluluğu</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Kayıt sırasında yalnızca Müşteri veya Çekici rolü seçilebilir; Yönetici hesapları
            sisteme dışarıdan kayıt yoluyla oluşturulamaz.</li>
          <li>Çekici hesapları, platform yöneticisi onayından geçtikten sonra aktif talep
            alabilir.</li>
          <li>Hesap bilgilerinizin güvenliğinden ve hesabınız üzerinden yapılan işlemlerden siz
            sorumlusunuz.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">4. Fiyatlandırma</h2>
        <p>
          Talep oluşturma anında gösterilen fiyat bir ön tahmindir; nihai ücret, talep sunucu
          tarafında oluşturulurken güncel fiyat kurallarına göre yeniden hesaplanır. Gece
          tarifesi, araç tipi ve hizmet türüne göre ek ücretler uygulanabilir.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">5. İptal</h2>
        <p>
          Müşteriler, bir sürücü ataması yapılmadan önce talebi ücretsiz iptal edebilir. Sürücü
          atandıktan sonra yapılan iptallerde platform iptal politikası uygulanır.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">6. Sorumluluğun Sınırlandırılması</h2>
        <p>
          Platform, sürücü ile müşteri arasındaki hizmetin ifasından doğan doğrudan zararlardan
          sorumlu tutulamaz; ancak platform üzerinden bildirilen şikayetleri inceleme ve gerekli
          hallerde sürücü hesabını askıya alma hakkını saklı tutar.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">7. Değişiklikler</h2>
        <p>
          Bu şartlar zaman zaman güncellenebilir. Güncel sürüm her zaman bu sayfada yayınlanır.
        </p>
      </section>
    </LegalLayout>
  );
}
