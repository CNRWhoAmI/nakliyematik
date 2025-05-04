from rest_framework import serializers
from .models import Transportation, TransportationUpdate, TransportationRating, LocationHistory
# Doğru serializer isimlerini kullanarak import ediyoruz
from cargo.serializers import CargoPostListSerializer  # CargoPostBasicSerializer yerine 
from offer.serializers import OfferDetailSerializer  # Offer modülünden doğru serializer
from Profile.serializers import CargoOwnerSerializer, TransporterSerializer


class TransportationUpdateSerializer(serializers.ModelSerializer):
    """Taşıma güncellemeleri için serializer"""
    user_name = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    user_type = serializers.SerializerMethodField()
    
    class Meta:
        model = TransportationUpdate
        fields = ['id', 'note', 'latitude', 'longitude', 'user_name', 'user_id', 'user_type', 'created_at']
    
    def get_user_name(self, obj):
        if obj.user:
            return obj.user.username
        return None
    
    def get_user_id(self, obj):
        if obj.user:
            return obj.user.id
        return None
    
    def get_user_type(self, obj):
        if obj.user:
            if hasattr(obj.user, 'cargo_owner'):
                return 'cargo_owner'
            elif hasattr(obj.user, 'transporter'):
                return 'transporter'
            return 'staff'
        return None


class TransportationRatingSerializer(serializers.ModelSerializer):
    """Taşıma değerlendirmesi için serializer"""
    source = serializers.SerializerMethodField()
    
    class Meta:
        model = TransportationRating
        fields = ['id', 'rating', 'comment', 'created_at', 'from_cargo_owner', 'source']
    
    def get_source(self, obj):
        return "Yük Sahibi" if obj.from_cargo_owner else "Taşıyıcı"


class TransportationListSerializer(serializers.ModelSerializer):
    """Taşıma listesi için özet serializer"""
    cargo_post_title = serializers.CharField(source='cargo_post.title', read_only=True)
    cargo_owner_name = serializers.CharField(source='cargo_owner.company_name', read_only=True)
    transporter_name = serializers.CharField(source='transporter.company_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Transportation
        fields = [
            'id', 'status', 'status_display', 'cargo_post_title', 
            'cargo_owner_name', 'transporter_name', 'created_at',
            'pickup_confirmed', 'delivery_confirmed', 'estimated_arrival'
        ]


class TransportationDetailSerializer(serializers.ModelSerializer):
    """Taşıma detayları için kapsamlı serializer"""
    cargo_post = CargoPostListSerializer(read_only=True)
    offer = OfferDetailSerializer(read_only=True)
    cargo_owner = CargoOwnerSerializer(read_only=True)
    transporter = TransporterSerializer(read_only=True)
    updates = TransportationUpdateSerializer(many=True, read_only=True)
    ratings = TransportationRatingSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Transportation
        # Tüm model alanlarını kullan
        fields = '__all__'
        # İlişkili alanları ekle
        depth = 1


class LocationHistorySerializer(serializers.ModelSerializer):
    """Konum geçmişi için serializer"""
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LocationHistory
        fields = ['id', 'latitude', 'longitude', 'timestamp', 'note', 'user_name']
    
    def get_user_name(self, obj):
        if obj.user:
            return obj.user.username
        return None