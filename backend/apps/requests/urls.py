from django.urls import path

from .views import (
    AcceptRequestView,
    CreateServiceRequestView,
    MyServiceRequestsView,
    OpenServiceRequestsView,
    RateRequestView,
    ServiceRequestDetailView,
    UpdateRequestStatusView,
)

urlpatterns = [
    path("request/", CreateServiceRequestView.as_view(), name="request-create"),
    path("request/mine/", MyServiceRequestsView.as_view(), name="request-mine"),
    path("request/open/", OpenServiceRequestsView.as_view(), name="request-open"),
    path("request/<int:pk>/", ServiceRequestDetailView.as_view(), name="request-detail"),
    path("request/<int:pk>/accept/", AcceptRequestView.as_view(), name="request-accept"),
    path(
        "request/<int:pk>/status/",
        UpdateRequestStatusView.as_view(),
        name="request-status",
    ),
    path("request/<int:pk>/rate/", RateRequestView.as_view(), name="request-rate"),
]
