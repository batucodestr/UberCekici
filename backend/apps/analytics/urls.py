from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.drivers.views import AdminDriverViewSet
from apps.requests.views import AdminServiceRequestViewSet
from apps.users.views import AdminUserViewSet

from .views import AuditLogListView, DashboardStatsView

router = DefaultRouter()
router.register("users", AdminUserViewSet, basename="admin-user")
router.register("drivers", AdminDriverViewSet, basename="admin-driver")
router.register("requests", AdminServiceRequestViewSet, basename="admin-request")

urlpatterns = [
    path("dashboard/", DashboardStatsView.as_view(), name="admin-dashboard"),
    path("audit-logs/", AuditLogListView.as_view(), name="admin-audit-logs"),
    path("", include(router.urls)),
]
