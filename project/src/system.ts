import { Canvas } from "./canvas.js";
import { Game } from "./game.js";
import { Controller } from "./controller.js";
// system class which basically starts the whole thing 
export class System {
    private canvas: Canvas;
    private controller: Controller;;
    private game: Game;
    constructor(canvasId: string, isRemote: boolean, player: string, inProgress: boolean) {
        this.canvas = new Canvas(canvasId); // just builds the canvas
        this.controller = new Controller(canvasId);
        this.game = new Game(this.canvas, this.controller, isRemote, player, inProgress); // start game AFTER canvas is ready
    }
    // starts the match which is basically starting the game 
    public startMatch(): void {
        this.game.startMatch();
    }
}
