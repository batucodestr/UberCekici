from django.urls import path

from .views import (
    AcceptOfferView,
    AcceptRequestView,
    CreateServiceRequestView,
    GeocodeView,
    MyServiceRequestsView,
    OpenServiceRequestsView,
    RateRequestView,
    RejectOfferView,
    RequestOffersView,
    ServiceRequestDetailView,
    UpdateRequestStatusView,
)

urlpatterns = [
    path("geocode/", GeocodeView.as_view(), name="geocode"),
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
    path("requests/<int:pk>/offers/", RequestOffersView.as_view(), name="request-offers"),
    path("offers/<int:pk>/accept/", AcceptOfferView.as_view(), name="offer-accept"),
    path("offers/<int:pk>/reject/", RejectOfferView.as_view(), name="offer-reject"),
]
