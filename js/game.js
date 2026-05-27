const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Game Configurations ---
const TILE_SIZE = 32; 
let gameState = "OVERWORLD"; // OVERWORLD, BATTLE, MENU

// --- Player Object ---
const player = {
    x: 4, // Grid positions
    y: 4,
    hp: 30,
    maxHp: 30,
    level: 1
};

// --- Simple 2D Grid Map (0 = Grass, 1 = Wall/Mountain) ---
const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,1,1,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// --- Input Handling ---
window.addEventListener("keydown", (e) => {
    if (gameState === "OVERWORLD") {
        let targetX = player.x;
        let targetY = player.y;

        if (e.key === "ArrowUp") targetY--;
        if (e.key === "ArrowDown") targetY++;
        if (e.key === "ArrowLeft") targetX--;
        if (e.key === "ArrowRight") targetX++;

        // Collision Check & Map Boundary Check
        if (targetY >= 0 && targetY < map.length && targetX >= 0 && targetX < map[0].length) {
            if (map[targetY][targetX] !== 1) {
                player.x = targetX;
                player.y = targetY;
                checkRandomEncounter();
            }
        }
    } else if (gameState === "BATTLE") {
        if (e.key === "Enter") {
            // Simple battle action trigger
            gameState = "OVERWORLD"; 
        }
    }
});

// --- Random Encounter System ---
function checkRandomEncounter() {
    // 10% chance per step on walking tiles
    if (Math.random() < 0.10) {
        gameState = "BATTLE";
    }
}

// --- Main Core Game Loop ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === "OVERWORLD") {
        drawMap();
        drawPlayer();
    } else if (gameState === "BATTLE") {
        drawBattleScreen();
    }

    requestAnimationFrame(gameLoop);
}

// --- Drawing Functions ---
function drawMap() {
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            if (map[r][c] === 1) {
                ctx.fillStyle = "#555"; // Mountain/Wall
            } else {
                ctx.fillStyle = "#228B22"; // Grass
            }
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = "#FF0000"; // Red Warrior block representation
    ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

function drawBattleScreen() {
    // Solid background with classic blue FF border boxes
    ctx.fillStyle = "#00008B";
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    ctx.fillStyle = "#FFF";
    ctx.font = "20px monospace";
    ctx.fillText("BATTLE! An Imp draws near!", 50, 100);
    ctx.fillText("Press ENTER to Fight/Win", 50, 200);
}

// Start your game engine loop
gameLoop();
