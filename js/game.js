const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 32; 
const MAP_VIEW_WIDTH = 512; // First 16 columns for the map rendering viewport

// --- Engine State Machine ---
let gameState = "TITLE_SCREEN"; 
let menuSelection = 0;   
let combatSelection = 0; 
let battleLog = "Welcome to Town!";
let currentMonster = null;
let currentRoomText = ""; // Holds text when inside a house/room

// --- Player Character Struct ---
let player = {
    x: 8, y: 12, // Start at the bottom center pathway entrance
    level: 1, hp: 30, maxHp: 30,
    attack: 8, defense: 2, speed: 5, gold: 40
};

// --- Monster Bestiary Database ---
const monsters = [
    { name: "IMP", hp: 12, maxHp: 12, attack: 5, defense: 1, speed: 3, goldReward: 15 },
    { name: "GOBLIN", hp: 18, maxHp: 18, attack: 7, defense: 2, speed: 4, goldReward: 25 }
];

// --- Complex Town Map (16 columns x 14 rows) ---
// 0=Grass, 1=Solid Wall, 2=Path, 3=House1, 4=House2, 5=House3, 6=House4, 7=Grand Staircase
const map = [
    [0,0,0,0,0,0,0,1,7,1,0,0,0,0,0,0], // Top wall containing Grand Staircase (7)
    [1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1], 
    [1,0,3,1,0,4,1,1,2,1,1,0,5,1,0,1], // Row with top houses (Door Triggers 3, 4, 5)
    [1,0,2,1,0,2,1,1,2,1,1,0,2,1,0,1],
    [1,0,2,2,2,2,2,2,2,2,2,2,2,1,0,1], // Crossroad brick pathways
    [1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1],
    [1,0,0,1,0,6,1,2,2,2,1,0,0,1,0,1], // Row with middle house (Door Trigger 6)
    [1,0,0,1,0,2,1,2,2,2,1,0,0,1,0,1],
    [1,1,1,1,1,2,1,2,2,2,1,1,1,1,1,1],
    [1,0,0,0,1,2,1,2,2,2,1,0,0,0,0,1],
    [1,0,0,0,1,2,1,1,2,1,1,0,0,0,0,1],
    [1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1],
    [0,0,0,0,1,1,1,1,2,1,1,1,0,0,0,0], // Southern entry point
    [0,0,0,0,0,0,0,1,2,1,0,0,0,0,0,0]
];

// --- Input Processing System ---
window.addEventListener("keydown", (e) => {
    if (gameState === "TITLE_SCREEN") {
        if (e.key === "Enter") {
            if (localStorage.getItem("another_memory_save")) {
                gameState = "LOAD_PROMPT";
                menuSelection = 1; 
            } else {
                startNewGame();
            }
        }
    } 
    else if (gameState === "LOAD_PROMPT") {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            menuSelection = menuSelection === 0 ? 1 : 0;
        }
        if (e.key === "Enter") {
            if (menuSelection === 1) loadGame();
            else startNewGame();
        }
    } 
    else if (gameState === "OVERWORLD") {
        let targetX = player.x;
        let targetY = player.y;

        if (e.key === "ArrowUp") targetY--;
        if (e.key === "ArrowDown") targetY++;
        if (e.key === "ArrowLeft") targetX--;
        if (e.key === "ArrowRight") targetX++;

        // Ensure movement stays within left-side grid boundaries
        if (targetY >= 0 && targetY < map.length && targetX >= 0 && targetX < MAP_VIEW_WIDTH / TILE_SIZE) {
            let tileType = map[targetY][targetX];

            if (tileType !== 1) { // If it's not a solid stone wall block
                player.x = targetX;
                player.y = targetY;

                // Handle Interactive Door Trigger Coordinates
                if (tileType >= 3 && tileType <= 7) {
                    processTrigger(tileType);
                } else {
                    // Normal tiles have a small chance of a random encounter outside of buildings
                    checkRandomEncounter();
                }
            }
        }

        if (e.key.toLowerCase() === "s") saveGame();
    } 
    else if (gameState === "INSIDE_ROOM") {
        if (e.key === "Enter" || e.key === "Escape") {
            // Kick player safely outside the building door frame
            player.y += 1; 
            gameState = "OVERWORLD";
        }
    }
    else if (gameState === "BATTLE") {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            combatSelection = combatSelection === 0 ? 1 : 0;
        }
        if (e.key === "Enter") executeCombatRound();
    } 
    else if (gameState === "BATTLE_VICTORY" || gameState === "GAME_OVER") {
        if (e.key === "Enter") gameState = "OVERWORLD";
    }
});

// --- Trigger Activation Interpreter ---
function processTrigger(id) {
    gameState = "INSIDE_ROOM";
    if (id === 3) currentRoomText = "Entered Armor Shop! The merchant greets you warmly.";
    if (id === 4) currentRoomText = "Entered Weapon Shop! Heavy iron blades line the walls.";
    if (id === 5) currentRoomText = "Entered the Magic Sanctum. Crystals pulse with energy.";
    if (id === 6) currentRoomText = "Entered the Village Inn. Your party rests comfortably.";
    if (id === 7) currentRoomText = "You ascend the Grand Staircase... Leading to the Castle Overlook!";
}

// --- Save & Load Framework ---
function saveGame() {
    try {
        localStorage.setItem("another_memory_save", JSON.stringify(player));
        battleLog = "Progress saved successfully!";
    } catch (e) { console.error(e); }
}

function loadGame() {
    const savedData = localStorage.getItem("another_memory_save");
    if (savedData) {
        player = JSON.parse(savedData);
        gameState = "OVERWORLD";
        battleLog = "Welcome back!";
    } else { startNewGame(); }
}

function startNewGame() {
    player = { x: 8, y: 12, level: 1, hp: 30, maxHp: 30, attack: 8, defense: 2, speed: 5, gold: 40 };
    gameState = "OVERWORLD";
    battleLog = "Welcome to Town!";
}

function checkRandomEncounter() {
    // Only trigger battles on plain green grass (tile code 0)
    if (map[player.y][player.x] === 0 && Math.random() < 0.08) { 
        const randomMonsterTemplate = monsters[Math.floor(Math.random() * monsters.length)];
        currentMonster = { ...randomMonsterTemplate }; 
        gameState = "BATTLE";
        combatSelection = 0;
        battleLog = `An enemy ${currentMonster.name} attacked inside the town perimeter!`;
    }
}

function executeCombatRound() {
    if (combatSelection === 1) { 
        battleLog = "Escaped safely!";
        gameState = "OVERWORLD";
        return;
    }
    // Calculate speed order
    if (player.speed >= currentMonster.speed) {
        let dmg = Math.max(1, player.attack - currentMonster.defense);
        currentMonster.hp -= dmg;
        battleLog = `You hit ${currentMonster.name} for ${dmg}. `;
        if (currentMonster.hp > 0) {
            let mdmg = Math.max(1, currentMonster.attack - player.defense);
            player.hp -= mdmg;
            battleLog += `It hits you back for ${mdmg}.`;
        }
    }
    
    if (player.hp <= 0) gameState = "GAME_OVER";
    else if (currentMonster.hp <= 0) {
        player.gold += currentMonster.goldReward;
        gameState = "BATTLE_VICTORY";
        battleLog = `Defeated ${currentMonster.name}! Won ${currentMonster.goldReward} Gold!`;
    }
}

// --- Graphical Rendering Pipeline ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === "TITLE_SCREEN") {
        drawTitleScreen();
    } else if (gameState === "LOAD_PROMPT") {
        drawLoadPromptScreen();
    } else if (gameState === "OVERWORLD" || gameState === "INSIDE_ROOM") {
        drawTownMap();
        drawPlayer();
        drawRightBlueUI();
        if (gameState === "INSIDE_ROOM") drawInsideRoomOverlay();
    } else {
        drawBattleScreen();
    }

    requestAnimationFrame(gameLoop);
}

// --- Drawing UI Sub-Modules ---

function drawTitleScreen() {
    ctx.fillStyle = "#000055"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ANOTHER MEMORY?", canvas.width / 2, canvas.height / 3);
    ctx.font = "16px monospace";
    ctx.fillText("Press ENTER to Begin", canvas.width / 2, canvas.height / 1.5);
    ctx.textAlign = "left";
}

function drawLoadPromptScreen() {
    ctx.fillStyle = "#000055";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SELECT FILE", canvas.width / 2, canvas.height / 4);
    ctx.font = "20px monospace";
    ctx.fillText("NEW GAME", canvas.width / 2, canvas.height / 2);
    ctx.fillText("CONTINUE", canvas.width / 2, canvas.height / 2 + 40);
    let cursorY = menuSelection === 0 ? canvas.height / 2 : canvas.height / 2 + 40;
    ctx.fillText(">", canvas.width / 2 - 80, cursorY);
    ctx.textAlign = "left";
}

function drawTownMap() {
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            let tile = map[r][c];
            if (tile === 1) ctx.fillStyle = "#7F8C8D"; // Stone Brick walls
            else if (tile === 2) ctx.fillStyle = "#34495E"; // Clean stone streets
            else if (tile >= 3 && tile <= 6) ctx.fillStyle = "#D35400"; // House wooden doors
            else if (tile === 7) ctx.fillStyle = "#F1C40F"; // Grand Gold Staircase
            else ctx.fillStyle = "#27AE60"; // Overworld green grass fields

            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            // Draw subtle black border lines around path tiles to mimic original art grids
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = "#E53935"; // Red Warrior block representation
    ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

function drawRightBlueUI() {
    // Left-side limit stops at 512px. The rest (512px to 768px) is our blue menu panel.
    ctx.fillStyle = "#000055";
    ctx.fillRect(MAP_VIEW_WIDTH, 0, canvas.width - MAP_VIEW_WIDTH, canvas.height);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.strokeRect(MAP_VIEW_WIDTH + 8, 8, canvas.width - MAP_VIEW_WIDTH - 16, canvas.height - 16);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px monospace";
    ctx.fillText("STATUS WINDOW", MAP_VIEW_WIDTH + 24, 40);
    
    ctx.font = "14px monospace";
    ctx.fillText(`LVL: ${player.level}`, MAP_VIEW_WIDTH + 24, 80);
    ctx.fillText(`HP : ${player.hp}/${player.maxHp}`, MAP_VIEW_WIDTH + 24, 110);
    ctx.fillText(`GOLD: ${player.gold}`, MAP_VIEW_WIDTH + 24, 140);
    
    // Bottom log window area inside the right pane
    ctx.strokeRect(MAP_VIEW_WIDTH + 16, 200, canvas.width - MAP_VIEW_WIDTH - 32, 220);
    ctx.fillText("LOG:", MAP_VIEW_WIDTH + 24, 230);
    
    // Wrap long text lines inside the sidebar panel safely
    ctx.font = "12px monospace";
    ctx.fillText(battleLog, MAP_VIEW_WIDTH + 24, 260, canvas.width - MAP_VIEW_WIDTH - 50);
    
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText("Press [S] to Save", MAP_VIEW_WIDTH + 24, 390);
}

function drawInsideRoomOverlay() {
    // Pop up a centered modal dialog frame when inside a house room
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(40, 100, MAP_VIEW_WIDTH - 80, 200);
    ctx.strokeStyle = "#FFFFFF";
    ctx.strokeRect(40, 100, MAP_VIEW_WIDTH - 80, 200);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "14px monospace";
    ctx.fillText(currentRoomText, 60, 160, MAP_VIEW_WIDTH - 120);
    
    ctx.fillStyle = "#F1C40F";
    ctx.fillText("Press ENTER to leave the building", 60, 240);
}

function drawBattleScreen() {
    ctx.fillStyle = "#000033"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#FFF";
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "16px monospace";
    ctx.fillText(`ENEMY: ${currentMonster.name} (HP: ${currentMonster.hp})`, 40, 60);
    ctx.fillText(`PLAYER (HP: ${player.hp}/${player.maxHp})`, 40, 120);

    ctx.fillStyle = "#111";
    ctx.fillRect(20, canvas.height - 140, canvas.width - 40, 120);
    ctx.strokeRect(20, canvas.height - 140, canvas.width - 40, 120);
    
    ctx.fillStyle = "#FFF";
    ctx.fillText(battleLog, 40, canvas.height - 90);
    ctx.fillText("FIGHT", 40, canvas.height - 50);
    ctx.fillText("RUN", 40, canvas.height - 25);
    
    let cursorY = combatSelection === 0 ? canvas.height - 50 : canvas.height - 25;
    ctx.fillText(">", 25, cursorY);
}

// Start town engine
gameLoop();
