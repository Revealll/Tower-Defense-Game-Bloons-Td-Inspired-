import { Circle } from "./shape.js";
import { Game } from "./game.js";
import { Canvas } from "./canvas.js";

export class Bloons extends Circle {
    private _reversed: boolean;
    private hp: number;
    private game: Game;
    private _wayPointIndex: number = 0; // the current index of the waypoint they going towards
    private speed: number; // speed of bloon
    private currentWayPoint: {x: number,y: number}; // current waypoint its going towards
    static size: number = 20;
    // the whole path for the bloons, using waypoints so bloons move one by one to it
    static pathing = [
        {"x":637.333333333333,"y":-48}, 
        {"x":638.666666666667,"y":198.666666666667}, 
        {"x":161.333333333333,"y":198.666666666667}, 
        {"x":161.333333333333,"y":486.666666666667}, 
        {"x":630.666666666667,"y":488}, 
        {"x":637.333333333333,"y":746.666666666667}, 
        {"x":728,"y":745.333333333333}, 
        {"x":734.666666666667,"y":926.666666666667}]
    constructor(x: number, y: number, canvas: Canvas,colour: string,hp: number,game: Game, reversed: boolean, wayPointIndex: number) {
      super(x, y, Bloons.size, colour, canvas);
      this._reversed = reversed;
      this._wayPointIndex = wayPointIndex;
      this.hp = hp;
      this.speed = 40 + hp * 100;
      this.game = game;
    }
    // move the bloon torwads the waypoint
    public move(dt: number) {
      // get the actual speed which is according to dt
      const actualSpd: number = dt * this.speed;
      // get the current point that its moving towards
      this.currentWayPoint = Bloons.pathing[this.wayPointIndex];
      // get the distance between the bloon and the waypoint its going towards
      const xDist: number = this.currentWayPoint.x - this.x;
      const yDist: number = this.currentWayPoint.y - this.y;
      // add the speed but did the distrance to see if its negative or positive to make sure its mvoing correctly
      this.x += actualSpd * Math.sign(xDist); // add right speed per frame depending on sign of x and ydist
      this.y += actualSpd * Math.sign(yDist);
      // if its close enough, just set it equal siunce it wont ever actually be equal 
      if (Math.abs(xDist) <= actualSpd) {
        this.x = this.currentWayPoint.x;
      }
      if (Math.abs(yDist) <= actualSpd) {
          this.y = this.currentWayPoint.y;
      }
      // if the bloon hit the waypoint, then go to the next waypoint, and if it hits the end, remove itself and the player takes damage
      // the reverse is just backwards for waypoints
      if (Math.round(this.x) == Math.round(this.currentWayPoint.x) && Math.round(this.y) == Math.round(this.currentWayPoint.y)) {
        if (!this._reversed) {
          if (this.wayPointIndex < Bloons.pathing.length - 1) {
            this._wayPointIndex++;
          } else {
            this.game.takeDamage(this.hp);
            this.removeSelf();
          }
        } else {
          if (this.wayPointIndex > 0) {
            this._wayPointIndex--;
          } else {
            this.game.takeDamage(this.hp);
            this.removeSelf();
          }
      }
    }
  }
    // takes one damage and goes to the next colour according to its hp
    public pop() {
      this.hp -= 1; 
      if (this.hp <= 0) this.removeSelf();
      
      this._colour = this.game.colours[this.hp - 1];
    }
    // remove itself from the game 
    private removeSelf() {
      const list: Bloons[] = this._reversed ? this.game.enemyBloons : this.game.bloons;
      const index: number = list.indexOf(this);
      if (index != -1) list.splice(index, 1);

    }
    // getter
    public get reversed(): boolean{
      return this._reversed;
    }
    public get wayPointIndex(): number {
      return this._wayPointIndex;
    }
}
