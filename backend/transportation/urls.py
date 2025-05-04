from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransportationViewSet, get_websocket_token, LocationHistoryViewSet, reverse_geocode

router = DefaultRouter()
# Önek kaldırıldı - "transportations" yerine boş string
router.register('', TransportationViewSet, basename='transportation')

# ViewSet için yeni bir URL tanımlayın
transportation_location = TransportationViewSet.as_view({
    'get': 'location_data'
})

urlpatterns = [
    # WebSocket token endpoint'i - boş önekle uyumlu
    path('<int:pk>/websocket-token/', 
         get_websocket_token, 
         name='transportation-websocket-token'),
    
    # Konum geçmişi endpoint'i - boş önekle uyumlu
    path('<int:transportation_id>/locations/', 
         LocationHistoryViewSet.as_view({'get': 'list'}), 
         name='location-history'),
    
    path('geocode-location/', reverse_geocode, name='reverse-geocode'),
    
    # Yeni URL pattern'i ekleyin
    path('<int:pk>/location/', transportation_location, name='transportation-location'),
    
    # Router'ı içeri aktar
    path('', include(router.urls)),
]