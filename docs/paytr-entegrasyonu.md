# PayTR iFrame API Entegrasyonu

Bu belge, projeye eklenen PayTR iFrame API ödeme altyapısının mimarisini,
yapılandırmasını ve test → canlı geçiş adımlarını anlatır.

Kaynak dokümantasyon:

- iFrame API: <https://dev.paytr.com/iframe-api>
- 1. Adım (token): <https://dev.paytr.com/iframe-api/iframe-api-1-adim>
- 2. Adım (bildirim): <https://dev.paytr.com/iframe-api/iframe-api-2-adim>
- Entegrasyon süreci: <https://dev.paytr.com/home/iframe-api-entegrasyon-sureci>

---

## 1. Ne satılıyor?

Projede iki ayrı tahsilat noktası var ve ikisi de kart ile ödenebilir hâle
getirildi:

| Akış | Kim öder | Tutarın kaynağı |
|---|---|---|
| Hizmet talebi (çekici/yol yardım) | Müşteri | `ServiceRequest.price` — fiyat motoru (`apps/pricing/services.calculate_price`) veya müşterinin kabul ettiği teklif |
| Sürücü paketi (abonelik) | Sürücü | `apps/drivers/models.SUBSCRIPTION_PLANS` (3 Gün 450 ₺ / Haftalık 800 ₺) |

Mevcut **nakit** ve **havale/EFT** akışları olduğu gibi korundu; kart ödemesi
bunların yanına eklendi.

---

## 2. Ödeme akışı

```
                 ┌──────────────────────────── 1. ADIM ────────────────────────────┐
 Müşteri / Sürücü                     Backend                            PayTR
  (mobil app veya                  (Django/DRF)
   tarayıcı)
       │  POST /api/payments/paytr/.../init/   │                            │
       │  (JWT ile, TUTAR GÖNDERMEZ)           │                            │
       ├──────────────────────────────────────►│                            │
       │                                       │ PaymentTransaction yarat   │
       │                                       │ (merchant_oid + tutar)     │
       │                                       │ paytr_token imzala         │
       │                                       ├───POST get-token──────────►│
       │                                       │◄──{status, token}──────────┤
       │◄─── {iframe_token, payment_page_path} ┤                            │
       │                                                                    │
       │  /odeme/<token> sayfasını aç → iFrame: paytr.com/odeme/guvenli/..  │
       ├───────────────────────── kart bilgileri + 3D Secure ──────────────►│
       │                        (bizim sunucumuza UĞRAMAZ)                  │
       │                                                                    │
                 └────────────────────────── 2. ADIM ────────────────────────┘
       │                                       │                            │
       │                                       │◄──POST bildirim (hash)─────┤
       │                                       │ imza + tutar doğrula       │
       │                                       │ siparişi güncelle          │
       │                                       ├───"OK"────────────────────►│
       │◄─ /odeme/basarili?oid=... (bilgi) ─────┤                            │
       │  (durum ayrıca /transactions/<oid>/ ucundan DOĞRULATILIR)          │
```

**Altın kural:** Sipariş `approved` durumuna **yalnızca** imzası doğrulanmış
2. Adım bildirimiyle geçer. Kullanıcının `merchant_ok_url`'e dönmesi ödeme
kanıtı sayılmaz.

---

## 3. API uçları

| Uç | Yetki | Açıklama |
|---|---|---|
| `POST /api/payments/paytr/requests/<id>/init/` | müşteri (talebin sahibi) | Hizmet talebi için ödeme başlatır |
| `POST /api/payments/paytr/subscription/init/` | sürücü | Paket ödemesi başlatır (`{"plan": "three_day"\|"weekly"}`) |
| `POST /api/payments/paytr/callback/` | — (imza ile) | **PayTR'nin Bildirim URL'si.** Oturum/CSRF/throttle yok; güvenlik sınırı HMAC imzasıdır |
| `GET /api/payments/paytr/transactions/<merchant_oid>/` | işlem sahibi veya admin | Doğrulanmış ödeme durumu |
| `GET /api/admin/payment-transactions/` | admin | Ödeme işlemleri listesi / mutabakat (panelde: **Ödemeler** sekmesi, `/admin/payments`) |

### Başlatma yanıtı

```json
{
  "merchant_oid": "SR4f3c2a1b9d8e7f6a5b4c",
  "purpose": "service_request",
  "amount": "1250.50",
  "currency": "TL",
  "status": "pending",
  "test_mode": true,
  "iframe_token": "....",
  "iframe_url": "https://www.paytr.com/odeme/guvenli/....",
  "payment_page_path": "/odeme/...."
}
```

Mobil uygulama `payment_page_path`'i bir WebView'de açar ya da
`iframe_url`'i doğrudan kullanır.

### Hata kodları

| Kod | Anlamı |
|---|---|
| 400 | İş kuralı reddi (fiyat henüz kesinleşmemiş, iptal edilmiş talep, ödemesi onaylı talep, ücreti 0 olan talep, geçersiz paket) |
| 403 | Rol uyuşmuyor (ör. sürücü hizmet ödemesi başlatmaya çalışıyor) |
| 404 | Talep bulunamadı **veya** başkasına ait (bilgi sızdırmamak için aynı yanıt) |
| 502 | PayTR token isteğini reddetti / ulaşılamadı |
| 503 | Mağaza bilgileri (`PAYTR_MERCHANT_*`) tanımlı değil |

---

## 4. Dosya haritası

| Dosya | Rol |
|---|---|
| `backend/apps/payments/paytr.py` | İmza üretimi (1. ve 2. Adım), token isteği, sepet kodlama, IP çıkarımı. Django modellerinden bağımsız |
| `backend/apps/payments/services.py` | Sipariş tarafı: başlatma iş kuralları, bildirim işleme, idempotency, mutabakat |
| `backend/apps/payments/models.py` | `PaymentTransaction` (yeni) + mevcut `Payment` (korundu) |
| `backend/apps/payments/views.py` | Başlatma uçları, callback ucu, durum sorgulama, admin listesi |
| `backend/apps/payments/serializers.py` | Başlatma/durum serializer'ları (token ve sırlar dışarı verilmez) |
| `backend/apps/payments/urls.py` | Rotalar |
| `backend/apps/payments/migrations/0003_paymenttransaction.py` | Tablo |
| `backend/config/settings.py` | `PAYTR_*` ayarları + `payment` throttle kovası |
| `frontend/src/pages/payment/PaymentPage.tsx` | iFrame'i barındıran ödeme ekranı (`/odeme/:token`) |
| `frontend/src/pages/payment/PaymentResultPage.tsx` | `/odeme/basarili` ve `/odeme/basarisiz` |
| `frontend/src/pages/admin/AdminPaymentsPage.tsx` | Yönetici mutabakat ekranı (`/admin/payments`), salt-okunur |
| `frontend/src/lib/paytr.ts` | Token doğrulama + iFrame adresi üretimi |
| `frontend/src/services/payments.ts` | API çağrıları |
| `infra/caddy/kurtaricim.com.tr.caddy` | CSP'ye `frame-src`/`script-src` istisnası |

---

## 5. Yapılandırma

### 5.1 Ortam değişkenleri

Tamamı `.env.example` içinde açıklandı. Zorunlu üçlü:

```env
PAYTR_MERCHANT_ID=       # Mağaza No
PAYTR_MERCHANT_KEY=      # Mağaza Parola
PAYTR_MERCHANT_SALT=     # Mağaza Gizli Anahtar
```

**Nereden alınır:** PayTR Mağaza Paneli → **Destek & Kurulum** →
**Entegrasyon Bilgileri** → *API Entegrasyon Bilgileri*. Bu bölümü yalnızca
**Ana Kullanıcı** ve **Teknik Kullanıcı** görebilir.

**Sunucuya nasıl eklenir:**

```bash
cd /opt/UberCekici
nano .env                      # PAYTR_* satırlarını doldurun
docker compose up -d           # backend/celery/websocket env_file: .env okur
```

`.env` dosyası `.gitignore` içindedir; gerçek değerler repoya girmez.
Değerler yalnızca backend container'ının ortamında bulunur, frontend build'ine
veya istemciye gönderilmez.

Diğer değişkenler (hepsinin güvenli varsayılanı var):
`PAYTR_TEST_MODE`, `PAYTR_DEBUG_ON`, `PAYTR_TIMEOUT_LIMIT`,
`PAYTR_NO_INSTALLMENT`, `PAYTR_MAX_INSTALLMENT`, `PAYTR_CURRENCY`,
`SITE_BASE_URL`, `PAYTR_MERCHANT_OK_URL`, `PAYTR_MERCHANT_FAIL_URL`,
`PAYTR_REQUEST_TIMEOUT`, `PAYTR_TOKEN_TTL_MINUTES`.

### 5.2 PayTR panelinde Bildirim URL'si

Panelde **Bildirim URL** alanına şu adres yazılmalıdır:

```
https://xn--kurtarcm-ykbb.com.tr/api/payments/paytr/callback/
```

> **Alan adı neden punycode?** Siteyi fiilen sunan alan adı
> kurtarıcım.com.tr'dir; DNS'te yalnızca punycode karşılığı
> (`xn--kurtarcm-ykbb.com.tr`) bu sunucuya işaret eder. ASCII
> `kurtaricim.com.tr` şu an başka bir IP'ye çözümleniyor ve HTTP 403
> dönüyor. PayTR panelindeki Bildirim URL ve dönüş adresleri bu yüzden
> punycode biçimiyle girilmelidir.

Bu adres:

- dışarıdan erişilebilir olmalı (oturum, IP kısıtı, Basic Auth olmamalı),
- geçerli bir TLS sertifikası sunmalı (Cloudflare + Caddy hazır),
- `POST` kabul etmeli (Caddy `/api/*` bloğu backend'e proxy'liyor).

### 5.3 CSP (reverse proxy)

Ödeme ekranı PayTR'yi bir iFrame içinde açtığı için CSP'ye iki istisna eklendi:

```
script-src 'self' https://www.paytr.com;   # resmî iframeResizer.min.js
frame-src  https://www.paytr.com;          # ödeme formu
```

`infra/caddy/kurtaricim.com.tr.caddy` dosyası güncellendi, ancak bu dosya
**referans kopyadır** — gerçek Caddyfile bu VPS'te `/opt/trugc/Caddyfile`
altındadır. Oradaki iki site bloğunun (`xn--kurtarcm-ykbb.com.tr` ve
`kurtaricim.com.tr`) CSP satırları aynı şekilde güncellenmeli, ardından:

```bash
docker exec trugc-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

Bu istisna yapılmazsa ödeme ekranı **boş** görünür (tarayıcı konsolunda CSP
ihlali yazar).

---

## 6. Güvenlik tasarımı

| Risk | Önlem |
|---|---|
| Fiyat kesinleşmeden tahsilat | Kart ödemesi yalnızca `accepted`/`driver_found`/`en_route`/`arrived`/`completed` durumlarında açılır. `searching` aşamasında ödenirse kabul edilen teklif `price`'ı sonradan değiştirip tahsil edilen tutarı geçersizleştirebilirdi (`PAYABLE_REQUEST_STATUSES`, `test_accepting_an_offer_can_no_longer_outdate_a_paid_amount`) |
| İstemcinin tutarı değiştirmesi | Başlatma serializer'ı tutar alanı **kabul etmez**; tutar `ServiceRequest.price` veya sabit paket tablosundan okunur (`test_client_cannot_override_amount`) |
| Başkasının siparişini ödemek | Sorgu daima `customer=request.user` ile daraltılır; yabancı talep 404 (`test_foreign_customer_cannot_start_payment_for_another_order`) |
| Sipariş numarasını tahmin etmek | `merchant_oid` = prefix + `secrets.token_hex(10)`; ayrıca tüm uçlar sahiplik kontrolü yapar |
| Sahte ödeme bildirimi | HMAC-SHA256 imza doğrulaması; imza geçerli değilse **hiçbir** sipariş alanı değişmez |
| İmza karşılaştırmasında timing attack | `hmac.compare_digest` |
| Tutar oynanmış bildirim | İmza `total_amount`'ı kapsar; ayrıca `payment_amount` sunucudaki tutarla ve para birimi ile karşılaştırılır. Uyuşmazlıkta işlem `mismatch` olur, sipariş onaylanmaz, yöneticilere bildirim düşer |
| Yinelenen bildirim | `select_for_update()` + kesinleşmiş işlemde erken `OK`; hizmet/paket ikinci kez tanımlanmaz (`test_duplicate_subscription_callback_does_not_extend_twice`) |
| Dönüş sayfasının kötüye kullanımı | `/odeme/basarili` ödeme kanıtı sayılmaz; ekran durumu backend'den doğrulatır |
| Sır sızması | `merchant_key`/`merchant_salt` yalnızca `paytr.py` içinde kullanılır; log ve hata mesajlarına yazılmaz, API yanıtına girmez, denetim kaydına düşmez (callback anonim olduğu için `AuditLogMiddleware` kayıt açmaz) |
| Kart verisi sorumluluğu | Kart alanları yalnızca PayTR'nin iFrame'inde; uygulama DOM'una ve sunucuya hiç girmez |
| CSRF | İstisna **yalnızca** callback ucunda; diğer uçlarda JWT + mevcut kontroller aynen duruyor |
| Token üretimini kötüye kullanma | Başlatma uçları `payment` throttle kovasında (20/dk); callback bilinçli olarak throttle dışı (gerçek bildirim 429 yememeli) |
| Django admin'den elle "ödendi" işaretleme | `PaymentTransactionAdmin` tamamen salt-okunur (`has_add/change_permission = False`) |

---

## 7. Testler

```bash
# Tüm backend testleri (PayTR dahil)
cd backend && pytest

# Yalnızca PayTR
cd backend && pytest apps/payments -v

# Frontend
cd frontend && npm run test
```

Testlerin **hiçbiri** gerçek mağaza sırrı veya PayTR sunucusuna erişim
gerektirmez: kimlik bilgileri `override_settings` ile sahte değerlere
sabitlenir, token isteği `requests.post` seviyesinde mock'lanır ve bildirim
imzaları testin içinde resmî algoritmayla yeniden üretilir
(`apps/payments/tests/conftest.py`).

Kapsam:

- `test_paytr_token.py` — imza sırası, her alanın imzayı değiştirmesi, sepet
  base64 biçimi, kuruş çevrimi, `merchant_oid` kısıtları, zorunlu alanların
  gönderilmesi, hata sarmalama, IP çıkarımı
- `test_paytr_init.py` — yetki, sahiplik, tutar bütünlüğü, iş kuralları,
  token yeniden kullanımı/süre aşımı, yapılandırma eksikliği
- `test_paytr_callback.py` — başarılı/başarısız bildirim, geçersiz imza,
  yanlış salt, tutar ve para birimi uyuşmazlığı, yinelenen bildirim,
  bilinmeyen sipariş, taksitli ödemede yüksek `total_amount`, CSRF/oturum/
  throttle davranışı, durum sorgulama yetkisi

---

## 8. Test modundan canlı moda geçiş

1. `.env` içinde `PAYTR_MERCHANT_*` değerlerini doldurun ve
   `PAYTR_TEST_MODE=true` bırakın.
2. PayTR panelinde **Bildirim URL**'sini tanımlayın (§5.2).
3. Gerçek Caddyfile'daki CSP satırlarını güncelleyip Caddy'yi reload edin (§5.3).
4. `docker compose up -d --build` ile dağıtın ve `docker compose exec
   ubercekici-backend python manage.py migrate` ile `PaymentTransaction`
   tablosunu oluşturun.
5. Bir test ödemesi yapın. PayTR ödeme sayfasında **test kartları hazır
   gelir**, kart bilgisi girmeniz gerekmez; 3D Secure test adımını
   tamamlayın.
6. Panelde **İşlemler** sayfasından, testte kullandığınız e-posta adresiyle
   arayarak işlemi görün.
7. `GET /api/admin/payment-transactions/` ya da Django admin'deki
   "PayTR İşlemleri" ekranından bildirimin `paid` olarak işlendiğini ve
   siparişin `payment_status=approved` olduğunu doğrulayın.
8. Mağaza görünümünü ayarlayın (ödeme sayfası renkleri, taksit tablosu,
   "Peşin Fiyatına Taksit").
9. Panelde **Destek & Kurulum → Canlı Mod** altında *"Evet, Entegrasyonu
   Tamamladım"* ve ardından *"Canlı Moda Geçiş Talebi Gönder"*.
10. PayTR ekibi test işlemlerinizi inceler; onay SMS ve e-posta ile gelir.
11. **Onay geldikten sonra** `.env` içinde `PAYTR_TEST_MODE=false` ve
    `PAYTR_DEBUG_ON=false` yapın, `docker compose up -d` ile yeniden başlatın.
    Bu andan sonra işlemler **gerçek tahsilattır**.

> `PAYTR_TEST_MODE=false`, PayTR canlı mod onayı gelmeden yapılmamalıdır.

---

## 9. Mobil uygulama entegrasyonu (BU DEPODA YOK)

**Kapsam uyarısı:** Bu çalışma alanında mobil uygulama kaynak kodu yoktur.
Doğrulandı: `.gitmodules` yok, tek git remote web deposudur
(`github.com/batucodestr/UberCekici`), depoda React Native / Flutter / Swift /
Kotlin kaynağı bulunmuyor. Dolayısıyla **backend + web tarafı tamamlanmıştır,
mobil entegrasyon yapılmamıştır** — mobil taraf aşağıdaki işleri yapana kadar
müşteri ve sürücü gerçek akışta kartla ödeme yapamaz.

### Gerçek kullanıcı akışında ödeme nereden başlar?

| Akış | Başlangıç noktası | Durum |
|---|---|---|
| Müşteri hizmet ödemesi | Mobil uygulamadaki talep ekranı (teklif kabul edildikten sonra) | **Mobil iş bekliyor** |
| Sürücü paket ödemesi | Mobil uygulamadaki paket satın alma ekranı | **Mobil iş bekliyor** |
| Web | Ödeme başlatan bir ekran YOK; web yönetici panelidir. `/odeme/<token>` yalnızca token ile açılan barındırma sayfasıdır | Tasarım gereği |

### Mobil tarafın yapması gerekenler

**1. Ödeme başlatma** (mevcut JWT ile, `Authorization: Bearer <access>`):

```http
POST /api/payments/paytr/requests/{request_id}/init/     # müşteri
POST /api/payments/paytr/subscription/init/              # sürücü
Body (yalnızca paket için): {"plan": "three_day" | "weekly"}
```

Gövdede **tutar gönderilmez**; sunucu yok sayar.

**2. Yanıttaki adresi WebView'de açma:**

```json
{ "merchant_oid": "SR...", "iframe_token": "...",
  "iframe_url": "https://www.paytr.com/odeme/guvenli/<token>",
  "payment_page_path": "/odeme/<token>", "amount": "1250.50" }
```

İki seçenek:

- **Önerilen:** `https://xn--kurtarcm-ykbb.com.tr` + `payment_page_path`
  adresini WebView'de aç. Bu, sitenin kendi ödeme ekranıdır (marka başlığı,
  3D Secure bilgisi, iframeResizer, güvenli ödeme bandı hazır gelir).
- Alternatif: `iframe_url`'i doğrudan aç (PayTR formu çerçevesiz açılır).

WebView gereksinimleri: JavaScript açık, çerezler açık (3D Secure için),
yeni pencere/yönlendirmelere izin verilmeli (banka 3DS sayfası).

**3. Ödeme sonrası durum yenileme — kritik nokta:**

WebView `/odeme/basarili?oid=...` veya `/odeme/basarisiz?oid=...` adresine
düştüğünde **ödeme tamamlanmış sayılmaz.** Uygulama şu ucu, durum
kesinleşene kadar (2–3 saniye aralıkla, ~30 saniye üst sınırla) sorgulamalıdır:

```http
GET /api/payments/paytr/transactions/{merchant_oid}/
→ { "status": "pending" | "paid" | "failed" | "mismatch", ... }
```

- `paid`  → talebi/paketi yenile ve başarı ekranı göster
  (`GET /api/request/{id}/` → `payment_status=approved`,
  `GET /api/drivers/me/` → `subscription_status=active`)
- `failed` → hata göster, yeniden deneme sun (yeni init çağrısı yeni
  `merchant_oid` üretir; PayTR aynı sipariş numarasının tekrarına izin vermez)
- `pending` → "doğrulanıyor" göster; bildirim gecikebilir
- `mismatch` → "destek ile iletişime geçin" göster (yönetici mutabakatı gerekir)

Alternatif olarak mevcut WebSocket kanalı (`ws/request/{id}/`) kullanılabilir:
ödeme onaylandığında backend `broadcast_request_update` ile güncel talebi
yayınlar.

**4. Başlatma hatalarının karşılanması:** 400 (fiyat kesinleşmemiş / iptal /
zaten ödenmiş), 403 (rol), 404 (başkasının talebi), 502 (PayTR reddi),
503 (mağaza bilgileri tanımsız) — her biri kullanıcıya ayrı mesaj gerektirir.

---

## 10. Bilinen sınırlar

- **İade/iptal**: PayTR'nin iade API'si bu iterasyona dahil edilmedi. İadeler
  şimdilik PayTR panelinden yapılır; `PaymentTransaction.status` için
  `refunded` durumu eklenmedi (mevcut `Payment.Status.REFUNDED` elle
  kullanılabilir).
- **Taksit tablosu**: `PAYTR_MAX_INSTALLMENT=0` ile mağazaya tanımlı en yüksek
  taksit geçerli. Taksitli işlemde `total_amount` daha yüksek gelir; sistem
  bunu kabul eder ve `total_amount` alanına yazar, doğrulamayı `payment_amount`
  üzerinden yapar.
- **BKM Express / EFT**: `payment_type` alanı `eft` değerini de saklar ancak
  mağaza panelinde bu yöntem açıksa ek bir mutabakat kuralı tanımlanmadı.
- **Mobil uygulama**: Bu repoda mobil istemci kodu yok. Uygulamanın yapması
  gereken tek şey başlatma ucunu çağırıp `payment_page_path`'i bir WebView'de
  açmak ve kapanışta talep/paket durumunu yenilemektir.
