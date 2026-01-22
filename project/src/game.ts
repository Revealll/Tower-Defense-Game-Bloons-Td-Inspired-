// reload everything stuff liek that works. the only bug is on reload, the wave that is current spawning stops spawning.
import { Canvas } from "./canvas.js";
import { Mask } from "./mask.js";
import { Bloons } from "./bloons.js";
import { Controller } from "./controller.js";
import { Tower } from "./tower.js";
import { Projectile } from "./projectile.js";
import { Rect, Circle } from "./shape.js";
import { db, doc, setDoc, getDoc, updateDoc, collection, onSnapshot, arrayUnion, arrayRemove, deleteDoc} from "./firebase.js";
export class Game {
    private static activeGame: Game | null = null;
    private static listenersActivated = false;
    private canvas: Canvas; 
    private controller: Controller;
    private _bloons: Bloons[] = []; // array for the bloons
    private mask: Mask;
    private fps: number = 10;
    private timeInterval: number = 1000 / this.fps;
    private gameInterval: NodeJS.Timeout; // the game interval
    private _colours: string[] = ['red', 'blue', 'green', 'yellow', 'pink']; // colours of the bloons in order
    private deltaTime: number = 0;
    private previousTime: number = 0; // time used to calculate the delta time so movement stays the same no matter frame rate
    private currentWave: number = 0; 
    private gameRunning: boolean = false; // game not running in beginning
    private waveInProgress: boolean = false; // varaible to check if a wave is happening so it doesnt start next one
    private validPlacement: boolean = false;
    private placementCoordsX: number; // the x and y coordinates when someone trying to place tower
    private placementCoordsY: number;
    private maxHp: number = 5;
    private currentHp: number = this.maxHp; // starts at max hp at start of game
    private money: number = 500;
    private placementMode: boolean = false; // see if they are in palcement mode where if they click will place tower
    private uiOpen: boolean = false; // see if ui is open so it wont open if its already open and vice versa
    private _enemyBloons: Bloons[] = []; // to hold the bloons the enemy sends
    private _towers: Tower[] = []; // to holds the towers the player places
    private moneyPerWave: number = 100; // starting money they get every single wave
    private remote: boolean; // see if this game is a remote or local one
    private player: string; // see if they themselves is player1 or player 2
    private enemy: string; // enemy will be the other player (player1 or player 2 depending on the player variable above)
    private room: string; // the roomcode of the current game
    private remoteInformation; // holds all the information from the local for the remote on the other screen to draw
    private gameResultHandled: boolean = false; // check if the game result has already happened so it doesnt trigger more than once
    private lastSaveTime: number = 0; // for testing, used to make sure firestore doesnt run out since im on free version, delete after
    private opponentActiveBloons: number = 0; // to show how many active bloons the opponent has on their screen
    private loopStarted: boolean = false;
    private stateLoaded: boolean = false;
    private snapshots: (() => void)[] = [];
    constructor(canvas: Canvas, controller: Controller, isRemote: boolean, player: string, inProgress: boolean) {
        this.updateHpBar();
        this.updateWaveUI();
        this.remote = isRemote;
        this.canvas = canvas;
        this.controller = controller;
        this.player = player;
        this.enemy = this.player == "player1" ? "player2" : "player1";
        this.room = sessionStorage.getItem("roomCode");
        this.mask = new Mask();
        this.toggleUI();
        this.previousTime = performance.now();
        if (inProgress) {
            this.loadPausedState().then(() => {
                this.stateLoaded = true;
                if (!this.remote && this.player == "player2") this.listenToWaves();
            });
        } else {
            this.stateLoaded = true;
            if (!this.remote && this.player == "player2") this.listenToWaves();
        }
        this.listenToGameState();
        // if its a local game then do the actual game 
        if (!this.remote) {
            Game.activeGame = this;
            this.getStateBloons();
            if (!Game.listenersActivated) {
                Game.addEventListeners();
                Game.listenersActivated = true;
            }
            this.listenIncomingBloons();
            this.gameInterval = setInterval(() => {
            this.canvas.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.canvas.drawImage(); // draws just the canvas first 
            this.updateEverything();
            this.drawEverything();
            this.publishState()
        }, this.timeInterval);
        } else {
            // remote game where it just gets the state of the other local and just draws
            this.getState();
            this.gameInterval = setInterval(() => {
                this.canvas.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.canvas.drawImage();
                this.drawRemoteScreen();
            }); // no time interval right now 
        }
    }
    private async loadPausedState(): Promise<void> {
        const snap = await getDoc(doc(db, "games", this.room, "players", this.player));
        const snapWave = await getDoc(doc(db, "games", this.room));
        if (snapWave.exists()) {
            const data = snapWave.data();
            this.currentWave = data.waveNum || 1;
            this.updateWaveUI();
        }
        if (snap.exists()) {
            const data = snap.data();
            this.currentHp = data.hp;
            this.updateHpBar();
            this.changeMoney(data.money - this.money);
            for (const t of data.towers || []) {
                const tower = new Tower(t.x, t.y, t.colour, this.canvas, this);
                this._towers.push(tower);
            }
            for (const b of data.bloons || []) {
                const hp = this._colours.indexOf(b.colour) + 1;
                let bloon;
                if (!b.enemy) {
                    bloon = new Bloons(b.x, b.y, this.canvas, b.colour, hp, this, false, b.index);
                    this._bloons.push(bloon);
                } else {
                    bloon = new Bloons(b.x, b.y, this.canvas, b.colour, hp, this, true, b.index);
                    this._enemyBloons.push(bloon);
                }
            }
        }
    }
    // starts the match which starts the waves and sets game running to true
    public startMatch(): void {
        this.gameRunning = true;
        if (this.loopStarted) return;
        this.loopStarted = true;
        if (this.player == "player1") {
            this.waveLoop();
        }
    } 
    // add all the event listeners
    private static addEventListeners(): void {
        const getGame = () => Game.activeGame;
        const canvas = document.getElementById("screen") as HTMLCanvasElement | null;
        // event listener for right clicking, where it just cancels the placement mode if it was right clicked, and doesnt do the usual
        canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const game = getGame();
            game.placementMode = false;
            game.toggleUI(); // also turns off ui makes sure to
            game.controller.isClicked = false; // isclicked is false since when they clicked it counts as a click
        })
        // toggle ui if the button for the ui is clicked
        document.getElementById("button").addEventListener("click", () => {
            const game = getGame();
            game.toggleUI()
        });
        // if the tower button is clicked
        document.querySelector(".tower").addEventListener("click", (e) => {
            // makes sure that it doesnt bubble up, meaning that isclicked is registers and will instntly place the turret if not here
            e.stopPropagation(); 
            const game = getGame();
            game.togglePlacementMode();
            game.toggleUI();
        });
        // bloon icons, for sending bloons to the other side
        document.querySelectorAll("#bloon-icons .bloon").forEach(icon => {
            icon.addEventListener("click", (e) => {
                e.stopPropagation();
                const game = getGame();
                const colour = (e.target as HTMLElement).classList[1]; 
                let hp: number = game._colours.indexOf(colour) + 1
                // each bloon costs 10 * their hp 
                if (game.money < hp * 10) return;
                game.changeMoney(-(hp * 10));
                game.moneyPerWave += hp;
                // send it to the local game of the other player so it spawns on their screen, uses timestamp as arrayunion doesnt allow duplicates
                updateDoc(doc(db, "games", game.room, "players", game.enemy),  {
                    otherBloons: arrayUnion({colour, timeStamp: Date.now()})
                })
            });
        });
    }
    // for local games only, listens for the incoming bloons sent from other player and will place on their screen
    private listenIncomingBloons(): void {
        // checks everytime this document is changed
        const sub = onSnapshot(doc(db, "games", this.room, "players", this.player), async (snapShot) => {
            if (!snapShot.exists()) return;
            const data = snapShot.data();
            const bloons = data.otherBloons || [];
            // check if a bloon was placed or not
            if (bloons.length == 0) return;
            // place it into the enemy bloons array of the player who will recieve those bloons
            for (let bloon of bloons) {
                const colour = bloon.colour;
                const startIndex = Bloons.pathing.length - 1;
                const enemyBloon = new Bloons(Bloons.pathing[startIndex].x, Bloons.pathing[startIndex].y, this.canvas, colour, this.colours.indexOf(colour) + 1, this, true, startIndex)
                this._enemyBloons.push(enemyBloon);

            }
            // empty it after so it doesnt keep on sending the same bloons
            await updateDoc(
                    doc(db, "games", this.room, "players", this.player), {
                    otherBloons: []
                });
        })
        this.snapshots.push(sub);
    }
    // for local games only, publsihes the state of their game so the remote game for the other player can draw this published state, to stimulate
    // seeing the other enemy players game
    private async publishState(): Promise<void> {
        if (this.remote) return;
        if (!this.stateLoaded) return;
        // do it every certainm mili seconds, since firestore requires a write limit...
        const now = Date.now();
        if (now - this.lastSaveTime < 100) return;
        this.lastSaveTime = now;
        // combine every bloon on the local games screen, cause remote is just drawing, no game logic needed, jus needs to draw everything
        const allBloons = [...this._bloons, ...this._enemyBloons];
        // publish the state of everything into their own players document
        await updateDoc(doc(db, "games", this.room, "players", this.player), {
            hp: this.currentHp,
            money: this.money,
            towers: this._towers.map(t => ({ x: t.x, y: t.y, colour: t.colour })),
            // flat() is basically just putting the two arrayts into one single array
            bloons: [this._bloons.map(b => ({x: b.x, y: b.y, colour: b.colour, enemy: false, index: b.wayPointIndex})), this._enemyBloons.map(b => ({x: b.x, y: b.y, colour: b.colour, enemy: true, index: b.wayPointIndex}))].flat(),
            projectiles: this._towers.flatMap(t => t.projectiles.map(p => ({x: p.x, y: p.y})))
        }) 
    }
    // for remote games only, gets the enemy players published state and draws it 
    private getState(): void {
        if (!this.remote) return;
        // gets the enemys state 
        const sub = onSnapshot(doc(db, "games", this.room, "players", this.enemy), (snap) => {
            const data = snap.data();
            if (!data) return;
            this.remoteInformation = data;
        })
        this.snapshots.push(sub);
    }
    // function that gets the eenmy bloons, used to see if the enemys bloons are done in addition to their own for next wave to start
    private getStateBloons(): void {
        if (this.remote) return;
        // gets the enemys state 
        const sub = onSnapshot(doc(db, "games", this.room, "players", this.enemy), (snap) => {
            const data = snap.data();
            if (!data) return;
            const opponentPublishedBloons = data.bloons || [];
            this.opponentActiveBloons = opponentPublishedBloons.length;
        })
        this.snapshots.push(sub);
    }
    // remote games only, draws the remote state gotten from the enemys game
    private drawRemoteScreen(): void {
        if (!this.remoteInformation) return;
        // blank array if nothing was gotten for that type
        const towers = this.remoteInformation.towers || [];
        const bloons = this.remoteInformation.bloons || [];
        const projectiles = this.remoteInformation.projectiles || [];
        this.currentHp = this.remoteInformation.hp
        this.updateHpBar();
        // doing simple drawing thats it for each thing
        for (let t of towers) {
            let tower = new Rect(t.x, t.y, Tower.SIZE, Tower.SIZE, t.colour || "blue", this.canvas);
            tower.draw();
        }

        for (let b of bloons) {
            let bloon = new Circle(b.x, b.y, 20, b.colour, this.canvas)
            bloon.draw();
        }
        for (let p of projectiles) {
            let projectile = new Circle(p.x, p.y, 4, "yellow", this.canvas);
            projectile.draw();
        }
    }
    // toggles the placement mode varaible
    private togglePlacementMode(): void {
        this.controller.isClicked = false;
        this.placementMode = !this.placementMode;
        
    }
    // checks if its a valid placement
    private checkPlacement(): void {
        const mouseX: number = this.controller.mouseXMove
        const mouseY: number = this.controller.mouseYMove
        // the actual placement coordinates
        this.placementCoordsX = mouseX - Tower.SIZE / 2
        this.placementCoordsY = mouseY - Tower.SIZE / 2
        // check if you can place the tower at those coordinates
        const canPlace = this.canPlaceTower(mouseX - Tower.SIZE / 2, mouseY - Tower.SIZE / 2);
        // update varaibles and show the preview in a way depending on if you can place at those coordinates
        this.drawPreviewTower(mouseX, mouseY, canPlace);
        this.validPlacement = canPlace;
    }
    // draws the preview tower, at your cursor, which is x and y, red if you cannot place it and blue if you are able to place at this position
    // and you have enough money to place it
    private drawPreviewTower(x: number, y: number, canPlace: boolean): void {
        // the tower
        this.canvas.context.globalAlpha = 0.3;
        this.canvas.context.fillStyle = canPlace && this.money >= Tower.cost ? "blue" : "red";
        this.canvas.context.fillRect(x - Tower.SIZE / 2, y - Tower.SIZE / 2, Tower.SIZE, Tower.SIZE);
        // the tower radius
        this.canvas.context.beginPath();
        this.canvas.context.arc(x, y, 250, 0, 2 * Math.PI); 
        this.canvas.context.fill();
        this.canvas.context.globalAlpha = 1.0;

    }
    // does the actual spawning of the tower mechanic, this is run every frame to check
    private handleSpawnTower(): void {
        // checks if they clicked and validPlacement is true, validPlacement can only be true if they are in buildmode anyways F.Y.I
        if (this.controller.isClicked == true && this.validPlacement) {
            // check user even has enough money to place
            if (this.money >= Tower.cost) {
                // create tower at that position change the money and placementmode false and toggle ui
                const tower = new Tower(this.placementCoordsX, this.placementCoordsY, "blue", this.canvas, this);
                this._towers.push(tower);
                this.changeMoney(-250);
                this.placementMode = false;
                this.toggleUI();
            }

        }
        // isclicked is false after 
        this.controller.isClicked = false;
    }
    // checks if you can place a tower at those coordinate positions, uses the map
    private canPlaceTower(x: number, y: number) {
        // does it every 8 pixels, since if any of those pixels are invalid, then the whole area is invalid to place no need for eveyr pixel
        for (let i = x; i < x + 64; i += 8) {
            for (let j = y; j < y + 64; j += 8) {
                // bounds check, makes sure you also cant place outside the game/canvas
                if (x < 0 || y < 0 || x + Tower.SIZE > this.canvas.width || y + Tower.SIZE > this.canvas.height) return false;
                // then checks the actual map part using the mask to see if you can place at that position
                if (!this.mask.canPlace(i, j)) return false;
            }
        }
        // sees if you are trying to place it on any towers you already placed, so you cannot overlap towers
        for (let t of this._towers) {
            if (x < t.x + t.width && x + Tower.SIZE > t.x && y < t.y + t.height && y + Tower.SIZE > t.y) { // means they overlapped, its && because they need to make sure both x and y axis of the two shapes overlap, or else they would just be side by side 
                return false;
            }
        }
        return true;
    }
    private waveColours(): string[] {
        const colours: string[] = [];
        const count: number = Math.min(5 + this.currentWave, 50);
        for (let i = 0; i < count; i++) {
            // determine the maximum colour of bloon it can spawn for this wave, basicalyl the strength
            let maxColour = Math.min(Math.floor(this.currentWave / 5), this._colours.length - 1); 
            // pick a random colour from 0 to the maxcolour
            let colourIndex = Math.floor(Math.random() * (maxColour + 1));
            // spawn the bloon and the colour it picked
            colours.push(this._colours[colourIndex]);
            // wait the delay before spawning the next one
        }
        return colours;
    } 
    // function for a bloown algorithm its very simple at the moment
    private async bloonAlgo(colours: string[]): Promise<void> {
        if (this.waveInProgress) return; // return if theres already a wave dont start a new one
        // give the user the money since a new wave has started
        this.changeMoney(this.moneyPerWave);
        // a new wave has started
        this.waveInProgress = true;
        // determine delay between spawning each bloon, starts at 1000 and decreases slightly each wave with minimum at 20 ms
        let delay: number = Math.max(1000 - (this.currentWave * 5), 20);
        for (const colour of colours) {
            this.spawnBloon(colour);
            await this.sleep(delay);
        }
        this.waveInProgress = false;
    }
    // change the money of the user and update the money ui
    private changeMoney(amount: number): void {
        this.money += amount;
        document.getElementById("money-text").textContent = String(this.money);
    }
    // begin the waves, called when the game first starts, and immediently start the next wave only when there are no more bloons left for the
    // currnet wave
    private async waveLoop(): Promise<void> {
        while (!this.gameResultHandled) {
            if (!this.gameRunning) {
                await this.sleep(100);
                continue;
            }
            while (this.gameRunning && (this._bloons.length > 0 || this._enemyBloons.length > 0 || this.opponentActiveBloons > 0)) {
                await this.sleep(200);
            }
            if (!this.gameRunning || this.gameResultHandled) break;
            // player 1 runs waves locally
            if (this.player == "player1") {
                this.currentWave++;
                this.updateWaveUI();
                const colours = this.waveColours();
                await updateDoc(doc(db, "games", this.room), {
                    waveBloons: colours,
                    waveNum: this.currentWave
                })
                await this.bloonAlgo(colours);
            }
            
        }
    }
    // only player2 uses this function gets the waves from firestore and generates them locally
    private listenToWaves(): void {
        const sub = onSnapshot(doc(db, "games", this.room), async (snap) => {
            const data = snap.data();
            if (!data) return;
            const colours = data.waveBloons || [];
            const wave = data.waveNum;
            if (colours.length == 0) return;
            if (wave > this.currentWave) {
                this.currentWave = wave
                this.updateWaveUI();
                this.bloonAlgo(colours);
            }
        })
        this.snapshots.push(sub);
    }
    // player takes damage, called when a bloon hits the end
    public takeDamage(hp: number): void {
        this.currentHp -= hp;
        // check if user hp is 0, if so the game is over
        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.endGame();
        }
        // update the hp ui
        this.updateHpBar();
    }
    private updateWaveUI(): void {
        const wave = document.getElementById("wave");
        if (wave) {
            wave.textContent = String(this.currentWave);
        }
    }
    // updates the hp ui of the game
    private updateHpBar(): void {
        // check if its the remote or local hp you need to update
        const hpPercentage = (this.currentHp / this.maxHp) * 100;
        const hp = !this.remote ? "hp-fill-my" : "hp-fill-enemy"
        document.getElementById(hp).style.width = `${hpPercentage}%`;
    }
    // delay function, whatever ms you put is the delay before the next thing
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // gets the deltatime which is used to calculate right movement no matter the frames
    private getDeltaTime(): void {
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.previousTime) / 1000;
        this.previousTime = currentTime;
    }
    // updates everything, basically does the movement then checks for collision, the placements everything
    private updateEverything(): void {

        this.getDeltaTime();
        // if game isnt running dotn do it and also if its remote since game mechanics dont work on remote
        if (!this.gameRunning) return;
        if (this.remote) return;
        if (!this.stateLoaded) return;
        // does the movement for both bloons
        for (let b of this._bloons) {
            b.move(this.deltaTime);
        }
        for (let b of this._enemyBloons) {
            b.move(this.deltaTime);
        }
        // does the shooting and cleanup any projectiles
        for (let t of this._towers) {
            t.shootProjectile(this.deltaTime);
            t.cleanupProjectiles(this._bloons);
        }
        // checks if its placement and does the fdunctions accordingly
        if (this.placementMode) {
            this.checkPlacement();
            this.handleSpawnTower();
        }
        // check if any projectiles hit any bloons
        this.checkCollision();
    }
    // draw everything
    private drawEverything() {
        // draw every bloon
        for (let b of this._bloons) {
            b.draw();
        }
        for (let b of this._enemyBloons) {
            b.draw();
        }
        // draw the towers and also the radius if their mouse is hovering over that certain tower
        for (let t of this._towers) {
            const mouseX = this.controller.mouseXMove;
            const mouseY = this.controller.mouseYMove;
            t.draw();
            if (mouseX >= t.x && mouseX <= t.x + t.width && mouseY >= t.y && mouseY <= t.y + t.height) t.drawRadius();           
            t.drawProjectiles(this.deltaTime);
        }

    }
    // spawns a bloon of a certain colour
    private spawnBloon(colour: string): void {
        const hp: number = this._colours.indexOf(colour) + 1    
        const startIndex = 0
        const bloon = new Bloons(Bloons.pathing[startIndex].x, Bloons.pathing[startIndex].y, this.canvas, colour,hp, this, false, startIndex);
        this.bloons.push(bloon);
    }
    // getters
    public get colours(): string[] {
        return this._colours;
    }

    public get bloons(): Bloons[] {
        return this._bloons
    }
    // checks for collision between 
    private checkCollision(): void {
        this._towers.forEach((tower) => {
            // go through each projectile and check if it hit their personal targets trhey have assigned
            for (let i = tower.projectiles.length - 1; i >= 0; i--) {
                const dx: number = tower.projectiles[i].target.x - tower.projectiles[i].x;
                const dy: number = tower.projectiles[i].target.y - tower.projectiles[i].y;
                const dist: number = Math.sqrt(dx * dx + dy * dy);
                // check if the distance is less than the two sizes, meaning its overlapped
                if (dist < Bloons.size + Projectile.size) {
                    // pop the projectile, pop the bloon and increase the money by one since each pop gives one dollar and remove the projectile
                    tower.projectiles[i].target.pop();
                    this.changeMoney(1);
                    tower.removeProjectile(i);
                }
            }
        });
    }
    // toggle the ui
    private toggleUI(): void {
        const shop = document.getElementById("shop");
        const button = document.getElementById("button");
        this.uiOpen = !this.uiOpen;
        // add heigh meaning the shop is opened and change the icon
        if (this.uiOpen) {
            shop.style.height = "100px";  
            button.style.bottom = "100px";
            button.innerHTML = "&#9660;"; 
        } else {
            shop.style.height = "0px";    
            button.style.bottom = "0px";
            button.innerHTML = "&#9650;"; 
        }
    }
    // getter for bloons
    public get enemyBloons(): Bloons[] {
        return this._enemyBloons;
    }
    // called when someones hp drops to 0
    private async endGame(): Promise <void>{
        this.gameRunning = false;
        // update the hp bar 
        await this.updateHpBar();
        // only local will do the game over, so its not double
        if (!this.remote) {
            // update the current player to be 0 end
            await updateDoc(doc(db, "games", this.room, "players", this.player), {
                hp: 0
            });
            // update the document of the room to show that the game is over since one player died
            await updateDoc(doc(db, "games", this.room), {
                gameOver: true,
                loser: this.player 
            });
        }
    }
    
    // listens to check if the game is over
    private async listenToGameState(): Promise<void> {
        // checks on every document change  
        const sub = onSnapshot(doc(db, "games", this.room), async (docSnap) => {
            const data = docSnap.data();
            if (!data) return;

            if (data.player1 || data.player2) {
                this.gameRunning = false;
                return;
            }
            if (this.gameRunning == false && !data.gameOver) {
                this.gameRunning = true;
            }
            // check if the game is over from the document
            if (data && data.gameOver === true) {
                // makes sure it doesnt get called again since it calls twice
                if (this.gameResultHandled) return;
                // show that the game result is handled
                this.gameResultHandled = true;
                this.gameRunning = false;
                // clear the interval for the game
                clearInterval(this.gameInterval);
                // makes sure only the local game does the you lost or you won
                if (!this.remote) {
                    if (data.loser === this.player) {
                        document.getElementById("end-screen").hidden = false;
                        document.getElementById("end-message").textContent = "You Lost!";
                    } else {
                        document.getElementById("end-screen").hidden = false;
                        document.getElementById("end-message").textContent = "You Won!";
                    }
                    
                }
                for (const snap of this.snapshots) {
                    snap();
                }
                this.snapshots = [];
            }
        });
        this.snapshots.push(sub);
    }
}