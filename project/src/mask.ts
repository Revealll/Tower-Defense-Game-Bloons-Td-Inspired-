// mask that is used for the tower placement, making sure towers cant be placed on the bloon track or on obsticles
// it is done by having the map drawn out with black being spots you cannot place, and it checks if the spot your on is black
// if so then you cannto place
export class Mask {
    private _element: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;
    private _image: HTMLImageElement;
    private maskRdy: boolean = false;
    constructor() {
        this.loadMask();
    }
    private loadMask() {
        this._image = new Image();
        this._image.src = "img/map_mask.png";
        // draws the mask but fully transparent
        this._image.onload = () => {
            this._element = document.createElement("canvas");
            this._element.width = this._image.width;
            this._element.height = this._image.height;
            this._context = this._element.getContext("2d");
            this._context.drawImage(this._image, 0, 0);
            this.maskRdy = true;
        }
    }
    public canPlace(x: number, y: number): boolean {
        if (!this.maskRdy) return false;
        const data = this._context.getImageData(x, y, 1, 1).data; // gets the rgba
        return data[3] == 0; // gets the alpha, if the last value is 0, then its not black, meaning you can place
    }
}