from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CargoOwner, Transporter
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'password', 'email', 'phone', 'address', 'tax_number', 'company_name', 'user_type']
        extra_kwargs = {
            'password': {'write_only': True},
            'username': {'required': True},
            'email': {'required': True},
            'id': {'read_only': True}
        }

    def validate_username(self, value):
        # Güncelleme durumunda kendisiyle çakışmayı engelle
        instance = getattr(self, 'instance', None)
        if instance and instance.username == value:
            return value
            
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Bu kullanıcı adı zaten alınmış")
        return value
        
    def validate_email(self, value):
        # Güncelleme durumunda kendisiyle çakışmayı engelle
        instance = getattr(self, 'instance', None)
        if instance and instance.email == value:
            return value
            
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Bu e-posta adresi zaten kullanılıyor")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    
    def update(self, instance, validated_data):
        """User nesnesini güncelle, şifre varsa özel işlem yap"""
        password = validated_data.pop('password', None)
        
        # Diğer alanları güncelle
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Şifre varsa, set_password metodunu kullan
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance

class CargoOwnerSerializer(serializers.ModelSerializer):
    user = UserSerializer(required=False)  # required=False ekleyerek kısmi güncellemeye izin ver

    class Meta:
        model = CargoOwner
        fields = ['user', 'company_name', 'phone', 'tax_number', 'address']

    def create(self, validated_data):
        try:
            logger.info(f"Creating cargo owner with data: {validated_data}")
            user_data = validated_data.pop('user')
            user = User.objects.create_user(**user_data)
            cargo_owner = CargoOwner.objects.create(user=user, **validated_data)
            return cargo_owner
        except Exception as e:
            logger.error(f"Error creating cargo owner: {e}")
            raise serializers.ValidationError(f"Kayıt oluşturulurken hata: {str(e)}")
        
    def update(self, instance, validated_data):
        """Cargo owner ve ilişkili user'ı güncelle"""
        # 'user' alanını validated_data'dan çıkarıp ayrıca işle
        user_data = validated_data.pop('user', None)
        
        # User nesnesini güncelle
        if user_data and instance.user:
            user_serializer = UserSerializer(instance.user, data=user_data, partial=True)
            if user_serializer.is_valid():
                user_serializer.save()
            else:
                raise serializers.ValidationError(user_serializer.errors)
        
        # CargoOwner nesnesinin diğer alanlarını güncelle
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

class TransporterSerializer(serializers.ModelSerializer):
    user = UserSerializer(required=False)  # required=False ekleyerek kısmi güncellemeye izin ver

    class Meta:
        model = Transporter
        fields = ['user', 'company_name', 'vehicle_type', 'phone', 'tax_number', 'address']

    def create(self, validated_data):
        try:
            logger.info(f"Creating transporter with data: {validated_data}")
            user_data = validated_data.pop('user')
            user = User.objects.create_user(**user_data)
            transporter = Transporter.objects.create(user=user, **validated_data)
            return transporter
        except Exception as e:
            logger.error(f"Error creating transporter: {e}")
            raise serializers.ValidationError(f"Kayıt oluşturulurken hata: {str(e)}")
        
    def update(self, instance, validated_data):
        """Transporter ve ilişkili user'ı güncelle"""
        # 'user' alanını validated_data'dan çıkarıp ayrıca işle
        user_data = validated_data.pop('user', None)
        
        # User nesnesini güncelle
        if user_data and instance.user:
            user_serializer = UserSerializer(instance.user, data=user_data, partial=True)
            if user_serializer.is_valid():
                user_serializer.save()
            else:
                raise serializers.ValidationError(user_serializer.errors)
        
        # Transporter nesnesinin diğer alanlarını güncelle
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance