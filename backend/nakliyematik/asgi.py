"""
ASGI config for nakliyematik project.
"""

import os
import sys

# Python path'e projenin kök dizinini ekleyin
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Django ayarlarını doğru şekilde yapılandırın
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nakliyematik.settings')

# Django içe aktarmalarını buradan sonra yapın
import django
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from transportation.middleware import WebSocketTokenAuthMiddleware
import transportation.routing

# Uygulama yapılandırması
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": WebSocketTokenAuthMiddleware(
        URLRouter(
            transportation.routing.websocket_urlpatterns
        )
    ),
})
