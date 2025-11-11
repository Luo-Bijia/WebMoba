"""
ASGI config for acapp project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/
"""

import os

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'acapp.settings')
django.setup()

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from game.routing import websocket_urlpatterns

# 使得main.py可以调用index.py的一些channel函数
from channels.layers import get_channel_layer
channel_layer = get_channel_layer()

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
})