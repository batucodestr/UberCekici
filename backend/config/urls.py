from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

urlpatterns = [
    # Django'nun yerleşik admin sitesi artık yalnızca arka uç referansı için
    # tutuluyor — gerçek yönetim paneli React'te /admin/dashboard altında.
    # Frontend'in /admin/* route'larıyla çakışmaması için ayrı bir path'te.
    path("django-admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/auth/", include("apps.users.urls")),
    path("api/", include("apps.customers.urls")),
    path("api/", include("apps.drivers.urls")),
    path("api/", include("apps.requests.urls")),
    path("api/", include("apps.pricing.urls")),
    path("api/", include("apps.payments.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/admin/", include("apps.analytics.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
