let AC_GAME_OBJECTS = [];

class AcGameObject{     // 游戏上物体的基类
    constructor(){
        AC_GAME_OBJECTS.push(this);
        this.has_called_start = false;
        this.timedelta = 0;
        
        this.uuid = this.create_uuid();
    }

    create_uuid(){      // 为场上的any对象生成一个随机的8位数uuid
        let res = "";
        for(let i = 0;i < 8;i ++){
            let x = parseInt(Math.floor(Math.random() * 10));
            res += x;
        }
        return res;
    }

    start(){        // 只会在第一帧执行
    
    }
    update(){       // 后面每一帧都会执行
    
    }
    on_destroy(){       // 被删除前保留现场

    }
    destroy(){      // 删掉物体
        this.on_destroy();
        for(let i = 0;i < AC_GAME_OBJECTS.length;i ++){
            if(AC_GAME_OBJECTS[i] === this){
                AC_GAME_OBJECTS.splice(i, 1);
                break;
            }
        }
    }
}


let last_timestamp;
let AC_GAME_ANIMATION_FRAME = function(timestamp){
    for(let i = 0;i < AC_GAME_OBJECTS.length;i ++){
        let obj = AC_GAME_OBJECTS[i];
        if(!obj.has_called_start){
            obj.start();
            obj.has_called_start = true;
        }
        else{
            obj.timedelta = timestamp - last_timestamp;
            obj.update();
        }
    }
    last_timestamp = timestamp;
    
    requestAnimationFrame(AC_GAME_ANIMATION_FRAME);
};
requestAnimationFrame(AC_GAME_ANIMATION_FRAME);
