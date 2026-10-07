# Uber Çekici

7/24 çekici ve yol yardım platformu. Django REST Framework + React/TypeScript ile geliştirilmiş, Docker Compose ile tek komutla ayağa kalkan bir MVP iskeleti.

## Bu Site = Yönetici Kontrol Paneli

Müşteri çağırma ve müşteri işlemleri **mobil uygulamada** yürütülür. Bu repodaki web arayüzü tamamen **yönetici/admin kontrol panelidir**:

- İlk ekran giriştir (`/giris`) ve yalnızca `admin` rolündeki hesaplar panele girebilir. Doğru şifreyle giren müşteri/sürücü hesabının oturumu anında kapatılır ve uyarı gösterilir.
- Panel `/admin` altındadır: Dashboard, **Şikayet & İstek**, Talepler, Çekiciler, Kullanıcılar, Fiyat Kuralları, Sistem Logları, Hesabım.
- Web'de müşteri/sürücü ekranı ve kayıt formu yoktur. `POST /api/auth/register/` ve müşteri/sürücü API uçları mobil uygulama için açık kalmıştır.
- Herkese açık kalan tek içerik yasal metinlerdir (`/kvkk`, `/gizlilik-sozlesmesi`, `/kullanim-sartlari`) — mobil uygulama ve uygulama mağazası bağlantıları bunlara ihtiyaç duyar.

### Şikayet & İstek Modülü (`apps.support`)

Mobil uygulamadan gelen şikayet/istek/öneri kayıtları panele düşer.

| Uç | Kim | Açıklama |
|---|---|---|
| `POST /api/support/tickets/` | müşteri/sürücü (mobil) | Yeni şikayet/istek açar; iletişim bilgisi boş bırakılırsa hesaptan doldurulur |
| `GET /api/support/tickets/` | müşteri/sürücü (mobil) | Kendi kayıtlarını ve yöneticinin yazdığı yanıtı listeler |
| `GET /api/support/tickets/{id}/` | müşteri/sürücü (mobil) | Tek kayıt |
| `GET/POST/PATCH/DELETE /api/admin/tickets/` | yalnızca admin | Panel yönetimi (durum, öncelik, atama, iç not, müşteriye yanıt) |
| `GET /api/admin/tickets/stats/` | yalnızca admin | Açık/yeni/acil/bugün sayaçları |

Yeni kayıt açıldığında tüm yöneticilere `Notification` (kategori: `support`) düşer ve mevcut bildirim WebSocket'i üzerinden anlık iletilir. Yönetici "Müşteriye Yanıt" alanını doldurduğunda kaydı açan kullanıcıya bildirim gider; durum `Çözüldü`/`Reddedildi` olduğunda kapanış zamanı ve kapatan yönetici kaydedilir. Telefonla gelen şikayetler için panelden de kayıt açılabilir (`source=panel`).

## Mimarî

- **Backend:** Django 5, DRF, Simple JWT, Channels (WebSocket), Celery + Celery Beat, PostgreSQL, Redis
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, React Query, Zustand, React Router, Leaflet, Framer Motion
- **Altyapı:** Docker Compose, Caddy (reverse proxy + HTTPS hazırlığı + Brotli/Gzip), Gunicorn, Daphne

## Hızlı Başlangıç (yerel/dev)

```bash
cp .env.example .env   # veya repoda hazır gelen .env dosyasını kullanın
docker compose --profile standalone up -d --build
```

`--profile standalone` projenin kendi Caddy'sini de (80/443, otomatik HTTPS) ayağa kaldırır. Servisler ayağa kalktıktan sonra:

- Yönetici Paneli (React): http://localhost/admin (giriş: http://localhost/giris)
- Django Admin (yalnızca arka uç referansı): http://localhost/django-admin
- API dokümantasyonu (Swagger): http://localhost/api/docs/

## Production Deployment (bu VPS)

Bu VPS'te 80/443 zaten `/opt/trugc` altındaki **paylaşılan edge Caddy** tarafından kullanılıyor (aynı Caddy, `batucodes.com`'u da proxy'liyor). Bu yüzden production'da **profilsiz** kaldırılır — kendi Caddy'miz çalışmaz, `backend`/`websocket`/`frontend`/`static` container'ları `edge` adlı external Docker network'üne katılır ve paylaşılan Caddy onları isimleriyle (`ubercekici-backend` vb.) proxy'ler:

```bash
docker compose up -d --build
```

İlgili dosyalar:

- `docker-compose.yml` — varsayılan (profilsiz) mod = edge-entegre; `--profile standalone` = kendi Caddy'siyle bağımsız mod.
- `infra/caddy/kurtaricim.com.tr.caddy` — paylaşılan Caddy'ye eklenen site bloğunun repodaki referans kopyası (konteynerler tarafından okunmaz; gerçek dosya bu VPS'te `/opt/trugc/Caddyfile`).
- `infra/nginx/static.conf` — `static` servisinin `/static` ve `/media`'yı `edge` ağı üzerinden paylaşılan Caddy'ye açan nginx konfigürasyonu.

İlk deploy sonrası (RUN_SEED=false olduğu için demo hesaplar oluşmaz):

```bash
docker compose exec backend python manage.py createsuperuser
```

Paylaşılan Caddy'ye eklenen `xn--kurtarcm-ykbb.com.tr` (kurtarıcım.com.tr) bloğunun aktif olması için (zero-downtime, container yeniden başlamaz):

```bash
docker exec trugc-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

`RUN_SEED=true` olduğunda backend ilk açılışta örnek verileri otomatik oluşturur:

| Rol | Kullanıcı | Şifre |
|---|---|---|
| Admin | `admin` | `Admin123!` |
| Sürücü | `surucu1` .. `surucu20` | `Surucu123!` |
| Müşteri | `musteri1` .. `musteri50` | `Musteri123!` |

## Servisler (docker-compose)

| Servis | Açıklama |
|---|---|
| `db` | PostgreSQL (PostGIS tabanlı imaj, ileride GeoDjango'ya geçişe hazır) |
| `redis` | Cache, Celery broker, rate limit |
| `backend` | Gunicorn ile DRF API (`/api`, `/admin`) |
| `websocket` | Daphne ile Channels ASGI sunucusu (`/ws/...`) |
| `celery` | Arka plan görevleri (sürücü eşleştirme, bildirim, timeout kontrolü) |
| `celery-beat` | Periyodik görev zamanlayıcı |
| `frontend` | Vite build çıktısının Nginx ile servisi |
| `caddy` | Tek giriş noktası: reverse proxy, HTTPS, statik/medya dosyaları |

## Roller ve Yetkilendirme

Sistemde üç rol vardır: `customer`, `driver`, `admin`. Rol, JWT içinde taşınır ve backend tarafında `IsCustomer` / `IsDriver` / `IsAdminRole` izin sınıflarıyla zorunlu kılınır. Admin hesapları kayıt formundan oluşturulamaz; yalnızca `seed_data` komutu veya `createsuperuser` ile açılır.

## Geliştirme Ortamı

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

Testler:

```bash
pytest
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Testler:

```bash
npm run test
```

## Fiyat Motoru

`apps/pricing/services.py` içindeki `calculate_price` fonksiyonu:

```
Toplam = Açılış Ücreti + KM Katsayısı + Gece Ücreti + Kurtarma Katsayısı + Araç Katsayısı
```

Kurallar (`PriceRule`), araç tipi çarpanları (`VehicleType`) ve hizmet kurtarma çarpanları (`ServiceType`) Django Admin veya `/api/price-rules/`, `/api/vehicle-types/`, `/api/service-types/` uçlarından yönetilir.

## WebSocket Uçları

```
ws/request/{id}/?token=<access>   → sipariş durumu canlı takip
ws/driver/location/?token=<access> → sürücüye özel bildirimler
ws/admin/live/?token=<access>      → admin canlı harita ve sipariş akışı
```

## Bu MVP'de Kapsam Dışı Bırakılanlar (Sonraki İterasyon)

Kapsam net biçimde büyük olduğu için bu ilk teslimat sağlam ve çalışır bir **iskelete** odaklanır. Aşağıdakiler bilinçli olarak sona bırakıldı:

- GeoDjango/OSRM/Nominatim canlı entegrasyonu (şu an düz PostgreSQL + kuş uçuşu mesafe hesaplama; OSRM_URL/NOMINATIM_URL değişkenleri hazır, entegrasyon noktaları `apps/pricing/services.py` ve `NewRequestPage.tsx`)
- Şehir bazlı SEO sayfaları ve schema.org markup
- Sürücü belge onay akışı için dosya yükleme arayüzü (model hazır, UI eksik)
- Kapsamlı test kapsamı (temel örnek testler var, tam kapsam yok)

Bu parçalar istenirse ayrı iterasyonlarda eklenebilir.
