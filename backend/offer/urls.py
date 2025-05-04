from django.urls import path
from .views import OfferViewSet

# ViewSet tabanlı API görünümleri
offer_list = OfferViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

offer_detail = OfferViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})

# Özel eylemler
offer_my = OfferViewSet.as_view({'get': 'my_offers'})
offer_received = OfferViewSet.as_view({'get': 'received_offers'})
offer_pending = OfferViewSet.as_view({'get': 'pending_offers'})
offer_accept = OfferViewSet.as_view({'post': 'accept'})
offer_reject = OfferViewSet.as_view({'post': 'reject'})
offer_cancel = OfferViewSet.as_view({'post': 'cancel'})
offer_withdraw = OfferViewSet.as_view({'post': 'withdraw'})
offer_for_transportation = OfferViewSet.as_view({'get': 'offers_for_transportation'})
offer_for_cargo_post = OfferViewSet.as_view({'get': 'offers_for_cargo_post'})

offer_my_count = OfferViewSet.as_view({'get': 'my_offers_count'})
offer_received_count = OfferViewSet.as_view({'get': 'received_offers_count'})

urlpatterns = [
    # Temel CRUD işlemleri
    path('', offer_list, name='offer-list'),
    path('<int:pk>/', offer_detail, name='offer-detail'),
    
    # Özel eylemler için URL'ler
    path('my/', offer_my, name='offer-my'),
    path('received/', offer_received, name='offer-received'),
    path('pending/', offer_pending, name='offer-pending'),
    path('<int:pk>/accept/', offer_accept, name='offer-accept'),
    path('<int:pk>/reject/', offer_reject, name='offer-reject'),
    path('<int:pk>/cancel/', offer_cancel, name='offer-cancel'),
    path('<int:pk>/withdraw/', offer_withdraw, name='offer-withdraw'),  # YENİ: Geri çekme endpoint'i
    path('transportation/<int:transportation_id>/', offer_for_transportation, name='offers-for-transportation'),  # YENİ
    path('cargo-post/<int:cargo_post_id>/', offer_for_cargo_post, name='offers-for-cargo-post'),  # YENİ

    # Yeni count API'leri
    path('my/count/', offer_my_count, name='offer-my-count'),
    path('received/count/', offer_received_count, name='offer-received-count'),
]