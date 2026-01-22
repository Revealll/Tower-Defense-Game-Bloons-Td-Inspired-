import { Rect } from "./shape.js";
import { Canvas } from "./canvas.js";
import { Projectile } from "./projectile.js";
import { Game } from "./game.js";
import {Circle} from "./shape.js";
import { Bloons } from "./bloons.js";
export class Tower extends Rect{
    static SIZE: number = 64;
    private damage: number = 1;
    private _projectiles: Projectile[]= [];
    private speed: number = 500; // speed of projectile
    private game: Game; // game instance
    private _center: {x: number, y: number}; // center of tower 
    private radius: Circle; // radius of the tower
    private radiusSize: number = 250; // radius size 
    private target: Bloons | null = null; // the current target the tower is locking on 
    private fireRate: number = 1; // amount of shots per second
    private lastShot: number = 0; // check the amount of time has passed from the last shot 
    public static cost: number = 250; // cost of the tower
    constructor(x: number, y: number, colour: string, canvas: Canvas, game: Game) {
        super(x, y, Tower.SIZE, Tower.SIZE, colour, canvas);
        this._center = {
            x: this._x + this._width / 2,
            y: this._y + this._height / 2,
        };
        this.game = game;
        this.radius = new Circle(this._center.x, this._center.y, this.radiusSize, "blue", this._canvas);
    }

    // draws the radius of the tower with the transparency at 0.2 then sets it back to regular value for other draws
    public drawRadius(): void {             
        this.canvas.context.globalAlpha = 0.2;    
        this.radius.draw();    
        this.canvas.context.globalAlpha = 1.0;           
    }

    /*
    * Goes through all the bloons in the array then finds the first bloon that is in the radius of the tower so the target is that bloon
    */
    private findTarget(): Bloons | null {
        for (let bloon of this.game.bloons) {
            // calculates the diagonal distance from the tower to the bloon, and checks if the smallest than the radius
            const dx = bloon.x - this._center.x;
            const dy = bloon.y - this._center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= this.radiusSize) {
                return bloon;
            }
        }
        return null;
    }
    
    // Shoots a projectile from the tower, This is called every frame, but a projectile only shot when firerate is ready
    public shootProjectile(dt: number): void {
        // makes sure it only shoots whatever the firerate is, if firerate is 1, then 1 per second
        this.lastShot += dt;
        if (this.lastShot < 1 / this.fireRate) return;
        // find the current target
        this.target = this.findTarget();
        if (!this.target) return;
        // set the projectile its about to shoot to its current target
        this._projectiles.push(new Projectile (this._center.x, this._center.y, this.canvas, this.speed, this.target));
        // reset the shot back to 0 
        this.lastShot = 0;
    }

    
    /*
    * Draws all the projectiles of the current 
    * dt: the delta time so it removes properly regardless of frames
    */
    public drawProjectiles(dt: number): void {
        for (let p of this._projectiles) {
            p.draw(dt);
        }
    }
    
    /* Removes the specified projectile from the array so its fully gone
    * i: the place of the projectile in array so it can be removed
    */
    public removeProjectile(i: number): void {
        this._projectiles.splice(i, 1);
    }
    
    // getter for projectile
    public get projectiles(): Projectile[] {
        return this._projectiles;
    }
    /*
    * cleansup the projectiles whether when the projectile hits the bloon or the target bloon is popped or it reached the end
    */
    public cleanupProjectiles(bloons: Bloons[]): void {
        for (let i = this._projectiles.length - 1; i >= 0; i--) {
            // if theres no more target, or the bloon does not exist in the game anymore remove the projectile that targets that bloon
            if (!this._projectiles[i].target || !bloons.includes(this._projectiles[i].target)) {
                this.removeProjectile(i);
            }
        }
    }
}