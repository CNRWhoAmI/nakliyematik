from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CargoPostViewSet, MyCargoPostsView, get_filtered_posts

# DefaultRouter kullanarak viewset için otomatik URL'ler oluşturun
router = DefaultRouter()
router.register('posts', CargoPostViewSet, basename='cargo-post')

# ViewSet'in my_posts_count metodunu tanımlayın:
cargo_my_posts_count = CargoPostViewSet.as_view({'get': 'my_posts_count'})

urlpatterns = [
    # Ana router URL'leri - tüm viewset action'larını içerir
    path('', include(router.urls)),
    
    # Ek URL'ler - frontend'in beklediği URL'lere uygun
    path('posts/my/', MyCargoPostsView.as_view(), name='my-cargo-posts-alt1'),
    path('posts/my-posts/', MyCargoPostsView.as_view(), name='my-cargo-posts-alt2'),
    
    # Filtreleme endpoint'leri
    path('posts/filter/', get_filtered_posts, name='filter-cargo-posts'),
    path('posts/filtered/', CargoPostViewSet.as_view({'get': 'filtered'}), name='filtered-cargo-posts'),
    
    # İstatistik ve diğer endpoint'ler
    path('posts/stats/', CargoPostViewSet.as_view({'get': 'stats'}), name='cargo-posts-stats'),
    
    # My posts count endpoint
    path('posts/my/count/', cargo_my_posts_count, name='cargo-my-posts-count'),
]