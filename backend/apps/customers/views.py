from rest_framework import generics, permissions

from apps.common.permissions import IsCustomer

from .models import Customer
from .serializers import CustomerSerializer


class MyCustomerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = (permissions.IsAuthenticated, IsCustomer)

    def get_object(self):
        return Customer.objects.select_related("user").get(user=self.request.user)
