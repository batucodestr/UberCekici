import { LegalLayout } from "@/components/legal/LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Gizlilik Sözleşmesi">
      <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
        Bu metin taslak niteliğindedir; yayına almadan önce hukuk danışmanınıza incelettirin.
      </p>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">1. Kapsam</h2>
        <p>
          Bu Gizlilik Sözleşmesi, Uber Çekici platformunu ("Platform") kullanan müşteri ve
          sürücülerin kişisel verilerinin nasıl toplandığını, kullanıldığını ve korunduğunu
          açıklar.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">2. Konum Verisi</h2>
        <p>
          Talep oluştururken paylaştığınız başlangıç/varış konumu ve sürücülerin aktif iş
          sırasında paylaştığı canlı konum, yalnızca ilgili talebin ifası ve canlı takip
          özelliğinin çalışması amacıyla işlenir. Talep tamamlandıktan sonra konum verileri
          işlem geçmişinde saklanmaya devam edebilir; sürücülerin anlık konumu ise talep
          bağlamı dışında paylaşılmaz.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">3. Hesap Güvenliği</h2>
        <p>
          Şifreniz geri döndürülemez biçimde (hash) saklanır. Oturum belirteçleriniz (JWT)
          sınırlı süreyle geçerlidir ve yenileme belirteci yalnızca tarayıcınızın erişemeyeceği
          bir HttpOnly çerezde tutulur.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">4. Çerezler</h2>
        <p>
          Platform, oturumunuzu güvenli biçimde sürdürebilmek için yalnızca zorunlu, işlevsel
          çerezler kullanır. Reklam veya izleme amaçlı üçüncü taraf çerezleri kullanılmaz.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">5. Veri Saklama Süresi</h2>
        <p>
          Kişisel verileriniz, hesabınız aktif olduğu sürece ve yasal saklama yükümlülükleri
          gerektirdiği ölçüde tutulur. Hesap kapatma taleplerinizi{" "}
          <a href="/destek" className="text-primary-600 underline">
            Destek
          </a>{" "}
          üzerinden iletebilirsiniz.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-zinc-900">6. İletişim</h2>
        <p>
          Gizlilikle ilgili sorularınız için{" "}
          <a href="/destek" className="text-primary-600 underline">
            Destek
          </a>{" "}
          sayfasından bize ulaşabilirsiniz.
        </p>
      </section>
    </LegalLayout>
  );
}
