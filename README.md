# Uber Çekici

7/24 çekici ve yol yardım platformu. Django REST Framework + React/TypeScript ile geliştirilmiş, Docker Compose ile tek komutla ayağa kalkan bir MVP iskeleti.

## Mimarî

- **Backend:** Django 5, DRF, Simple JWT, Channels (WebSocket), Celery + Celery Beat, PostgreSQL, Redis
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, React Query, Zustand, React Router, Leaflet, Framer Motion
- **Altyapı:** Docker Compose, Caddy (reverse proxy + HTTPS hazırlığı + Brotli/Gzip), Gunicorn, Daphne

## Hızlı Başlangıç

```bash
cp .env.example .env   # veya repoda hazır gelen .env dosyasını kullanın
docker compose up -d --build
```

Servisler ayağa kalktıktan sonra:

- Uygulama: http://localhost
- Yönetici Paneli (React): http://localhost/admin/dashboard
- Django Admin (yalnızca arka uç referansı): http://localhost/django-admin
- API dokümantasyonu (Swagger): http://localhost/api/docs/

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

- React tarafında tam CRUD/export/bulk-action'lı "Modern Admin Panel" (şu an Django Admin + basit React özet dashboard var)
- GeoDjango/OSRM/Nominatim canlı entegrasyonu (şu an düz PostgreSQL + kuş uçuşu mesafe hesaplama; OSRM_URL/NOMINATIM_URL değişkenleri hazır, entegrasyon noktaları `apps/pricing/services.py` ve `NewRequestPage.tsx`)
- Şehir bazlı SEO sayfaları ve schema.org markup
- Sürücü belge onay akışı için dosya yükleme arayüzü (model hazır, UI eksik)
- Kapsamlı test kapsamı (temel örnek testler var, tam kapsam yok)

Bu parçalar istenirse ayrı iterasyonlarda eklenebilir.
