from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.core.cache import cache
import json

from thrift import Thrift
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol

from match_system.src.match_server.match_service import Match
from channels.db import database_sync_to_async
from game.models.player.player import Player

''' WebSocket consumer for multiplayer game functionality. '''
''' async表示异步函数, await表示等待异步函数执行完毕'''
class MultiPlayer(AsyncWebsocketConsumer):      # 多人游戏的WebSocket处理服务器端
    ''' ※前端new WebSocket时调用, 申请连接 '''
    async def connect(self):
        await self.accept()     # 服务器与前端主机的mps连接上了（房间）

    async def disconnect(self, close_code):    # 断开连接时调用
        if self.room_name:
            await self.channel_layer.group_discard(self.room_name, self.channel_name)   # 将当前连接的channel从组中移除

    async def create_player(self, data):        # 在前端能connect上后 onopen回调启动
        self.room_name = None
        self.uuid = data['uuid']
        '''(1) 先来先到匹配, 玩家进来就直接找空余房间, 找到就创建出来'''
        # for i in range(1000):   # 假定最多1000个房间
        #     name = "room-%d" % i
        #     if not cache.has_key(name) or len(cache.get(name)) < settings.ROOM_CAPACITY:
        #         self.room_name = name       # 找到了该mps下玩家该待的房间，可能会出现异步问题
        #         break

        # if not self.room_name:
        #     return      # 房间开满了，queueing
        
        # if not cache.has_key(self.room_name):
        #     cache.set(self.room_name, [], 3600)     # 将(房间名, 玩家列表)存入redis，房间持续存在1小时
        
        # # send：后端向前端发送消息，前端会在onmessage里处理
        # # 时间线:
        # # t0: 玩家N连接WebSocket，进入房间room_name，获取已有的玩家列表
        # # t1: 服务器→N前端: "创建已有的玩家A"
        # # t2: 服务器→N前端: "创建已有的玩家B" 
        # # t3: 服务器→N前端: ...
        # for player in cache.get(self.room_name):
        #     await self.send(text_data=json.dumps({
        #         'event': 'create_player',
        #         'uuid': player['uuid'],
        #         'username': player['username'],
        #         'photo': player['photo']
        #     }))

        # await self.channel_layer.group_add(self.room_name, self.channel_name)   # 将当前连接的channel加入到指定组中，方便群发消息
        
        # # t4: 玩家N维护数据结构，将自己加入到玩家列表中
        # room_players = cache.get(self.room_name)
        # room_players.append({
        #     'uuid': data['uuid'],
        #     'username': data['username'],
        #     'photo': data['photo']
        # })
        # cache.set(self.room_name, room_players, 3600)   # 1小时会在房间持续进人途中而一直刷新掉，直到最后一名玩家进入
        
        # # t5: 服务器→A,B,...,N: "玩家N加入了"
        # await self.channel_layer.group_send(
        #     self.room_name,     # 组标识
        #     {
        #         'type': 'group_event_handler',      # 告诉Channels："请调用每个同组成员的group_event_handler方法"
        #         'event': "create_player",
        #         'uuid': data['uuid'],
        #         'username': data['username'],
        #         'photo': data['photo']
        #     })

        '''(2) 调用匹配系统, 根据匹配结果再创建出玩家(match-system Client)'''
        # Make socket
        transport = TSocket.TSocket('127.0.0.1', 9090)

        # Buffering is critical. Raw sockets are very slow
        transport = TTransport.TBufferedTransport(transport)

        # Wrap in a protocol
        protocol = TBinaryProtocol.TBinaryProtocol(transport)

        # Create a client to use the protocol encoder
        client = Match.Client(protocol)

        def db_get_player():
            return Player.objects.get(user__username = data['username'])

        player = await database_sync_to_async(db_get_player)()
        # Connect!
        transport.open()
        
        client.add_player(player.score, self.uuid, data['username'], data['photo'], self.channel_name)
        
        # Close!
        transport.close()
    
    async def group_event_handler(self, data):
        # 在匹配服务器端第一次调用到该函数时一定能趁机获取到房间名
        if not self.room_name:
            keys = cache.keys("*%s*" % (self.uuid))
            if keys:
                self.room_name = keys[0]        # 通过匹配结果更新房间名，衔接后续广播操作
        
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
        '''每次玩家的攻击都有可能终止掉整场战斗, 因此对局结束的判断及之后的处理在attack进行'''

        if not self.room_name:          # eliminate dangling bullet
            return

        players = cache.get(self.room_name)
        if not players:         # eliminate dangling bullet
            return

        for player in players:
            if player['uuid'] == data['attackee_uuid']:
                player['hp'] -= 25

        remain_cnt = 0
        for player in players:
            if player['hp'] > 0:
                remain_cnt += 1
        
        if remain_cnt > 1 and self.room_name:
            cache.set(self.room_name, players, 3600)        # 这次攻击未导致本场游戏结束，正常更新fighting状态下的players
        else:
            def db_update_player_score(username, incr_score):
                player = Player.objects.get(user__username=username)
                player.score += incr_score
                player.save()
            for player in players:
                if player['hp'] <= 0:       # loser
                    await database_sync_to_async(db_update_player_score)(player['username'], -5)
                else:       # winner
                    await database_sync_to_async(db_update_player_score)(player['username'], 10)

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

    async def message(self, data):
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_event_handler",
                'event': "message",
                'uuid': data['uuid'],
                'text': data['text']
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
        elif event == "message":
            await self.message(data)