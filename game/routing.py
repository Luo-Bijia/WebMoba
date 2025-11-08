from django.urls import path
from game.consumers.multiplayer.index import MultiPlayer    # 导入多人游戏的WebSocket处理类

websocket_urlpatterns = [
    path('wss/multiplayer/', MultiPlayer.as_asgi(), name='wss_multiplayer')   # 将指定路径的WebSocket请求路由到MultiPlayer类进行处理
]