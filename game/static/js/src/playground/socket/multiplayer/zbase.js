class MultiPlayerSocket{
    constructor(playground) {
        this.playground = playground;
        let web_host = "app7624.acapp.acwing.com.cn/"
        this.ws = new WebSocket("wss://" + web_host + "wss/multiplayer/");   // 建立与后端的WebSocket连接

        this.start();
    }
    start() {
        this.receive();
    }
    
    // ※接收并处理后端发送过来的消息
    receive(){
        let outer = this;
        this.ws.onmessage = function (e) {
            let data = JSON.parse(e.data);
            let uuid = data.uuid;       // 引起event的player_uuid
            if(uuid === outer.uuid)     return false;       // 广播的消息会发给自己，只需筛选掉
            
            let event = data.event;
            if(event === "create_player") {
                outer.receive_create_player(uuid, data.username, data.photo);
            }
            else if(event === "move_to") {
                outer.receive_move_to(uuid, data.tx, data.ty);
            }
            else if(event === "shoot_fireball") {
                outer.receive_shoot_fireball(uuid, data.tx, data.ty, data.ball_uuid);
            }
            else if(event === "attack") {
                outer.receive_attack(uuid, data.attackee_uuid,
                    data.x, data.y, data.angle, data.damage, data.ball_uuid
                );
            }
            else if(event === "flash") {
                outer.receive_flash(uuid, data.tx, data.ty);
            }
        };
    }

    // ※发送创建玩家的消息给后端服务器，后端在index.receive中处理
    send_create_player(username, photo){
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "create_player",
            'uuid': outer.uuid,
            'username': username,
            'photo': photo
        }));
    }
    
    // ※发送该玩家移动的消息给后端，从而广播给房间内其他玩家
    send_move_to(tx, ty){
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "move_to",
            'uuid': outer.uuid,
            'tx': tx,
            'ty': ty
        }));
    }

    // ※发送该玩家击出了子弹的消息给后端，从而广播给房间内其他玩家
    send_shoot_fireball(tx, ty, ball_uuid){
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "shoot_fireball",
            'uuid': outer.uuid,         // 追踪击出子弹的玩家uuid
            'tx': tx,
            'ty': ty,
            'ball_uuid': ball_uuid
        }));
    }

    // ※发送该玩家击出子弹命中敌人的消息给后端，在子弹attack成功时回调
    send_attack(attackee_uuid, x, y, angle, damage, ball_uuid){
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "attack",
            'uuid': outer.uuid,     // attacker_uuid，与子弹传递的信息拼在一个json里
            'attackee_uuid': attackee_uuid,
            'x': x,
            'y': y,
            'angle': angle,
            'damage': damage,
            'ball_uuid': ball_uuid
        }));
    }

    send_flash(tx, ty){     // 可视为move_to的进阶版
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "flash",
            'uuid': outer.uuid,
            'tx': tx,
            'ty': ty
        }));
    }

    // 实时多次调用该函数来渲染场上还未创建的所有玩家
    receive_create_player(uuid, username, photo){
        let player = new Player(
            this.playground, 
            this.playground.width / 2 / this.playground.scale, 
            0.5, 
            0.05,
            "white",
            0.15,
            "enemy",
            username,
            photo
        );
        player.uuid = uuid;         // ※统一uuid，谁主机上创建的player，就用在那主机上的uuid
        this.playground.players.push(player);
    }

    get_player(uuid){
        for(let i = 0;i < this.playground.players.length;i ++){
            let player = this.playground.players[i];
            if(player.uuid === uuid){
                return player;
            }
        }
        return null;
    }

    // 实时多次调用该函数来渲染场上（除自己外）所有玩家的移动轨迹
    receive_move_to(uuid, tx, ty){
        let player = this.get_player(uuid);
        if(player)  
            player.move_to(tx, ty);
    }
    
    // 实时渲染场上所有玩家击出的子弹轨迹（过程动画）
    receive_shoot_fireball(uuid, tx, ty, ball_uuid){
        let player = this.get_player(uuid);
        if(player){
            let fireball = player.shoot_fireball(tx, ty);
            fireball.uuid = ball_uuid;      // 统一子弹的uuid，取决于击出的主机
        }
    }

    // 实时渲染场上所有玩家之间射出子弹的击中效果
    receive_attack(attacker_uuid, attackee_uuid, x, y, angle, damage, ball_uuid){
        let attacker = this.get_player(attacker_uuid);
        let attackee = this.get_player(attackee_uuid);
        if(attacker && attackee){
            attackee.receive_attack(x, y, angle, damage, ball_uuid, attacker);
        }
    }

    // 实时渲染场上所有玩家的闪现情况
    receive_flash(uuid, tx ,ty){
        let player = this.get_player(uuid);
        if(player)
            player.flash(tx, ty);
    }
}