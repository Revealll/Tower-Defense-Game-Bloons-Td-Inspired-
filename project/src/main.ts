import { System } from "./system.js";
import { db, doc, setDoc, getDoc, updateDoc, collection, onSnapshot, auth, onAuthStateChanged, signInAnonymously, signOut, deleteDoc} from "./firebase.js";
// element getters from html
const createGame = document.getElementById("create-game");
const joinGame = document.getElementById("join-game");
const lobby = document.getElementById("lobby");
const gameScreen = document.getElementById("game-screen");
const room = document.getElementById("room-code") as HTMLInputElement;
const ready = document.getElementById("ready") as HTMLButtonElement;
const wait = document.getElementById("waiting-room");
const roomDisplay = document.getElementById("room");
const login = document.getElementById("login");
const logout = document.getElementById("logout");
const loginScreen = document.getElementById("login-screen");
const endButton = document.getElementById("end-button");
const endScreen = document.getElementById("end-screen");
const leaveButton = document.getElementById("leave-room");
(window as any).auth = auth; // so i can signout through terminal and console
// remote and local game
let remoteSystem: System;
let localSystem: System;
// check if the game has already started, so it does not instantly pop again when its catching up
let gameHasStarted = false; 
/*
* Checks if both players in that lobby has clicked the ready button, if so, then it has started and started equals true
* roomCode: the roomCode of the current game
* */
function listenReady(roomCode: string) {
    const players = collection(db, "games", roomCode, "players");
    // if a change occurs in that specific collection, then check if both players have clicked ready 
    const snap = onSnapshot(players, async (snapshot) => {
        if (gameHasStarted) return;
        let p1Rdy: boolean = false;
        let p2Rdy: boolean = false;
        const playerCount = snapshot.size;
        snapshot.forEach(player => {
            if (player.id == "player1") p1Rdy = player.data().ready;
            if (player.id == "player2") p2Rdy = player.data().ready;
        })
        const id = sessionStorage.getItem("playerId");
        if (playerCount < 2 && id == "player2") {
            if (auth.currentUser) {
                await updateDoc(doc(db, "users", auth.currentUser.uid), {
                    activeRoom: null,
                    playerId: null
                });
            }
            sessionStorage.removeItem("roomCode");
            sessionStorage.removeItem("playerId");
            wait.hidden = true;
            lobby.hidden = false;
            ready.hidden = true;
            snap();
            return;
        }
        // make sure only the person who created the room can tell the system that the game for this specific roomcode is started
        if (p1Rdy && p2Rdy && id == "player1") {
            await updateDoc(doc(db, "games", roomCode), {
                started: true
            });
        }
    })
}
leaveButton.addEventListener("click", async () => {
    const code = sessionStorage.getItem("roomCode");
    const id = sessionStorage.getItem("playerId");
    if (code && id) {
        if (id == "player1") {
            const snap = await getDoc(doc(db, "games", code, "players", "player2"));
            if (snap.exists()) {
                await deleteDoc(doc(db, "games", code, "players", "player1"));
                await updateDoc(doc(db, "games", code), {
                    player1: true, 
                });
            } else {
                await deleteDoc(doc(db, "games", code, "players", "player1"));
                await deleteDoc(doc(db, "games", code));
            }
        } else if (id == "player2") {
            await deleteDoc(doc(db, "games", code, "players", "player2"));
            await updateDoc(doc(db, "games", code), {
                    player2: true, 
                });
        }
    }
    if (auth.currentUser) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            activeRoom: null,
            playerId: null
        });
    }
    wait.hidden = true;
    lobby.hidden = false;
    ready.hidden = true;
    sessionStorage.removeItem("roomCode");
    sessionStorage.removeItem("playerId");
});
// checks if the started for that current lobby has started, if so, then create the two games
function listenStart(roomCode: string) {
    const state = doc(db, "games", roomCode);
    // if a change occurs in that specific collection this is called
    onSnapshot(state, (snapshot) => {
        if (!snapshot.data()) return;
        // also make sure game can only start once
        console.log("Game started status: ", snapshot.data().started);
        console.log("Game has started variable: ", gameHasStarted);
        if (snapshot.data().started == true && !gameHasStarted) {
            gameHasStarted = true;
            // reveal the game and hide the lobby screen
            wait.hidden = true;
            gameScreen.hidden = false;
            ready.hidden = true;
            // create the remote and local games with the id being themselves
            const me = sessionStorage.getItem("playerId");
            localSystem  = new System("screen", false, me, false);     // interactive
            remoteSystem = new System("remote-screen", true, me, false); // view-only
            // only start the game for the local, since the remote is just drawing, no actual game knowledge
            localSystem.startMatch();
        }
    })
    ready.disabled = false;
}
// creates the random 4 digit code for the room
function createCode(): string {
    let roomCode: string = "";
    for (let i = 0; i < 4; i++) {
        // first randoms if its a number or letter, then randoms that specific number or letter 4 times
        const ascii = Math.random() < 0.5 ? Math.floor(Math.random() * 10) + 48 : Math.floor(Math.random() * (90 - 65 + 1)) + 65;
        roomCode += String.fromCharCode(ascii);
    }
    return roomCode;
}
// add event listener for clicking on the ready button
ready.addEventListener("click", async () => {
    // checks which room and which player you are
    const playerId = sessionStorage.getItem("playerId");
    const roomCode = sessionStorage.getItem("roomCode");
    // update the database showing that this specific player is ready
    await updateDoc(doc(db, "games", roomCode, "players", playerId), {
        ready: true
    });
    // disable ready button so they cant press again
    ready.disabled = true;
})
endButton.addEventListener("click", async () => {
    endScreen.hidden = true;
    gameHasStarted = false;
    lobby.hidden = false;
    gameScreen.hidden = true;
    if (auth.currentUser) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            activeRoom: null,
            playerId: null
        });
        
    }
    const roomCode = sessionStorage.getItem("roomCode");
    const playerId = sessionStorage.getItem("playerId");
    if (roomCode && playerId === "player1") {
        await deleteDoc(doc(db, "games", roomCode, "players", "player1"));
        await deleteDoc(doc(db, "games", roomCode, "players", "player2"));
        await deleteDoc(doc(db, "games", roomCode));

    }
    sessionStorage.removeItem("roomCode");
    sessionStorage.removeItem("playerId");
});
// add event listener for the click of the creating room
createGame.addEventListener("click", async () => {
    // create the code and wait until the code is created
    let roomCode = createCode();
    await createRoom(roomCode);
    // display the code so they can send to the other user
    roomDisplay.textContent = roomCode;
    // hide the lobby and show the waiting/ready screen
    lobby.hidden = true;
    wait.hidden = false;
    ready.hidden = false;
    // set the roomcode and the that the player who create dthe room is player1
    sessionStorage.setItem("roomCode", roomCode);
    sessionStorage.setItem("playerId", "player1");
    // set the snapshots
    listenReady(roomCode);
    listenStart(roomCode);
});
logout.addEventListener("click", async () => {
    await signOut(auth);
})
login.addEventListener("click", async() => {
    await signInAnonymously(auth);
})
function signIn() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            loginScreen.hidden = false;
            lobby.hidden = true; 
            return;
        } 
        loginScreen.hidden = true;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        // for if they refresh ro close tab and want to come back cause still in a game
        if (userDoc.exists() && userDoc.data().activeRoom && userDoc.data().playerId) {
            const data = userDoc.data();
            const code = data.activeRoom;
            const id = data.playerId;
            const gameDoc = await getDoc(doc(db, "games", code));
            if (!gameDoc.exists()) {
                await updateDoc(doc(db, "users", user.uid), {
                    activeRoom: null,
                    playerId: null
                });
                lobby.hidden = false;
                return;
            }
            const gameData = gameDoc.data();
            sessionStorage.setItem("roomCode", code);
            sessionStorage.setItem("playerId", id);
            if (gameData.started == false) {
                await updateDoc(doc(db, "games", code), { [id]: false });
                lobby.hidden = true;
                wait.hidden = false;
                ready.hidden = false;
                roomDisplay.textContent = code;
                listenReady(code);
                listenStart(code);
                return;
            }
            if (gameData.started == true) {
                gameScreen.hidden = false;
                localSystem  = new System("screen", false, data.playerId, true);     
                remoteSystem = new System("remote-screen", true, data.playerId, true); 
                await updateDoc(doc(db, "games", sessionStorage.getItem("roomCode")), { [sessionStorage.getItem("playerId")]: false });
                localSystem.startMatch();
                return;
            }
        }
        lobby.hidden = false;
    })
}
// add event listener for joinjing game checking if the code is a valid code
joinGame.addEventListener("click", async () => {
    // get the value they typed in
    let roomCode = room.value;
    // check if the code is valid
    if (await joinRoom(roomCode)) {
        // hide the lobby and show the ready screen if its valid code
        lobby.hidden = true;
        wait.hidden = false;
        ready.hidden = false;
        roomDisplay.textContent = roomCode;
        // set the other player who didnt create as player 2 
        sessionStorage.setItem("roomCode", roomCode);
        // set the same snapshots
        listenReady(roomCode);
        listenStart(roomCode);
    }
    room.value = "";
})

// checks if the code the user typed in to try to join is a valid room, meaning it was created by someone who did create room 
// and create the player2 then if so
async function joinRoom(roomCode: string): Promise<boolean> {
    const document = await getDoc(doc(db, "games", roomCode));
    // technically not needed since you cant even run the function if not logged in - its hidden but good to have
    if (!auth.currentUser) {
        console.log("Not a user")
        return false;
    }
    // check if the room even exists
    if (!document.exists()) {
        console.log("room not found");
        return false;
    } 
    const p2 = await getDoc(doc(db, "games", roomCode, "players", "player2"));
    if (!p2.exists()) {
        // create the player 2 which is the player who joined the room
        await setDoc(doc(db, "games", roomCode, "players", "player2"), {
        uid: auth.currentUser.uid,
        hp: 100,
        money: 500,
        towers: [],
        bloons: [],
        projectiles: [],
        otherBloons: [],
        ready: false
        }); 
        await updateDoc(doc(db, "games", roomCode), {
            player2: false
        });
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            activeRoom: roomCode,
            playerId: "player2"
        });
        sessionStorage.setItem("playerId", "player2");
        return true;
    }
    console.log("Room full");
    return false;
}
// creates the room with the created roomcode and also creates the player1 which is the player who created the room
async function createRoom(roomCode: string) {
    if (!auth.currentUser) {
        console.log("Not a user")
        return false;
    }
    await setDoc(doc(db, "games", roomCode), {
        started: false,
        gameOver: false,
        player1: false,
        player2: false,
        waveBloons: [],
        waveNum: 1
    });
    await setDoc(doc(db, "games", roomCode, "players", "player1"), {
        uid: auth.currentUser.uid,
        hp: 100,
        money: 500,
        towers: [],
        bloons: [],
        projectiles: [],
        otherBloons: [],
        ready: false
    });
    if (auth.currentUser) {
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            activeRoom: roomCode,
            playerId: "player1"
        });
    }
}
signIn();
window.addEventListener("beforeunload", () => {
    const roomCode = sessionStorage.getItem("roomCode");
    const playerId = sessionStorage.getItem("playerId");
    if (!roomCode || !playerId) return;
    updateDoc(doc(db, "games", sessionStorage.getItem("roomCode")), { [sessionStorage.getItem("playerId")]: true });
});
