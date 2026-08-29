from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PriceRuleViewSet, QuoteView, ServiceTypeViewSet, VehicleTypeViewSet

router = DefaultRouter()
router.register("vehicle-types", VehicleTypeViewSet, basename="vehicle-type")
router.register("service-types", ServiceTypeViewSet, basename="service-type")
router.register("price-rules", PriceRuleViewSet, basename="price-rule")

urlpatterns = [
    path("quote/", QuoteView.as_view(), name="quote"),
    path("", include(router.urls)),
]
