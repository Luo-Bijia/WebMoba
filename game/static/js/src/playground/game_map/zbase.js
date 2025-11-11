class GameMap extends AcGameObject{
    constructor(playground){
        super();
        this.playground = playground;
        this.$canvas = $(`<canvas tabindex=0></canvas>`);   // tabindex: 1.接收键盘事件 2.点击 canvas 后，键盘输入会直接作用于游戏
        this.ctx = this.$canvas[0].getContext('2d');        // 用于调节画布参数的变量
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.playground.$playground.append(this.$canvas);
    }
    start(){
        this.$canvas.focus();       // 进到页面里 首先默认聚焦在canvas上（主要会与输入框争夺焦点）
    }
    resize(){       // 根据playground的变化调整画布大小
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
    update(){
        this.render();
    }
    render(){
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
}
