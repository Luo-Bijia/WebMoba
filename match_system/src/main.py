#! /usr/bin/env python3

import glob
import sys
sys.path.insert(0, glob.glob('../../')[0])      # Django家目录下的py包

from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
from thrift.server import TServer

from match_server.match_service import Match
from queue import Queue
from time import sleep
from threading import Thread

from acapp.asgi import channel_layer
from asgiref.sync import async_to_sync      # 在同步代码中调用异步函数
from django.core.cache import cache

queue = Queue()     # 全局消息队列

class Player:
    def __init__(self, score, uuid, username, photo, channel_name):
        self.score = score
        self.uuid = uuid
        self.username = username
        self.photo = photo
        self.channel_name = channel_name    # WebSocket 唯一连接标识符
        self.waiting_time = 0       # 阈值-等待时间

class Pool:
    def __init__(self):
        self.players = []       # 处于匹配池里的玩家
    
    def add_player(self, player):       # 这里的消息类型只定义add一种
        print("Add player %s %d" % (player.username, player.score))
        self.players.append(player)

    def check_match(self, p1, p2):
        # if p1.username == p2.username:
        #     return False
        delta_s = abs(p1.score - p2.score)
        return delta_s <= (p1.waiting_time * 50) and delta_s <= (p2.waiting_time * 50)
    
    def match_success(self, ps):        # ps：匹配成功了的玩家列表
        print("Match success: %s %s %s" % (ps[0].username, ps[1].username, ps[2].username))
        # 代create_player实现部分功能
        room_name = "room-%s-%s-%s" % (ps[0].uuid, ps[1].uuid, ps[2].uuid)
        room_players = []
        for p in ps:
            async_to_sync(channel_layer.group_add)(room_name, p.channel_name)
            room_players.append({
                'uuid': p.uuid,
                'username': p.username,
                'photo': p.photo,
                'hp': 100       # 默认初始生命值都为100
            })
        cache.set(room_name, room_players, 3600)
        
        for p in ps:
            async_to_sync(channel_layer.group_send)(
                room_name,
                {
                    'type': 'group_event_handler',
                    'event': "create_player",
                    'uuid': p.uuid,
                    'username': p.username,
                    'photo': p.photo,
                }
            )

    def match(self):
        while len(self.players) >= 3:
            self.players = sorted(self.players, key = lambda p: p.score)
            flag = False
            for i in range(len(self.players) - 2):      # 贪心地枚举所有分数最相近的三人组
                p1, p2, p3 = self.players[i], self.players[i + 1], self.players[i + 2]
                if self.check_match(p1, p2) and self.check_match(p2, p3) and self.check_match(p1, p3):
                    self.match_success([p1, p2, p3])
                    self.players = self.players[:i] + self.players[i+3:]
                    flag = True
                    break

            if(not flag):       # 避免因此次循环下没有能匹配成功的组而往后不断进行无效循环
                break
        self.increase_waiting_time()

    def increase_waiting_time(self):
        for player in self.players:
            player.waiting_time += 1

class MatchHandler:
    def add_player(self, score, uuid, username, photo, channel_name):
        player = Player(score, uuid, username, photo, channel_name)
        queue.put(player)
        return 0        # -> i32

def get_player_from_queue():
    try:
        return queue.get_nowait()
    except:
        return None

def worker():
    pool = Pool()
    while True:
        player = get_player_from_queue()
        if(player):
            pool.add_player(player)
        else:
            pool.match()
            sleep(1)        # 匹配率 1次/s，避免将cpu占满

if __name__ == '__main__':
    handler = MatchHandler()
    processor = Match.Processor(handler)
    transport = TSocket.TServerSocket(host='127.0.0.1', port=9090)
    tfactory = TTransport.TBufferedTransportFactory()
    pfactory = TBinaryProtocol.TBinaryProtocolFactory()

    # 每来一个请求就开一个线程处理的最高并行度服务器
    server = TServer.TThreadedServer(
        processor, transport, tfactory, pfactory)
    
    Thread(target=worker, daemon=True).start()      # 跟随主线程一块结束
    print('Starting the server...')
    server.serve()
    print('done.')