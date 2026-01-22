// canvas class that is basically for the game
export class Canvas {
    private _height: number = 896;
    private _width: number = 896;
    private _element: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;
    private _image: HTMLImageElement;
    // load the canvas which id parameter which is if its remote or local screen
    constructor(id : string) {
        this.loadCanvas(id);
    }
    // load the canvas with the image which is the bloons map
    private loadCanvas(id: string): void {
        this._element = document.getElementById(id) as HTMLCanvasElement;
        this._context = this._element.getContext("2d"); 
        this._image = new Image();
        this._element.height = this._image.height;
        this._element.width = this._image.width;
        this._image.src = "img/map.png";
        this._image.onload = () => {
            this._element.width = this._image.width;
            this._element.height = this._image.height;
            this.drawImage();
        }
    }
    // draw the canvas with the image
    public drawImage(): void {
        this._context.drawImage(this._image, 0, 0);
    }
    // getters
    public get element(): HTMLCanvasElement {
        return this._element;
    }

    public get context(): CanvasRenderingContext2D {
        return this._context;
    }

    public get width(): number {
        return this._width
    }
    public get height(): number {
        return this._height
    }
}