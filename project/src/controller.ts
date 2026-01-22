
/**
 * Represents the controller for the game, where if you move your mouse or click it will know and send a signal
 */
export class Controller {
    private _mouseX: number = 0; // x data for click
    private _mouseY: number = 0; // y data for click
    private _mouseXMove: number = 0; // x data for when mouse moves 
    private _mouseYMove: number = 0; // y data for when mouse moves 
    private _isClicked: boolean = false; // check if click happened
    private canvasId: string; // the id for which canvas it is using, the remote or local screen
    constructor(canvasId: string) {
        this.canvasId = canvasId;
        document.addEventListener("click", (event) => this.handleMouseClick(event));
        document.addEventListener("mousemove", (e: MouseEvent) => this.cursor(e));
    }
    /**
     * Function that handles the mouse click
     */
    private handleMouseClick(event: MouseEvent): void {
        // gets the canvas data. and the x and y relative to the canvas
        const rect: DOMRect = document.getElementById(this.canvasId).getBoundingClientRect();
        this._isClicked = true; 
        this._mouseX = event.clientX - rect.left;
        this._mouseY = event.clientY - rect.top;
    }

    private cursor(e:MouseEvent): void {
       // gets the canvas data. and the x and y relative to the canvas
        const rect: DOMRect = document.getElementById(this.canvasId).getBoundingClientRect();
        this._mouseXMove = e.clientX - rect.left;
        this._mouseYMove = e.clientY - rect.top;
    }
// getters and setters
public get mouseX(): number {
    return this._mouseX;
  }

  public get mouseY(): number {
    return this._mouseY;
  }

  public get mouseXMove(): number {
    return this._mouseXMove;
  }

  public get mouseYMove(): number {
    return this._mouseYMove;
  }
  
  public set isClicked(bool: boolean) {
    this._isClicked = bool;
  }

  public get isClicked(): boolean {
    return this._isClicked;
  }
}