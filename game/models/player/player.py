from django.db import models
from django.contrib.auth.admin import User

# 一个类对应一个表，一个对象对应表中具体数据
class Player(models.Model):     # 继承django中数据表的基类
    user = models.OneToOneField(User, on_delete=models.CASCADE)     # 外键约束，实现与User的绑定，且每条数据一一对应，先有用户账号，再有该用户映射的玩家
    photo = models.URLField(max_length=256, blank=True)
    openid = models.CharField(default="", max_length=50, blank=True, null=True)  # 用于OAuth2登录时标识用户身份的唯一ID
    
    def __str__(self):
        return str(self.user)
