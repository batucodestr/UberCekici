import os
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent
LOG_DIR = Path(config("LOG_DIR", default=str(BASE_DIR / "logs")))
os.makedirs(LOG_DIR, exist_ok=True)

SECRET_KEY = config("DJANGO_SECRET_KEY", default="insecure-dev-key-change-me")
DEBUG = config("DEBUG", default=False, cast=bool)
# Tarayıcı Host başlığını punycode gönderir; Unicode biçimler de kabul edilir.
_EXTRA_HOSTS = (
    "kurtaricim.com.tr",
    "www.kurtaricim.com.tr",
    "api.kurtaricim.com.tr",
    "kurtarıcım.com.tr",
    "www.kurtarıcım.com.tr",
    "api.kurtarıcım.com.tr",
    "xn--kurtarcm-ykbb.com.tr",
    "www.xn--kurtarcm-ykbb.com.tr",
    "api.xn--kurtarcm-ykbb.com.tr",
    "93.88.201.163",
)
ALLOWED_HOSTS = list(
    dict.fromkeys(
        [
            *config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv()),
            *_EXTRA_HOSTS,
        ]
    )
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_celery_beat",
    "channels",
    "drf_spectacular",
    "apps.common",
    "apps.users",
    "apps.customers",
    "apps.drivers",
    "apps.requests",
    "apps.pricing",
    "apps.payments",
    "apps.notifications",
    "apps.analytics",
    "apps.support",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.analytics.middleware.AuditLogMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("POSTGRES_DB", default="cekicim"),
        "USER": config("POSTGRES_USER", default="cekicim"),
        "PASSWORD": config("POSTGRES_PASSWORD", default="cekicim"),
        "HOST": config("POSTGRES_HOST", default="db"),
        "PORT": config("POSTGRES_PORT", default="5432"),
    }
}

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "tr"
TIME_ZONE = "Europe/Istanbul"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Redis / Celery ---
REDIS_URL = config("REDIS_URL", default="redis://redis:6379/0")
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    }
}

# --- DRF / JWT ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "180/min",
        "auth": "10/min",
        "support": "20/min",
        # Ödeme başlatma her çağrıda PayTR'ye dış istek yapar; token
        # üretimini kötüye kullanmayı sınırlar. PayTR'nin bildirim ucu
        # (callback) bilinçli olarak throttle DIŞINDADIR — aksi halde
        # yoğun saatte gerçek ödeme bildirimleri 429 ile reddedilirdi.
        "payment": "20/min",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "SIGNING_KEY": config("JWT_SECRET", default=SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_CLAIM": "user_id",
}

# The refresh token is delivered as an HttpOnly cookie (see apps.users.views) rather
# than in the JSON body, so it can't be read or exfiltrated by client-side JS (XSS).
REFRESH_COOKIE_NAME = "refresh_token"

SPECTACULAR_SETTINGS = {
    "TITLE": "Kurtarıcım API",
    "DESCRIPTION": "Çekici çağırma platformu REST API",
    "VERSION": "1.0.0",
}

_EXTRA_ORIGINS = (
    "https://kurtaricim.com.tr",
    "https://www.kurtaricim.com.tr",
    "https://api.kurtaricim.com.tr",
    "https://kurtarıcım.com.tr",
    "https://www.kurtarıcım.com.tr",
    "https://api.kurtarıcım.com.tr",
    "https://xn--kurtarcm-ykbb.com.tr",
    "https://www.xn--kurtarcm-ykbb.com.tr",
    "https://api.xn--kurtarcm-ykbb.com.tr",
    "https://93.88.201.163",
)
CORS_ALLOWED_ORIGINS = list(
    dict.fromkeys(
        [
            *config("CORS_ALLOWED_ORIGINS", default="http://localhost:5173", cast=Csv()),
            *_EXTRA_ORIGINS,
        ]
    )
)
CORS_ALLOW_CREDENTIALS = True

OSRM_URL = config("OSRM_URL", default="http://osrm:5000")
NOMINATIM_URL = config("NOMINATIM_URL", default="https://nominatim.openstreetmap.org")
GOOGLE_MAPS_API_KEY = config("GOOGLE_MAPS_API_KEY", default="")

# --- PayTR iFrame API ---
# Mağaza sırları YALNIZCA ortam değişkenlerinden okunur; repoda gerçek değer
# tutulmaz (bkz. .env.example ve docs/paytr-entegrasyonu.md). Değerler PayTR
# Mağaza Paneli > Destek & Kurulum > Entegrasyon Bilgileri altındadır.
PAYTR_MERCHANT_ID = config("PAYTR_MERCHANT_ID", default="")
PAYTR_MERCHANT_KEY = config("PAYTR_MERCHANT_KEY", default="")
PAYTR_MERCHANT_SALT = config("PAYTR_MERCHANT_SALT", default="")

# Resmî uçlar (dokümantasyonda sabit). Normalde değiştirilmez.
PAYTR_TOKEN_URL = config("PAYTR_TOKEN_URL", default="https://www.paytr.com/odeme/api/get-token")
PAYTR_IFRAME_URL_TEMPLATE = config(
    "PAYTR_IFRAME_URL_TEMPLATE", default="https://www.paytr.com/odeme/guvenli/{token}"
)

# Ödeme sonrası kullanıcının döndüğü sayfalar. PayTR bu sayfalara veri POST
# ETMEZ; ödeme kanıtı değildirler, yalnızca bilgilendirme ekranıdır.
#
# ALAN ADI SEÇİMİ — varsayılan bilinçli olarak PUNYCODE biçimidir:
# siteyi fiilen sunan alan adı kurtarıcım.com.tr'dir ve DNS'te yalnızca onun
# punycode karşılığı (xn--kurtarcm-ykbb.com.tr) bu sunucuya işaret eder.
# ASCII "kurtaricim.com.tr" şu an BAŞKA bir IP'ye çözümlenmektedir; oraya
# yönlendirme yapılırsa müşteri ödeme sonrası erişilemeyen bir sayfaya düşer.
# Punycode ayrıca PayTR panelindeki URL alanları ve HTTP başlıkları için
# güvenlidir (tarayıcı Host/Origin başlığını da punycode gönderir).
# ASCII alan adı ileride bu sunucuya yönlendirilirse SITE_BASE_URL ortam
# değişkeniyle değiştirilebilir.
SITE_BASE_URL = config("SITE_BASE_URL", default="https://xn--kurtarcm-ykbb.com.tr").rstrip("/")
PAYTR_MERCHANT_OK_URL = config(
    "PAYTR_MERCHANT_OK_URL", default=f"{SITE_BASE_URL}/odeme/basarili"
)
PAYTR_MERCHANT_FAIL_URL = config(
    "PAYTR_MERCHANT_FAIL_URL", default=f"{SITE_BASE_URL}/odeme/basarisiz"
)

# Canlı moda geçmeden önce 1 kalır (bkz. docs/paytr-entegrasyonu.md).
PAYTR_TEST_MODE = config("PAYTR_TEST_MODE", default=True, cast=bool)
# debug_on=1 PayTR'nin hata nedenini açık döndürür; canlıda kapatılır.
PAYTR_DEBUG_ON = config("PAYTR_DEBUG_ON", default=False, cast=bool)
PAYTR_TIMEOUT_LIMIT = config("PAYTR_TIMEOUT_LIMIT", default=30, cast=int)
# no_installment=1 taksit seçeneklerini tamamen kapatır.
PAYTR_NO_INSTALLMENT = config("PAYTR_NO_INSTALLMENT", default=0, cast=int)
# 0 = mağazaya tanımlı en yüksek taksit; 2..12 arası sabitlenebilir.
PAYTR_MAX_INSTALLMENT = config("PAYTR_MAX_INSTALLMENT", default=0, cast=int)
PAYTR_CURRENCY = config("PAYTR_CURRENCY", default="TL")
PAYTR_REQUEST_TIMEOUT = config("PAYTR_REQUEST_TIMEOUT", default=20, cast=int)
# Alınan token'ın iFrame'de kullanılabilir kabul edildiği süre (dakika).
# Aynı siparişe ait bekleyen bir ödeme bu süre içinde yeniden kullanılır,
# böylece her tıklamada PayTR'ye yeni token isteği gitmez.
PAYTR_TOKEN_TTL_MINUTES = config("PAYTR_TOKEN_TTL_MINUTES", default=30, cast=int)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# --- Production security hardening ---
# Off by default so local/dev setups without a trusted TLS cert in front of Caddy
# keep working unchanged; set SITE_USES_HTTPS=true once deployed behind real HTTPS.
SITE_USES_HTTPS = config("SITE_USES_HTTPS", default=False, cast=bool)

SESSION_COOKIE_SECURE = SITE_USES_HTTPS
CSRF_COOKIE_SECURE = SITE_USES_HTTPS
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 31536000 if SITE_USES_HTTPS else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = SITE_USES_HTTPS
SECURE_HSTS_PRELOAD = SITE_USES_HTTPS
SECURE_CONTENT_TYPE_NOSNIFF = True

CSRF_TRUSTED_ORIGINS = list(
    dict.fromkeys(
        [
            *config(
                "CSRF_TRUSTED_ORIGINS",
                default="http://localhost,http://localhost:5173",
                cast=Csv(),
            ),
            *_EXTRA_ORIGINS,
        ]
    )
)

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# --- Logging ---
# Rotating file handlers so a busy production log can't fill the disk; each
# process (gunicorn, daphne, celery worker/beat) writes into the same shared
# backend_logs volume (see docker-compose.yml) under its own file.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(asctime)s %(levelname)s %(name)s %(process)d %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "app_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOG_DIR / "app.log",
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
        },
        "error_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOG_DIR / "error.log",
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
            "level": "ERROR",
        },
        "security_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOG_DIR / "security.log",
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
        },
        "celery_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOG_DIR / "celery.log",
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console", "app_file"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console", "app_file", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console", "security_file", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console", "error_file"],
            "level": "ERROR",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console", "celery_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
