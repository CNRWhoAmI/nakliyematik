from rest_framework import serializers
from .models import Offer
from cargo.models import CargoPost
from Profile.serializers import CargoOwnerSerializer, TransporterSerializer
from Profile.models import Transporter, CargoOwner

# TransporterBasicSerializer sadece ihtiyacımız olan alanları içerecek
class TransporterBasicSerializer(serializers.ModelSerializer):
    """Taşıyıcı için temel bilgiler"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Transporter
        fields = [
            'id', 'company_name', 'phone', 'tax_number', 'vehicle_type',
            'user_email', 'user_name', 'user_id'
        ]
    
    def get_user_name(self, obj):
        if obj.user and hasattr(obj.user, 'get_full_name'):
            full_name = obj.user.get_full_name()
            if full_name:
                return full_name
            return obj.user.username
        return None

# CargoOwnerBasicSerializer sadece ihtiyacımız olan alanları içerecek
class CargoOwnerBasicSerializer(serializers.ModelSerializer):
    """Yük sahibi için temel bilgiler"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CargoOwner
        fields = [
            'id', 'company_name', 'phone', 'tax_number',
            'user_email', 'user_name', 'user_id'
        ]
    
    def get_user_name(self, obj):
        if obj.user and hasattr(obj.user, 'get_full_name'):
            full_name = obj.user.get_full_name()
            if full_name:
                return full_name
            return obj.user.username
        return None

# CargoPostBasicSerializer ekleyelim
class CargoPostBasicSerializer(serializers.ModelSerializer):
    """Yük ilanı için temel bilgiler"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cargo_type_display = serializers.CharField(source='get_cargo_type_display', read_only=True)
    cargo_owner_name = serializers.SerializerMethodField()
    offer_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CargoPost
        fields = [
            'id', 'title', 'cargo_type', 'cargo_type_display', 'pickup_location', 
            'delivery_location', 'pickup_date', 'delivery_date', 'price', 
            'status', 'status_display', 'cargo_owner_name', 'offer_count'
        ]
    
    def get_cargo_owner_name(self, obj):
        if obj.cargo_owner:
            if hasattr(obj.cargo_owner, 'company_name') and obj.cargo_owner.company_name:
                return obj.cargo_owner.company_name
            elif hasattr(obj.cargo_owner, 'user') and obj.cargo_owner.user:
                return obj.cargo_owner.user.get_full_name() or obj.cargo_owner.user.username
        return None
    
    def get_offer_count(self, obj):
        # Veritabanında kaydedilmiş offer_count değerini döndür
        if hasattr(obj, 'offer_count'):
            return obj.offer_count
        
        # Eğer değer yoksa, teklif sayısını hesapla
        return Offer.objects.filter(cargo_post=obj, status='pending').count()

class OfferCreateSerializer(serializers.ModelSerializer):
    """
    Teklif oluşturma için özel serializer
    """
    class Meta:
        model = Offer
        fields = ['cargo_post', 'price', 'message', 'expires_at']
        
    def validate_cargo_post(self, value):
        """
        Sadece aktif ilanlar için teklif verilebilir
        """
        if value.status != 'active':
            raise serializers.ValidationError("Bu ilan için artık teklif verilemez.")
        return value
        
    def validate(self, data):
        """
        Kullanıcının daha önce bu ilana teklif verip vermediğini kontrol et
        """
        cargo_post = data['cargo_post']
        request = self.context.get('request')
        
        if request and hasattr(request, 'user') and hasattr(request.user, 'transporter'):
            user = request.user
            if Offer.objects.filter(cargo_post=cargo_post, transporter=user.transporter, status='pending').exists():
                raise serializers.ValidationError("Bu ilana zaten bir teklif verdiniz. Lütfen bekleyen teklifinizi güncelleyin.")
            
        return data

class OfferListSerializer(serializers.ModelSerializer):
    """
    Teklif listesi için özet serializer
    """
    transporter_name = serializers.SerializerMethodField()
    cargo_title = serializers.CharField(source='cargo_post.title', read_only=True)
    cargo_owner_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    transporter_details = serializers.SerializerMethodField()
    cargo_post_details = serializers.SerializerMethodField()
    hours_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            'id', 'cargo_post', 'cargo_title', 'cargo_post_details',
            'transporter', 'transporter_name', 'transporter_details',
            'cargo_owner', 'cargo_owner_name',
            'price', 'status', 'status_display', 'created_at', 'expires_at',
            'hours_remaining', 'message'
        ]
    
    def get_transporter_name(self, obj):
        if obj.transporter:
            if hasattr(obj.transporter, 'company_name') and obj.transporter.company_name:
                return obj.transporter.company_name
            elif hasattr(obj.transporter, 'user') and obj.transporter.user:
                return obj.transporter.user.get_full_name() or obj.transporter.user.username
        return None
        
    def get_cargo_owner_name(self, obj):
        if obj.cargo_owner:
            if hasattr(obj.cargo_owner, 'company_name') and obj.cargo_owner.company_name:
                return obj.cargo_owner.company_name
            elif hasattr(obj.cargo_owner, 'user') and obj.cargo_owner.user:
                return obj.cargo_owner.user.get_full_name() or obj.cargo_owner.user.username
        return None
    
    def get_transporter_details(self, obj):
        """Taşıyıcı detaylarını al"""
        if not obj.transporter:
            return None
        
        serializer = TransporterBasicSerializer(obj.transporter)
        return serializer.data
    
    def get_cargo_post_details(self, obj):
        """Yük ilanı detaylarını al"""
        if not obj.cargo_post:
            return None
        
        serializer = CargoPostBasicSerializer(obj.cargo_post)
        return serializer.data
    
    def get_hours_remaining(self, obj):
        """Teklifin geçerlilik süresinden kalan saat sayısını hesapla"""
        if hasattr(obj, 'get_hours_remaining'):
            return obj.get_hours_remaining()
        return None

class OfferDetailSerializer(serializers.ModelSerializer):
    """
    Teklif detayları için kapsamlı serializer
    """
    transporter_details = serializers.SerializerMethodField()
    cargo_owner_details = serializers.SerializerMethodField() 
    cargo_post_details = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    hours_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            'id', 'cargo_post', 'cargo_post_details',
            'transporter', 'transporter_details', 
            'cargo_owner', 'cargo_owner_details',
            'price', 'status', 'status_display', 
            'message', 'response_note', 'created_at', 'updated_at', 'expires_at',
            'hours_remaining'
        ]
        read_only_fields = ['cargo_post', 'cargo_owner', 'transporter', 'created_at']
    
    def get_transporter_details(self, obj):
        """Taşıyıcı detaylarını al"""
        if not obj.transporter:
            return None
        
        serializer = TransporterBasicSerializer(obj.transporter)
        return serializer.data
    
    def get_cargo_owner_details(self, obj):
        """Yük sahibi detaylarını al"""
        if not obj.cargo_owner:
            return None
        
        serializer = CargoOwnerBasicSerializer(obj.cargo_owner)
        return serializer.data
    
    def get_cargo_post_details(self, obj):
        """Yük ilanı detaylarını al"""
        if not obj.cargo_post:
            return None
        
        serializer = CargoPostBasicSerializer(obj.cargo_post)
        return serializer.data
    
    def get_hours_remaining(self, obj):
        """Teklifin geçerlilik süresinden kalan saat sayısını hesapla"""
        if hasattr(obj, 'get_hours_remaining'):
            return obj.get_hours_remaining()
        return None