from django.urls import path

from .views import MySupportTicketDetailView, MySupportTicketListCreateView

urlpatterns = [
    path(
        "support/tickets/",
        MySupportTicketListCreateView.as_view(),
        name="support-tickets-mine",
    ),
    path(
        "support/tickets/<int:pk>/",
        MySupportTicketDetailView.as_view(),
        name="support-ticket-detail",
    ),
]
