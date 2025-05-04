import logging
from rest_framework import serializers
from .models import CargoPost
from Profile.serializers import CargoOwnerSerializer, TransporterSerializer
from Profile.models import CargoOwner
from offer.models import Offer

# Configure logger for this module
logger = logging.getLogger(__name__)

class CargoPostListSerializer(serializers.ModelSerializer):
    cargo_owner_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cargo_type_display = serializers.CharField(source='get_cargo_type_display', read_only=True)
    offer_count = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = CargoPost
        fields = [
            'id', 'title', 'cargo_owner_name', 'status_display',
            'pickup_location', 'delivery_location', 'price',
            'pickup_date', 'delivery_date', 'created_at', 'status',
            'cargo_type', 'cargo_type_display', 'required_vehicle', 
            'offer_count', 'days_remaining', 'weight', 'volume'
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
        
        # Eğer değer yoksa, aktif teklif sayısını hesapla
        return Offer.objects.filter(cargo_post=obj, status='pending').count()
    
    def get_days_remaining(self, obj):
        if hasattr(obj, 'get_days_remaining'):
            return obj.get_days_remaining()
        return None
    

class CargoPostDetailSerializer(serializers.ModelSerializer):
    cargo_owner = CargoOwnerSerializer(read_only=True)
    cargo_owner_name = serializers.SerializerMethodField()
    cargo_owner_details = serializers.SerializerMethodField()
    selected_transporter = TransporterSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cargo_type_display = serializers.CharField(source='get_cargo_type_display', read_only=True)
    required_vehicle_display = serializers.CharField(source='get_required_vehicle_display', read_only=True, allow_null=True)
    offer_count = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = CargoPost
        fields = '__all__'
        read_only_fields = ['cargo_owner', 'selected_transporter', 'created_at', 'updated_at', 'offer_count']
    
    def get_cargo_owner_name(self, obj):
        if obj.cargo_owner:
            if hasattr(obj.cargo_owner, 'company_name') and obj.cargo_owner.company_name:
                return obj.cargo_owner.company_name
            elif hasattr(obj.cargo_owner, 'user') and obj.cargo_owner.user:
                return obj.cargo_owner.user.get_full_name() or obj.cargo_owner.user.username
        return None
    
    def get_cargo_owner_details(self, obj):
        if not obj.cargo_owner:
            return None
            
        serializer = CargoOwnerSerializer(obj.cargo_owner)
        return serializer.data
    
    def get_offer_count(self, obj):
        # Veritabanına kaydedilmiş offer_count değerini döndür
        if hasattr(obj, 'offer_count'):
            return obj.offer_count
        
        # Eğer değer yoksa, aktif teklif sayısını hesapla
        return Offer.objects.filter(cargo_post=obj, status='pending').count()
    
    def get_days_remaining(self, obj):
        if hasattr(obj, 'get_days_remaining'):
            return obj.get_days_remaining()
        return None
        
    def validate_required_vehicle(self, value):
        """
        required_vehicle için boş string değeri kabul edilir
        """
        # Boş string kabul et
        return value
        
    def validate_cargo_type(self, value):
        """
        cargo_type için geçerli bir değer kontrolü
        """
        valid_choices = dict(CargoPost.CARGO_TYPE_CHOICES).keys()
        if value not in valid_choices:
            raise serializers.ValidationError(f"Geçersiz yük tipi. Seçenekler: {', '.join(valid_choices)}")
        return value
        
    def validate(self, data):
        """
        Fazladan doğrulamalar
        """
        # Tarih kontrolü
        if 'pickup_date' in data and 'delivery_date' in data:
            if data['pickup_date'] and data['delivery_date'] and data['pickup_date'] > data['delivery_date']:
                raise serializers.ValidationError({
                    "delivery_date": "Teslim tarihi, alış tarihinden önce olamaz."
                })
                
        # Sayısal alan kontrolleri
        if 'weight' in data and data['weight'] is not None and data['weight'] <= 0:
            raise serializers.ValidationError({
                "weight": "Ağırlık 0'dan büyük olmalıdır."
            })
            
        if 'volume' in data and data['volume'] is not None and data['volume'] <= 0:
            raise serializers.ValidationError({
                "volume": "Hacim 0'dan büyük olmalıdır."
            })
            
        if 'package_count' in data and data['package_count'] is not None and data['package_count'] <= 0:
            raise serializers.ValidationError({
                "package_count": "Paket sayısı 0'dan büyük olmalıdır."
            })
            
        return data

class CargoPostCreateSerializer(serializers.ModelSerializer):
    # cargo_owner alanını açıkça tanımlayıp optional yapıyoruz
    cargo_owner = serializers.PrimaryKeyRelatedField(
        queryset=CargoOwner.objects.all(), 
        required=False  # Bu satır önemli - cargo_owner'ı zorunlu olmaktan çıkarıyor
    )
    
    class Meta:
        model = CargoPost
        exclude = ['created_at', 'updated_at', 'view_count', 'expires_at', 'selected_transporter', 'offer_count']
    
    def validate_required_vehicle(self, value):
        """
        required_vehicle için geçerli bir değer kontrolü
        """
        # Boş string veya null değeri kontrolü
        if value is None or value == '':
            return ''  # Boş string olarak standartlaştır
            
        # Model'deki geçerli seçenekleri kontrol et
        try:
            valid_choices = dict(CargoPost.VEHICLE_TYPES).keys()
            if value not in valid_choices:
                raise serializers.ValidationError(
                    f"Geçersiz araç tipi. Geçerli seçenekler: {', '.join(valid_choices)}"
                )
        except AttributeError:
            # Model'de VEHICLE_TYPES yoksa, hata logla ve değeri kabul et
            logger.warning(f"CargoPost model has no attribute VEHICLE_TYPES, value: {value}")
            
        return value
        
    def validate(self, data):
        # Yükleme ve teslim tarihlerinin sırasını kontrol et
        if 'pickup_date' in data and 'delivery_date' in data:
            if data['pickup_date'] and data['delivery_date'] and data['pickup_date'] > data['delivery_date']:
                raise serializers.ValidationError({
                    "delivery_date": "Teslim tarihi, yükleme tarihinden önce olamaz."
                })
        return data
        
    def create(self, validated_data):
        """
        Eğer cargo_owner belirtilmemişse, istek yapan kullanıcının
        cargo_owner bilgisini otomatik olarak ekler.
        """
        # İstek nesnesini al ve içeriğini logla
        request = self.context.get('request')
        logger.debug(f"Context in serializer: {self.context}")
        logger.debug(f"Request in serializer context: {request}")
        
        if request:
            logger.debug(f"Request user: {request.user}, authenticated: {request.user.is_authenticated}")
        
        # Eğer cargo_owner belirtilmemişse ve kullanıcı giriş yapmışsa
        if 'cargo_owner' not in validated_data:
            logger.debug("cargo_owner not in validated_data")
            
            if request and request.user.is_authenticated:
                logger.debug(f"User is authenticated: {request.user}")
                
                if hasattr(request.user, 'cargo_owner'):
                    logger.debug(f"User has cargo_owner: {request.user.cargo_owner.id}")
                    validated_data['cargo_owner'] = request.user.cargo_owner
                else:
                    # API isteğini yapan kullanıcı cargo_owner değilse, hata ver
                    error_msg = "Bu işlem için yük sahibi hesabına sahip olmanız gerekmektedir."
                    logger.warning(f"User {request.user} is not a cargo owner: {error_msg}")
                    raise serializers.ValidationError({
                        "cargo_owner": error_msg
                    })
            else:
                # Kullanıcı giriş yapmamışsa
                error_msg = "Bu işlem için giriş yapmanız gerekiyor."
                logger.warning(f"Anonymous user cannot create cargo post: {error_msg}")
                raise serializers.ValidationError({
                    "cargo_owner": error_msg
                })
                    
        # Oluşturulmadan önce son bir kontrol
        if 'cargo_owner' not in validated_data:
            error_msg = "Yük sahibi bilgisi eksik. Lütfen tekrar giriş yapın veya yük sahibi hesabınızı kontrol edin."
            logger.error(f"cargo_owner is still missing after all checks: {error_msg}")
            raise serializers.ValidationError({
                "cargo_owner": error_msg
            })
                
        try:
            # İlan oluştur
            cargo_post = super().create(validated_data)
            
            # Log için bilgi
            user_info = f"User: {request.user.username if request and request.user.is_authenticated else 'Anonymous'}"
            cargo_owner_info = f"CargoOwner: {cargo_post.cargo_owner.id if cargo_post.cargo_owner else 'None'}"
            logger.info(f"Created cargo post {cargo_post.id} by {user_info}, {cargo_owner_info}")
            
            return cargo_post
        except Exception as e:
            logger.error(f"Error creating cargo post: {e}", exc_info=True)
            raise