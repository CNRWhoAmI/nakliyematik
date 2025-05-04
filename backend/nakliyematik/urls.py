from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

urlpatterns = [
    # Django Admin
    #path('admin/', admin.site.urls),
    
    # API Routes
    path('api/', include([
        # Core API endpoints
        path('profile/', include('Profile.urls')),
        path('auth/', include('authentication.urls')),
        path('cargo/', include('cargo.urls')),
        path('transportations/', include('transportation.urls')),
        path('offers/', include('offer.urls')),
    ])),
]