// board

let board;
const rowCount = 21;
const columnCount = 19;
const tilesize = 32;
const boardwidth = columnCount * tilesize;
const boardHeight = rowCount * tilesize;
let context;
let animationId;

// image elements

let blueGhostImage;
let redGhostImage;
let orangeGhostImage;
let pinkGhostImage;
let pacmanUpImage;
let pacmanDownImage;
let pacmanLeftImage;
let pacmanRightImage;
let wallImage;
let scaredGhostImage;

let powerSound;
let ghostEatSound;
let bgMusic;
let gameOverSound;

function loadImages() {

    wallImage = new Image();
    wallImage.src = "images/wall.png"; 

    blueGhostImage = new Image();
    blueGhostImage.src = "images/blueGhost.png";
    redGhostImage = new Image();
    redGhostImage.src = "images/redGhost.png";
    orangeGhostImage = new Image();
    orangeGhostImage.src = "images/orangeGhost.png";
    pinkGhostImage = new Image();
    pinkGhostImage.src = "images/pinkGhost.png";

    scaredGhostImage = new Image();
    scaredGhostImage.src = "images/scaredGhost.png";

    // sounds

    powerSound = new Audio("audio/power.mp3");
    ghostEatSound = new Audio("audio/eatGhost.mp3");
    bgMusic = new Audio("audio/bgm.mp3");
    gameOverSound = new Audio("audio/gameover.mp3");

    bgMusic.loop = true;
    bgMusic.volume = 0.4;

    pacmanUpImage = new Image();
    pacmanUpImage.src = "images/pacmanUp.png";
    pacmanDownImage = new Image();
    pacmanDownImage.src = "images/pacmanDown.png";
    pacmanLeftImage = new Image();
    pacmanLeftImage.src = "images/pacmanLeft.png";
    pacmanRightImage = new Image();
    pacmanRightImage.src = "images/pacmanRight.png";
}

// Wall Map

//X = wall, P = pac-man, ' ' = food

//Ghosts: b = blue, o = orange, p = pink, r = red

const tileMap = [
    "XXXXXXXXXXXXXXXXXXX",
    "X        X        X",
    "X XX XXX X XXX XX X",
    "X                 X",
    "X XX X XXXXX X XX X",
    "X    X       X    X",
    "XXXX XXXX XXXX XXXX",
    "XXXX X       X XXXX",
    "XXXX X XXrXX X XXXX",
    "X       bpo       X",
    "XXXX X XXXXX X XXXX",
    "XXXX X       X XXXX",
    "XXXX X XXXXX X XXXX",
    "X        X        X",
    "X XX XXX X XXX XX X",
    "X  X     P     X  X",
    "XX X X XXXXX X X XX",
    "X    X   X   X    X",
    "X XXXXXX X XXXXXX X",
    "X                 X",
    "XXXXXXXXXXXXXXXXXXX" 
];

const walls  = new Set();
const foods = new Set();
const ghosts = new Set();
const powerPellets = new Set();
let pacman;

// Score

let score = 0;

// Movement

let velocityX = 0;
let velocityY = 0;
let nextVelocityX = 0;
let nextVelocityY = 0;
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

function loadMap() {

    walls.clear();
    foods.clear();
    ghosts.clear();
    powerPellets.clear();

    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < columnCount; c++) {
            const row = tileMap[r];
            const tileMapChar = row[c];

            const x = c * tilesize;
            const y = r * tilesize;

            if (tileMapChar == 'X') {
                walls.add(new Block(wallImage, x, y, tilesize, tilesize));  
            }
            else if (tileMapChar == 'b') {
                ghosts.add(new Block(blueGhostImage, x, y, tilesize, tilesize));
            }
            else if (tileMapChar == 'o') {
                ghosts.add(new Block(orangeGhostImage, x, y, tilesize, tilesize));
            }
            else if (tileMapChar == 'p') {
                ghosts.add(new Block(pinkGhostImage, x, y, tilesize, tilesize));
            }
            else if (tileMapChar == 'r') {
                ghosts.add(new Block(redGhostImage, x, y, tilesize, tilesize));
            }
            else if (tileMapChar == 'P') {
                pacman = new Block(pacmanRightImage, x, y, tilesize, tilesize);
            }
            else if (tileMapChar == ' ') {

                if ((r === 1 && c === 1) ||
                    (r === 1 && c === columnCount-2) ||
                    (r === rowCount-2 && c === 1) ||
                    (r === rowCount-2 && c === columnCount-2)) {

                    powerPellets.add(new Block(null, x + 10, y + 10, 12, 12));
                } else {
                    foods.add(new Block(null, x + 14, y + 14, 4, 4));
                }
            }
        }
    }
}

function resizeCanvas() {
    let screenWidth = window.innerWidth;
    let screenHeight = window.innerHeight;

    let scale = Math.min(
        screenWidth / boardwidth,
        screenHeight / boardHeight
    );

    // FIXED: real canvas scaling
    board.width = boardwidth * scale;
    board.height = boardHeight * scale;

    context.setTransform(scale, 0, 0, scale, 0, 0);
}

window.onload = function() {

    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardwidth;
    context = board.getContext("2d");

    // optional crisp rendering
    context.imageSmoothingEnabled = false;

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    loadImages();
    loadMap();

    document.addEventListener("keydown", movePacman);

    document.addEventListener("keydown", () => {
        bgMusic.play();
    }, { once: true });

    update();

}

function update() {
    context.clearRect(0, 0, board.width, board.height);

    move();
    draw();

    animationId = requestAnimationFrame(update);
}

// Checking The Alignment 

function isAligned(obj) {
    return obj.x % tilesize === 0 && obj.y % tilesize === 0;
}

// Body Movement

function move() {

    if (isAligned(pacman)) {

        pacman.x = Math.round(pacman.x / tilesize) * tilesize;
        pacman.y = Math.round(pacman.y / tilesize) * tilesize;

        let testX = pacman.x + nextVelocityX;
        let testY = pacman.y + nextVelocityY;

        if (!collision(testX, testY)) {
            velocityX = nextVelocityX;
            velocityY = nextVelocityY;
        }
    }

    let nextX = pacman.x + velocityX;
    let nextY = pacman.y + velocityY;

    if (!collision(nextX, nextY)) {
        pacman.x = nextX;
        pacman.y = nextY;
    }

    foods.forEach(food => {
        if (hit(pacman, food)) {
            foods.delete(food);
            score += 10;
        }
    });

    powerPellets.forEach(p => {
        if (hit(pacman, p)) {
            powerPellets.delete(p);
            powerMode = true;
            powerTimer = 300;
            score += 50;

            powerSound.currentTime = 0;
            powerSound.play();
        }
    });

    if (powerMode) {
        powerTimer--;
        if (powerTimer <= 0) powerMode = false;
    }

    if (foods.size === 0 && powerPellets.size === 0) {
        alert("YOU WIN! Score: " + score);
        location.reload();
    }

    moveGhosts();
}

// Ghost

function moveGhosts() {
    for (let ghost of ghosts) {

        if (isAligned(ghost)) {

            let dirs = [
                [speed,0],[-speed,0],[0,speed],[0,-speed]
            ];

            let validDirs = [];

            for (let dir of dirs) {
                let nx = ghost.x + dir[0];
                let ny = ghost.y + dir[1];

                if (!collision(nx, ny)) {
                    validDirs.push(dir);
                }
            }

            validDirs = validDirs.filter(dir => {
                return !(dir[0] === -ghost.vx && dir[1] === -ghost.vy);
            });

            if (validDirs.length === 0) validDirs = dirs;

            validDirs.sort((a, b) => {
                let distA = Math.hypot(ghost.x + a[0] - pacman.x, ghost.y + a[1] - pacman.y);
                let distB = Math.hypot(ghost.x + b[0] - pacman.x, ghost.y + b[1] - pacman.y);
                return distA - distB;
            });

            let chosen = (Math.random() < 0.2)
                ? validDirs[Math.floor(Math.random()*validDirs.length)]
                : validDirs[0];

            ghost.vx = chosen[0];
            ghost.vy = chosen[1];
        }

        let gx = ghost.x + ghost.vx;
        let gy = ghost.y + ghost.vy;

        if (hit(pacman, { x: gx, y: gy, width: ghost.width, height: ghost.height })) {
            if (powerMode) {
                ghost.x = ghost.startX;
                ghost.y = ghost.startY;
                score += 100;

                ghostEatSound.currentTime = 0;
                ghostEatSound.play();
            } else {
                bgMusic.pause();
                gameOverSound.currentTime = 0;
                gameOverSound.play();

                cancelAnimationFrame(animationId);

                setTimeout(() => {
                    alert("Game Over | Score: " + score);
                    location.reload();
                }, 500);
            }
            return;
        }

        if (!collision(gx, gy)) {
            ghost.x = gx;
            ghost.y = gy;
        }
    }
}

function draw() {
    
    for (let wall of walls) {
        context.drawImage(wall.image, wall.x, wall.y, wall.width, wall.height);
    }

    context.fillStyle = "white";
    for (let food of foods) {
        context.fillRect(food.x, food.y, food.width, food.height);
    }

    context.fillStyle = "orange";
    powerPellets.forEach(p => {
        context.beginPath();
        context.arc(p.x, p.y, 6, 0, Math.PI * 2);
        context.fill();
    });

    for (let ghost of ghosts) {
        let img = powerMode ? scaredGhostImage : ghost.image;
        context.drawImage(img, ghost.x, ghost.y, ghost.width, ghost.height);
    }

    if (pacman) {
        context.drawImage(pacman.image, pacman.x, pacman.y, pacman.width, pacman.height);
    }

    context.fillStyle = "yellow";
    context.font = "20px Arial";
    context.fillText("Score: " + score, 10, 25);
}

// BUFFERED INPUT

function movePacman(e) {
    if (e.code == "ArrowUp") {
        nextVelocityX = 0;
        nextVelocityY = -speed;
        pacman.image = pacmanUpImage;
    }
    else if (e.code == "ArrowDown") {
        nextVelocityX = 0;
        nextVelocityY = speed;
        pacman.image = pacmanDownImage;
    }
    else if (e.code == "ArrowLeft") {
        nextVelocityX = -speed;
        nextVelocityY = 0;
        pacman.image = pacmanLeftImage;
    }
    else if (e.code == "ArrowRight") {
        nextVelocityX = speed;
        nextVelocityY = 0;
        pacman.image = pacmanRightImage;
    }
}

// TOUCH CONTROLS

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener("touchend", (e) => {
    let dx = e.changedTouches[0].clientX - touchStartX;
    let dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
            nextVelocityX = speed;
            nextVelocityY = 0;
            pacman.image = pacmanRightImage;
        } else {
            nextVelocityX = -speed;
            nextVelocityY = 0;
            pacman.image = pacmanLeftImage;
        }
    } else {
        if (dy > 0) {
            nextVelocityX = 0;
            nextVelocityY = speed;
            pacman.image = pacmanDownImage;
        } else {
            nextVelocityX = 0;
            nextVelocityY = -speed;
            pacman.image = pacmanUpImage;
        }
    }

    bgMusic.play();
});

function collision(x, y) {
    for (let wall of walls) {
        if (
            x < wall.x + wall.width &&
            x + tilesize > wall.x &&
            y < wall.y + wall.height &&
            y + tilesize > wall.y
        ) {
            return true;
        }
    }
    return false;
}

function hit(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}