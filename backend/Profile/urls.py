from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProfileViewSet, CargoOwnerRegisterView, TransporterRegisterView, 
    get_user_data, CargoOwnerViewSet, TransporterViewSet,
    # Add these new views
    cargo_owner_profile_view, transporter_profile_view,
    cargo_owner_ratings_view, transporter_ratings_view,
    user_detail_view, user_ratings_view  # user_ratings_view ekledik
)

router = DefaultRouter()
# Düzgün path'ler kullanarak çakışmaları engelleme
router.register(r'', ProfileViewSet, basename='profile')  # Kökü önce (base URL)
router.register(r'cargo-owners', CargoOwnerViewSet, basename='cargo-owners')
router.register(r'transporters', TransporterViewSet, basename='transporters')

urlpatterns = [
    # Custom endpoint'leri önce tanımlayın
    path('auth/user/', get_user_data, name='get-user-data'),
    path('register/cargo-owner/', CargoOwnerRegisterView.as_view(), name='cargo-owner-register'),
    path('register/transporter/', TransporterRegisterView.as_view(), name='transporter-register'),
    
    # New endpoints for profiles and ratings
    path('cargo-owner/', cargo_owner_profile_view, name='cargo-owner-profile'),
    path('transporter/', transporter_profile_view, name='transporter-profile'),
    path('ratings/', cargo_owner_ratings_view, name='profile-ratings'),  # Default to cargo owner
    path('ratings/cargo-owner/', cargo_owner_ratings_view, name='cargo-owner-ratings'),
    path('ratings/transporter/', transporter_ratings_view, name='transporter-ratings'),
    
    # Kullanıcı profili ve değerlendirmeleri için endpoint'ler
    path('users/<int:user_id>/', user_detail_view, name='user-detail'),
    path('users/<int:user_id>/ratings/', user_ratings_view, name='user-ratings'),  # YENİ: Kullanıcı değerlendirmeleri
    
    # Router URL'lerini sonra dahil edin
    path('', include(router.urls)),
]