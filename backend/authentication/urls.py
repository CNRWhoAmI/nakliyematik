from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    LogoutView,
    get_user_data,
    register_user,
    check_registration_fields,
    ForgotPasswordView,
    ResetPasswordView,
)

urlpatterns = [
    # Mevcut token endpoint'i
    path('token/', CustomTokenObtainPairView.as_view(), name='token-obtain'),
    
    # Login endpoint'i ekleyin - aynı view'ı kullanır
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    
    # Çıkış yapma URL'i
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # Kullanıcı bilgilerini getir
    path('user/', get_user_data, name='user-detail'),
    
    # Kayıt olma URL'i
    path('register/', register_user, name='register'),
    
    # Token yenileme URL'i - Custom versiyonu kullanın
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token-refresh'),
    
    path('check-registration/', check_registration_fields, name='check-registration'),

    # Şifre unutma ve sıfırlama URL'leri
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
]