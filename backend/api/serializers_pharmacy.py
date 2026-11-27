from rest_framework import serializers

from api.models import Product
from api.order_flow import OrderItemSerializer, OrderSerializer
from api.picture_field import PictureField
from api.picture_field import PictureField, StoredFileField


class ProductSerializer(serializers.ModelSerializer):
    image = PictureField(required=False)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'price',
            'stock_quantity',
            'in_stock',
            'image',
            'is_prescription_only',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Price cannot be negative.')
        return value

    def validate_stock_quantity(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Stock quantity cannot be negative.')
        return value


__all__ = ['ProductSerializer', 'OrderSerializer', 'OrderItemSerializer']