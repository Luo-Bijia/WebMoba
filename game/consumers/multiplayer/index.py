from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.core.cache import cache
import json

''' WebSocket consumer for multiplayer game functionality. '''
''' async表示异步函数, await表示等待异步函数执行完毕'''
class MultiPlayer(AsyncWebsocketConsumer):      # 多人游戏的WebSocket处理服务器端
    ''' ※前端new WebSocket时调用, 申请连接 '''
    async def connect(self):            
        self.room_name = None
        for i in range(1000):   # 假定最多1000个房间
            name = "room-%d" % i
            if not cache.has_key(name) or len(cache.get(name)) < settings.ROOM_CAPACITY:
                self.room_name = name       # 找到了该mps下玩家该待的房间，可能会出现异步问题
                break

        if not self.room_name:
            return      # 房间开满了，queueing
        
        await self.accept()     # 连上服务器（房间）
        
        if not cache.has_key(self.room_name):
            cache.set(self.room_name, [], 3600)     # 将(房间名, 玩家列表)存入redis，房间持续存在1小时
        
        # send：后端向前端发送消息，前端会在onmessage里处理
        # 时间线:
        # t0: 玩家N连接WebSocket，进入房间room_name，获取已有的玩家列表
        # t1: 服务器→N前端: "创建已有的玩家A"
        # t2: 服务器→N前端: "创建已有的玩家B" 
        # t3: 服务器→N前端: ...
        for player in cache.get(self.room_name):
            await self.send(text_data=json.dumps({
                'event': 'create_player',
                'uuid': player['uuid'],
                'username': player['username'],
                'photo': player['photo']
            }))

        await self.channel_layer.group_add(self.room_name, self.channel_name)   # 将当前连接的channel加入到指定组中，方便群发消息

    async def disconnect(self, close_code):    # 断开连接时调用
        print('disconnect')
        await self.channel_layer.group_discard(self.room_name, self.channel_name)   # 将当前连接的channel从组中移除

    async def create_player(self, data):        # 在前端能connect上后 onopen回调启动
        # t4: 玩家N维护数据结构，将自己加入到玩家列表中
        room_players = cache.get(self.room_name)
        room_players.append({
            'uuid': data['uuid'],
            'username': data['username'],
            'photo': data['photo']
        })
        cache.set(self.room_name, room_players, 3600)   # 1小时会在房间持续进人途中而一直刷新掉，直到最后一名玩家进入
        
        # t5: 服务器→A,B,...,N: "玩家N加入了"
        await self.channel_layer.group_send(
            self.room_name,     # 组标识
            {
                'type': 'group_event_handler',      # 告诉Channels："请调用每个同组成员的group_event_handler方法"
                'event': "create_player",
                'uuid': data['uuid'],
                'username': data['username'],
                'photo': data['photo']
            })
    
    async def group_event_handler(self, data):
        await self.send(text_data=json.dumps(data))

    async def move_to(self, data):
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_event_handler",
                'event': "move_to",
                'uuid': data['uuid'],
                'tx': data['tx'],
                'ty': data['ty']
            }
        )

    async def shoot_fireball(self, data):
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_event_handler",
                'event': "shoot_fireball",
                'uuid': data['uuid'],
                'tx': data['tx'],
                'ty': data['ty'],
                'ball_uuid': data['ball_uuid']
            }
        )

    async def attack(self, data):
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_event_handler",
                'event': "attack",
                'uuid': data['uuid'],
                'attackee_uuid': data['attackee_uuid'],
                'x': data['x'],
                'y': data['y'],
                'angle': data['angle'],
                'damage': data['damage'],
                'ball_uuid': data['ball_uuid']
            }
        )

    async def flash(self, data):
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_event_handler",
                'event': "flash",
                'uuid': data['uuid'],
                'tx': data['tx'],
                'ty': data['ty']
            }
        )

    ''' ※接收到前端数据时调用 '''
    async def receive(self, text_data):     
        data = json.loads(text_data)       # 将被stingify的json字符串转换为字典
        event = data['event']
        if event == "create_player":
            await self.create_player(data)
        elif event == "move_to":
            await self.move_to(data)
        elif event == "shoot_fireball":
            await self.shoot_fireball(data)
        elif event == "attack":
            await self.attack(data)
        elif event == "flash":
            await self.flash(data)