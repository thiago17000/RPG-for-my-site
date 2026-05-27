const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 32; 
// Added TITLE_SCREEN and LOAD_PROMPT to our states
let gameState = "TITLE_SCREEN"; 

// Selection arrow indexes for menus
let menuSelection = 0; // 0 = New Game, 1 = Continue

// --- Player Character Object ---
let player = {
    x: 4,
    y: 4,
    hp: 30,
    maxHp: 30,
    level: 1,
    gold: 40
};

// Simple map representation (0 = Grass, 1 = Wall)
const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,1,1,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// --- Input Handling & Menu Navigation ---
window.addEventListener("keydown", (e) => {
    
    if (gameState === "TITLE_SCREEN") {
        if (e.key === "Enter") {
            // Check if a save file exists before deciding where to route the player
            if (localStorage.getItem("another_memory_save")) {
                gameState = "LOAD_PROMPT";
                menuSelection = 1; // Default highlight to "Continue" if save exists
            } else {
                startNewGame();
            }
        }
    } 
    
    else if (gameState === "LOAD_PROMPT") {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            // Toggle between New Game (0) and Continue (1)
            menuSelection = menuSelection === 0 ? 1 : 0;
        }
        if (e.key === "Enter") {
            if (menuSelection === 1) {
                loadGame();
            } else {
                startNewGame();
            }
        }
    } 
    
    else if (gameState === "OVERWORLD") {
        let targetX = player.x;
        let targetY = player.y;

        if (e.key === "ArrowUp") targetY--;
        if (e.key === "ArrowDown") targetY++;
        if (e.key === "ArrowLeft") targetX--;
        if (e.key === "ArrowRight") targetX++;

        // Canvas Map Boundaries & Wall Collision Check
        if (targetY >= 0 && targetY < map.length && targetX >= 0 && targetX < map[0].length) {
            if (map[targetY][targetX] !== 1) {
                player.x = targetX;
                player.y = targetY;
            }
        }

        // --- Quick Save Shortcut ---
        // Pressing "S" anywhere in the overworld flashes a save
        if (e.key.toLowerCase() === "s") {
            saveGame();
        }
    }
});

// --- Save & Load System Core Functions ---

function saveGame() {
    try {
        localStorage.setItem("another_memory_save", JSON.stringify(player));
        alert("Game Progress Saved Successfully!");
    } catch (error) {
        console.error("Could not write save data to browser memory", error);
    }
}

function loadGame() {
    const savedData = localStorage.getItem("another_memory_save");
    if (savedData) {
        player = JSON.parse(savedData);
        gameState = "OVERWORLD";
    } else {
        alert("No save data found! Starting fresh.");
        startNewGame();
    }
}

function startNewGame() {
    // Reset player variables to initial values
    player = { x: 4, y: 4, hp: 30, maxHp: 30, level: 1, gold: 40 };
    gameState = "OVERWORLD";
}

// --- Render Engine Loop ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === "TITLE_SCREEN") {
        drawTitleScreen();
    } else if (gameState === "LOAD_PROMPT") {
        drawLoadPromptScreen();
    } else if (gameState === "OVERWORLD") {
        drawMap();
        drawPlayer();
        drawOverworldUI();
    }

    requestAnimationFrame(gameLoop);
}

// --- Drawing / Graphical UI Modules ---

function drawTitleScreen() {
    // Classic Final Fantasy Deep Blue Background
    ctx.fillStyle = "#000055";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Elegant White Border Box
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    // Title Text Layout
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ANOTHER MEMORY?", canvas.width / 2, canvas.height / 3);

    // Subtext Animation/Prompt
    ctx.font = "16px monospace";
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText("Press ENTER to Begin", canvas.width / 2, canvas.height / 1.5);
}

function drawLoadPromptScreen() {
    // Keep consistent layout
    ctx.fillStyle = "#000055";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SELECT FILE", canvas.width / 2, canvas.height / 4);

    // Menu Item Options
    ctx.font = "20px monospace";
    ctx.textAlign = "left";
    
    // Draw Text options
    ctx.fillText("NEW GAME", canvas.width / 2 - 60, canvas.height / 2);
    ctx.fillText("CONTINUE", canvas.width / 2 - 60, canvas.height / 2 + 40);

    // Draw the selection arrow indicator index cursor ('>')
    let cursorY = menuSelection === 0 ? canvas.height / 2 : canvas.height / 2 + 40;
    ctx.fillText(">", canvas.width / 2 - 90, cursorY);
}

function drawMap() {
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            ctx.fillStyle = map[r][c] === 1 ? "#444" : "#1B5E20";
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = "#D32F2F"; // Red Warrior block represent
    ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

function drawOverworldUI() {
    // Little status bar or helper message at bottom
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    
    ctx.fillStyle = "#FFF";
    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`LVL: ${player.level} | HP: ${player.hp}/${player.maxHp} | Gold: ${player.gold}`, 20, canvas.height - 15);
    
    ctx.textAlign = "right";
    ctx.fillText("Press [S] to Save Progress", canvas.width - 20, canvas.height - 15);
}

// Start the game loop engine
gameLoop();
