from django.urls import path
from game.views import index, play

"""game part urls"""

urlpatterns = [
    path('', index, name="index"),  # 传index函数作为游戏界面的默认界面
    path('play/', play, name="play")
]
