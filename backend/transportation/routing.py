# backend/transportation/routing.py

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/transportation/(?P<transportation_id>\d+)/$', consumers.TransportationConsumer.as_asgi()),
]