import { Circle } from "./shape.js";
import { Canvas } from "./canvas.js";
import { Bloons } from "./bloons.js";
// projectile class for the projectiles made by the towers
export class Projectile extends Circle {
    static size = 4;
    private speed: number;
    private _target: Bloons;
    constructor(x: number, y: number, canvas: Canvas, speed: number, target: Bloons) {
        super(x, y, Projectile.size, "yellow", canvas);
        this.speed = speed;
        this._target = target;
    }
    // move and draw in one function, first moves the projectile towards the target, then draws it
    public draw(dt: number): void {
        const dx = this._target.x - this._x;
        const dy = this._target.y - this._y;
        const angle = Math.atan2(dy, dx);
        this._x += Math.cos(angle) * this.speed * dt;
        this._y += Math.sin(angle) * this.speed * dt;
        this.canvas.context.beginPath();
        this.canvas.context.arc(this._x, this._y, Projectile.size, 0, 2 * Math.PI);
        this.canvas.context.fillStyle = "yellow";
        this.canvas.context.fill();
    }
    public get x(): number {
        return this._x;
    }
    public get y(): number {
        return this._y;
    }
    public get target(): Bloons {
        return this._target;
    }
}