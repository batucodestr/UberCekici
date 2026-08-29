from rest_framework import permissions, viewsets

from apps.common.permissions import IsAdminRole

from .models import Payment
from .serializers import PaymentSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdminRole()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()
        user = self.request.user
        base = Payment.objects.select_related("service_request")
        if user.role == "admin":
            return base
        if user.role == "driver":
            return base.filter(service_request__driver=user)
        return base.filter(service_request__customer=user)
