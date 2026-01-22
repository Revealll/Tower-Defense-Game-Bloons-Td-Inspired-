import { Canvas } from "./canvas.js";
// rectangle class 
export class Rect {
    constructor(
    protected _x: number,
    protected _y: number,
    protected _width: number,
    protected _height: number,
    protected _colour: string,
    protected _canvas: Canvas,
  ) {}
  public draw(): void {
    if (!this._colour) return;
    this.canvas.context.fillStyle = this.colour;

    this.canvas.context.beginPath();
    this.canvas.context.fillRect(this._x, this._y, this._width, this._height);
  }
  // getters and setters
  public get width(): number {
    return this._width;
  }
  public get height(): number {
    return this._height;
  }
  public get x(): number {
    return this._x;
  }
  public get y(): number {
    return this._y;
  }
  public set x(value: number) {
    this._x = value;
  }
  public set y(value: number) {
    this._y = value;
  }
  public get canvas(): Canvas {
    return this._canvas;
  }
  public set colour(value: string) {
    this._colour = value;
  }

  public get colour(): string {
    return this._colour;
  }
  
}
// circle class
export class Circle {
  constructor(
    protected _x: number,
    protected _y: number,
    protected _radius: number,
    protected _colour: string,
    protected _canvas: Canvas,
  ) {}
  // dt is optional sometimes draw doesnt need dt
  draw(dt?: number): void;
  public draw(): void {
    this.canvas.context.beginPath();
    this.canvas.context.arc(this._x, this._y, this._radius, 0, 2 * Math.PI);
    this.canvas.context.fillStyle = this._colour
    this.canvas.context.fill()
    this.canvas.context.stroke();
  }
  // getters and setters 
  public get canvas(): Canvas {
    return this._canvas;
  }
  public get x(): number {
    return this._x;
  }
  public get y(): number {
    return this._y;
  }
  public set x(value: number) {
    this._x = value;
  }
  public set y(value: number) {
    this._y = value;
  }
  public set colour(value: string) {
        this._colour = value;
    }
  public get colour(): string {
    return this._colour;
  }
}

export class Picture extends Rect {
  private _image: HTMLCanvasElement;
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    image: HTMLCanvasElement,
    canvas: Canvas,
  ) {
    super(x, y, width, height, "black", canvas);
    this._image = image;
  }

  /**
   * Changes it so you put an image rather than filling it with a colour
   */
  public override draw(): void {
    this.canvas.context.drawImage(
      this._image,
      this.x,
      this.y,
      this._width,
      this._height,
    );

    this.canvas.context.beginPath();
    this.canvas.context.rect(this.x, this.y, this._width, this._height);
  }

  public get image(): HTMLCanvasElement {
    return this._image;
  }
  public get x(): number {
    return this._x;
  }
  public get y(): number {
    return this._y;
  }
  public set x(value: number) {
    this._x = value;
  }
  public set y(value: number) {
    this._y = value;
  }
}