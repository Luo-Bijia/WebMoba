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
            let uuid = data.uuid;
            if(uuid === outer.uuid)     return false;       // 群发的消息逻辑上自己不需要处理
            
            let event = data.event;
            if(event === "create_player") {
                outer.receive_create_player(uuid, data.username, data.photo);
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
}