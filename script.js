// board

let board;
const rowCount = 21;
const columnCount = 19;
const tilesize = 32;
const boardwidth = columnCount * tilesize;
const boardHeight = rowCount * tilesize;
let context;

// image elements

let blueGhostImage, redGhostImage, orangeGhostImage, pinkGhostImage;
let pacmanUpImage, pacmanDownImage, pacmanLeftImage, pacmanRightImage;
let wallImage, scaredGhostImage;

let powerSound, ghostEatSound, bgMusic;

// MAP

const tileMap = [
"XXXXXXXXXXXXXXXXXXX",
"XO      X      OXXX",
"X XX XXX X XXX XX X",
"X                 X",
"X XX X XXXXX X XX X",
"X    X       X    X",
"XXXX XXXX XXXX XXXX",
"XXXX X       X XXXX",
"XXXX X XX XX X XXXX",
"X       bpor      X",
"XXXX X XXXXX X XXXX",
"XXXX X       X XXXX",
"XXXX X XXXXX X XXXX",
"X        X        X",
"X XX XXX X XXX XX X",
"X  X     P     X  X",
"XX X X XXXXX X X XX",
"X    X   X   X    X",
"X XXXXXX X XXXXXX X",
"XO               OX",
"XXXXXXXXXXXXXXXXXXX"
];

const walls = new Set();
const foods = new Set();
const ghosts = new Set();
const powerPellets = new Set();

let pacman;
let score = 0;

// movement

let velocityX = 0, velocityY = 0;
let nextVelocityX = 0, nextVelocityY = 0;
const speed = 2;

let powerMode = false;
let powerTimer = 0;

class Block {
    constructor(image, x, y, width, height) {
        this.image = image;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.startX = x;
        this.startY = y;

        this.vx = 0;
        this.vy = 0;
    }
}

// LOAD

function loadImages() {
    wallImage = new Image(); wallImage.src = "images/wall.png";

    blueGhostImage = new Image(); blueGhostImage.src = "images/blueGhost.png";
    redGhostImage = new Image(); redGhostImage.src = "images/redGhost.png";
    orangeGhostImage = new Image(); orangeGhostImage.src = "images/orangeGhost.png";
    pinkGhostImage = new Image(); pinkGhostImage.src = "images/pinkGhost.png";

    scaredGhostImage = new Image(); scaredGhostImage.src = "images/scaredGhost.png";

    powerSound = new Audio("audio/power.mp3");
    ghostEatSound = new Audio("audio/eatGhost.mp3");
    bgMusic = new Audio("audio/bgm.mp3");

    pacmanUpImage = new Image(); pacmanUpImage.src = "images/pacmanUp.png";
    pacmanDownImage = new Image(); pacmanDownImage.src = "images/pacmanDown.png";
    pacmanLeftImage = new Image(); pacmanLeftImage.src = "images/pacmanLeft.png";
    pacmanRightImage = new Image(); pacmanRightImage.src = "images/pacmanRight.png";
}

function loadMap() {
    walls.clear(); foods.clear(); ghosts.clear(); powerPellets.clear();

    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < columnCount; c++) {

            let ch = tileMap[r][c];
            let x = c * tilesize;
            let y = r * tilesize;

            if (ch === 'X') walls.add(new Block(wallImage, x, y, tilesize, tilesize));
            else if (ch === 'b') ghosts.add(new Block(blueGhostImage, x, y, tilesize, tilesize));
            else if (ch === 'o') ghosts.add(new Block(orangeGhostImage, x, y, tilesize, tilesize));
            else if (ch === 'p') ghosts.add(new Block(pinkGhostImage, x, y, tilesize, tilesize));
            else if (ch === 'r') ghosts.add(new Block(redGhostImage, x, y, tilesize, tilesize));
            else if (ch === 'P') pacman = new Block(pacmanRightImage, x, y, tilesize, tilesize);
            else if (ch === 'O') powerPellets.add(new Block(null, x+10, y+10, 12, 12));
            else if (ch === ' ') foods.add(new Block(null, x+14, y+14, 4, 4));
        }
    }
}

// GAME LOOP

function update() {
    context.clearRect(0,0,board.width,board.height);
    move();
    draw();
    requestAnimationFrame(update);
}

// MOVEMENT

function move() {

    if (!collision(pacman.x + nextVelocityX, pacman.y + nextVelocityY)) {
        velocityX = nextVelocityX;
        velocityY = nextVelocityY;
    }

    if (!collision(pacman.x + velocityX, pacman.y + velocityY)) {
        pacman.x += velocityX;
        pacman.y += velocityY;
    }

    foods.forEach(f => {
        if (hit(pacman, f)) {
            foods.delete(f);
            score += 10;
        }
    });

    powerPellets.forEach(p => {
        if (hit(pacman, p)) {
            powerPellets.delete(p);
            powerMode = true;
            powerTimer = 300;
            score += 50;
            powerSound.play();
        }
    });

    if (powerMode) {
        powerTimer--;
        if (powerTimer <= 0) powerMode = false;
    }

    moveGhosts();
}

// 🧠 SMART GHOST AI

function moveGhosts() {
    for (let ghost of ghosts) {

        let dirs = [[2,0],[-2,0],[0,2],[0,-2]];
        let valid = dirs.filter(d => !collision(ghost.x+d[0], ghost.y+d[1]));

        valid = valid.filter(d => !(d[0] === -ghost.vx && d[1] === -ghost.vy));

        let bestDir = null;
        let bestDist = Infinity;

        for (let d of valid) {
            let nx = ghost.x + d[0];
            let ny = ghost.y + d[1];

            let dist = Math.abs(nx - pacman.x) + Math.abs(ny - pacman.y);

            if (powerMode) {
                if (dist > bestDist) continue;
                bestDist = dist;
                bestDir = d;
            } else {
                if (dist < bestDist) {
                    bestDist = dist;
                    bestDir = d;
                }
            }
        }

        if (bestDir) {
            ghost.vx = bestDir[0];
            ghost.vy = bestDir[1];
        }

        ghost.x += ghost.vx;
        ghost.y += ghost.vy;

        if (hit(pacman, ghost)) {

            if (powerMode) {
                ghost.x = ghost.startX;
                ghost.y = ghost.startY;
                ghost.vx = 0;
                ghost.vy = 0;

                score += 100;
                ghostEatSound.play();
            } else {
                alert("Game Over");
                location.reload();
            }
        }
    }
}

// DRAW

function draw() {

    walls.forEach(w => context.drawImage(w.image, w.x, w.y, w.width, w.height));

    context.fillStyle = "white";
    foods.forEach(f => context.fillRect(f.x, f.y, f.width, f.height));

    context.fillStyle = "orange";
    powerPellets.forEach(p => {
        context.beginPath();
        context.arc(p.x, p.y, 6, 0, Math.PI*2);
        context.fill();
    });

    ghosts.forEach(g => {
        let img = powerMode ? scaredGhostImage : g.image;
        context.drawImage(img, g.x, g.y, g.width, g.height);
    });

    context.drawImage(pacman.image, pacman.x, pacman.y, pacman.width, pacman.height);

    context.fillStyle = "yellow";
    context.fillText("Score: " + score, 10, 20);
}

// ✅ INPUT (SCROLL FIX ADDED)

function movePacman(e) {

    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) {
        e.preventDefault(); // 🔥 FIX
    }

    if (e.code === "ArrowUp") {
        nextVelocityX = 0;
        nextVelocityY = -speed;
        pacman.image = pacmanUpImage;
    }
    else if (e.code === "ArrowDown") {
        nextVelocityX = 0;
        nextVelocityY = speed;
        pacman.image = pacmanDownImage;
    }
    else if (e.code === "ArrowLeft") {
        nextVelocityX = -speed;
        nextVelocityY = 0;
        pacman.image = pacmanLeftImage;
    }
    else if (e.code === "ArrowRight") {
        nextVelocityX = speed;
        nextVelocityY = 0;
        pacman.image = pacmanRightImage;
    }
}

// COLLISION

function collision(x, y) {
    for (let w of walls) {
        if (
            x < w.x + w.width &&
            x + tilesize > w.x &&
            y < w.y + w.height &&
            y + tilesize > w.y
        ) return true;
    }
    return false;
}

function hit(a,b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

// INIT

window.onload = function() {
    board = document.getElementById("board");
    board.width = boardwidth;
    board.height = boardHeight;
    context = board.getContext("2d");

    loadImages();
    loadMap();

    document.addEventListener("keydown", movePacman);

    update();
}