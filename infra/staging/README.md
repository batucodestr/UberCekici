# Staging — Gerçek PayTR Test Ödemesi Ortamı

Bu dizin, **üretime hiç dokunmadan** gerçek PayTR test ödemesi yapabilmek için
ayrı bir ortam kurar.

| Dosya | Ne işe yarar |
|---|---|
| `docker-compose.staging.yml` | İzole stack (ayrı DB/redis/volume, `edge` ağına katılmaz, port yalnızca 127.0.0.1) |
| `.env.staging.example` | Ortam değişkeni şablonu — kopyalayıp `.env.staging` yapın |
| `staging-nginx.conf` | Tek giriş noktası: `/api` → backend, geri kalan → SPA |
| `verify_callback_url.sh` | **Panele adres girmeden önce** callback URL'sini doğrular |
| `set_paytr_keys.sh` | Mağaza bilgilerini gizli girdiyle (ekrana/loga/geçmişe yazmadan) `.env.staging`'e yazar |
| `real_paytr_test.sh` | Gerçek PayTR test ödemesini sürer; test modu kapalıysa ÇALIŞMAYI REDDEDER |
| `mock_paytr.py` | Sahte PayTR sunucusu (gerçek PayTR'siz uçtan uca test) |
| `e2e_mock_payment.sh` | Sahte PayTR ile tam akış testi |

---

## A. Gerçek PayTR'siz uçtan uca test (kimlik bilgisi gerekmez)

Hiçbir dış bağımlılığı yoktur, saniyeler sürer, üretime dokunmaz:

```bash
bash infra/staging/e2e_mock_payment.sh
```

Doğruladığı zincir: ödeme başlatma → **imzanın bağımsız bir uygulama
tarafından doğrulanması** → token → iFrame sayfası → imzalı bildirim →
siparişin güncellenmesi → yinelenen bildirimin yok sayılması. Ayrıca geçersiz
imza, tutar uyuşmazlığı ve başarısız ödeme senaryolarını da sürer.

> Bu test **gerçek PayTR sunucusuna bağlanmaz.** Kart işlemez, 3D Secure
> yapmaz, para hareketi oluşturmaz. Protokol uyumluluğunu ve kendi
> uçlarımızın davranışını kanıtlar; gerçek entegrasyonun yerini tutmaz.

---

## B. Gerçek PayTR test ödemesi

### Ön koşullar

1. **Mağaza bilgileri** — PayTR Paneli → Destek & Kurulum → Entegrasyon
   Bilgileri → *API Entegrasyon Bilgileri* (Mağaza No / Mağaza Parola /
   Mağaza Gizli Anahtar). Yalnızca Ana Kullanıcı ve Teknik Kullanıcı görür.
2. **Dışarıdan erişilebilir HTTPS adresi** — PayTR bildirimi kendi
   sunucusundan POST eder; `localhost` çalışmaz.
3. PayTR panelinde **Bildirim URL**'sinin tanımlı olması.

### 1. Ortam dosyasını hazırlayın

```bash
cp infra/staging/.env.staging.example infra/staging/.env.staging
# DJANGO_SECRET_KEY / JWT_SECRET / POSTGRES_PASSWORD için rastgele değerler üretin.
```

Mağaza bilgilerini **komut satırına yazmayın**; gizli girdiyle alan betiği kullanın:

```bash
bash infra/staging/set_paytr_keys.sh
```

Betik değerleri ekrana basmaz, kabuk geçmişine düşürmez, dosyayı 600 izniyle
yazar. `.env.staging` `.gitignore`'dadır.

`PAYTR_TEST_MODE=true` bırakın — gerçek para hareketi olmaz.

### 2. Stack'i ayağa kaldırın

```bash
docker compose -p ubercekici-staging \
  --env-file infra/staging/.env.staging \
  -f infra/staging/docker-compose.staging.yml up -d --build
```

Üretim container'ları etkilenmez: ayrı proje adı, ayrı ağ, ayrı volume'ler.

### 3. Dışarıya HTTPS ile açın (tünel)

Gerçek Caddy'ye ve DNS'e dokunmadan geçici bir genel adres:

```bash
# Cloudflare hızlı tüneli — hesap gerektirmez, rastgele bir https adres verir
docker run --rm --network ubercekici-staging-net \
  cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://edge:80
```

Çıktıdaki `https://<rastgele>.trycloudflare.com` adresini alın.

> Alternatif: kalıcı bir `staging.alan-adiniz.com` alt alan adı. O durumda
> DNS + sertifika sizin sorumluluğunuzdadır ve gerçek Caddy'ye dokunmak
> gerekebilir — tünel bunu gerektirmez.

### 4. Tünel adresini ortama yazın ve yeniden başlatın

`.env.staging` içinde `STAGING_HOST`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`,
`CSRF_TRUSTED_ORIGINS` ve `SITE_BASE_URL` alanlarını tünel adresiyle
güncelleyin, sonra:

```bash
docker compose -p ubercekici-staging \
  --env-file infra/staging/.env.staging \
  -f infra/staging/docker-compose.staging.yml up -d
```

### 5. Adresi DOĞRULAYIN (panele girmeden önce)

```bash
bash infra/staging/verify_callback_url.sh https://<rastgele>.trycloudflare.com
```

Hepsi yeşil olmadan 6. adıma geçmeyin. Betik DNS, TLS, erişilebilirlik,
POST kabulü, bot koruması ve yönlendirme kontrollerini yapar; geçersiz imzalı
bir sonda isteği göndererek ucun ayakta olduğunu kanıtlar (hiçbir siparişi
değiştirmez).

### 6. PayTR panelinde Bildirim URL'si

```
https://<rastgele>.trycloudflare.com/api/payments/paytr/callback/
```

> Tünel adresi her yeniden başlatmada **değişir**. Panelde tek bir Bildirim
> URL alanı varsa, her oturumda güncellemeniz gerekir. Uzun süreli test için
> kalıcı bir alt alan adı daha pratiktir.

### 7. Test verisi oluşturun

```bash
docker compose -p ubercekici-staging -f infra/staging/docker-compose.staging.yml \
  exec backend python manage.py shell -c "
from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.pricing.models import ServiceType, VehicleType
from apps.requests.models import ServiceRequest
U = get_user_model()
u, _ = U.objects.get_or_create(username='test_musteri', defaults={
    'email':'test@ornek.com','role':'customer','first_name':'Test','last_name':'Musteri',
    'phone_number':'05555555555'})
u.set_password('TestParola123!'); u.save()
v, _ = VehicleType.objects.get_or_create(name='Otomobil', defaults={'price_multiplier':1})
s, _ = ServiceType.objects.get_or_create(name=ServiceType.Kind.TOWING, defaults={'recovery_multiplier':1})
sr = ServiceRequest.objects.create(customer=u, vehicle_type=v, service_type=s,
    pickup_lat=38.46, pickup_lng=27.21, pickup_address='Bayrakli/Izmir',
    dropoff_lat=38.42, dropoff_lng=27.14, price=Decimal('10.00'),
    status=ServiceRequest.Status.ACCEPTED)
print('TALEP ID:', sr.id)
"
```

> Tutarı küçük tutun (ör. 10 ₺). Test modunda para hareketi olmaz, ancak
> küçük tutar panel kayıtlarını okumayı kolaylaştırır.

### 8. Ödemeyi başlatın ve iFrame'i açın

En pratik yol tek komut:

```bash
bash infra/staging/real_paytr_test.sh
```

Betik önce ön koşulları denetler (stack ayakta mı, anahtarlar dolu mu,
**test modu açık mı**, hedef gerçek PayTR ucu mu, callback dışarıdan
erişilebilir mi), sonra test talebini oluşturup gerçek PayTR'den token ister
ve açmanız gereken ödeme ekranı adresini yazdırır. Ödemeyi tamamladıktan
sonra:

```bash
bash infra/staging/real_paytr_test.sh --verify
```

Bu aşama işlem durumunu, sipariş durumunu, `Payment` kaydını ve **yinelenen
bildirim** davranışını doğrular.

> `PAYTR_TEST_MODE=false` ise betik hiçbir şey yapmadan durur — canlı
> tahsilatın kazara başlatılması engellenir.

<details>
<summary>Elle yapmak isterseniz (betiğin yaptığı adımlar)</summary>

```bash
BASE=https://<rastgele>.trycloudflare.com
TOKEN=$(curl -s -X POST $BASE/api/auth/login/ -H 'Content-Type: application/json' \
  -d '{"username":"test_musteri","password":"TestParola123!"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access"])')

curl -s -X POST $BASE/api/payments/paytr/requests/<TALEP_ID>/init/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Yanıttaki `payment_page_path` değerini tarayıcıda açın:
`https://<rastgele>.trycloudflare.com/odeme/<token>`

PayTR ödeme sayfasında **test kartları hazır gelir** — kart bilgisi
girmeniz gerekmez. 3D Secure test adımını tamamlayın.

### 9. Sonucu doğrulayın

```bash
# Doğrulanmış ödeme durumu (sunucudan)
curl -s $BASE/api/payments/paytr/transactions/<merchant_oid>/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Bildirimin ulaştığını logdan görün
docker compose -p ubercekici-staging -f infra/staging/docker-compose.staging.yml \
  logs backend | grep -i paytr | tail -20
```

</details>

Beklenen: `status: "paid"`, talepte `payment_status=approved`,
`payment_method=card`. Başarısız test için PayTR formunda işlemi iptal edin —
beklenen: `status: "failed"`, talep `unpaid` kalır.

PayTR panelinde **İşlemler** sayfasından, testte kullandığınız e-posta ile
arayarak işlemi görebilirsiniz.

### 10. Ortamı kapatın

```bash
docker compose -p ubercekici-staging \
  -f infra/staging/docker-compose.staging.yml down -v   # -v: staging verisini de siler
```

---

## Sorun giderme

| Belirti | Olası neden |
|---|---|
| Bildirim hiç gelmiyor | Panelde Bildirim URL tanımsız/yanlış, tünel kapanmış, adres HTTPS değil |
| `bad hash` dönüyor | `.env.staging`'deki `PAYTR_MERCHANT_KEY`/`SALT` panelden farklı |
| `400 DisallowedHost` | Tünel adresi `ALLOWED_HOSTS`'ta yok; **alan adında alt çizgi olmamalı** |
| Ödeme ekranı boş | CSP `frame-src`/`script-src` izni yok (tünelde nginx CSP göndermediği için staging'de çıkmaz; üretimde Caddy'ye eklenmeli) |
| `503` | `PAYTR_MERCHANT_*` boş |
| `400 "sürücü atandıktan ... sonra"` | Talep `accepted`/`driver_found` değil — fiyat kesinleşmemiş |
