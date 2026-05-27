const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 32; 
const MAP_VIEW_WIDTH = 512; 

// --- Engine State Machine ---
// Global tracking states: TITLE_SCREEN, LOAD_PROMPT, OVERWORLD, BATTLE, BATTLE_VICTORY, GAME_OVER
let gameState = "TITLE_SCREEN"; 
let currentZone = "TOWN"; // Tracking maps: TOWN, HOUSE, STAIRS

let menuSelection = 0;   
let combatSelection = 0; 
let battleLog = "Welcome to Town!";
let currentMonster = null;

// --- Asset Image Loading Pipeline ---
let assetsLoaded = 0;
const totalAssets = 3;
function assetLoadedCallback() { assetsLoaded++; }

const tileImage = new Image();
tileImage.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"; 
tileImage.onload = assetLoadedCallback;

const heroBattleImage = new Image();
heroBattleImage.src = "image/marisa_kirisame__battlef.png"; // Hero sprite placeholder
heroBattleImage.onload = assetLoadedCallback;

const monsterImage = new Image();
monsterImage.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/19.png"; // Enemy sprite placeholder
monsterImage.onload = assetLoadedCallback;

// --- Player Character Struct ---
let player = {
    x: 8, y: 12, 
    level: 1, hp: 30, maxHp: 30,
    attack: 8, defense: 2, speed: 5, gold: 40
};

// --- Monster Bestiary Database ---
const monsters = [
    { name: "IMP", hp: 12, maxHp: 12, attack: 5, defense: 1, speed: 3, goldReward: 15 },
    { name: "GOBLIN", hp: 18, maxHp: 18, attack: 7, defense: 2, speed: 4, goldReward: 25 }
];

// --- Map Databases ---
// 0=Grass/Floor, 1=Solid Wall, 2=Path, 3=Door to House, 7=Grand Staircase, 8=Exit Zone Door
const townMap = [
    [0,0,0,0,0,0,0,1,7,1,0,0,0,0,0,0], 
    [1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1], 
    [1,0,3,1,0,3,1,1,2,1,1,0,3,1,0,1], 
    [1,0,2,1,0,2,1,1,2,1,1,0,2,1,0,1],
    [1,0,2,2,2,2,2,2,2,2,2,2,2,1,0,1], 
    [1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1],
    [1,0,0,1,0,3,1,2,2,2,1,0,0,1,0,1], 
    [1,0,0,1,0,2,1,2,2,2,1,0,0,1,0,1],
    [1,1,1,1,1,2,1,2,2,2,1,1,1,1,1,1],
    [1,0,0,0,1,2,1,2,2,2,1,0,0,0,0,1],
    [1,0,0,0,1,2,1,1,2,1,1,0,0,0,0,1],
    [1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1],
    [0,0,0,0,1,1,1,1,2,1,1,1,0,0,0,0], 
    [0,0,0,0,0,0,0,1,2,1,0,0,0,0,0,0]
];

const houseInteriorMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,0,1,1,1,0,0,1,1,0,1], // Shop counters
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,8,0,1,1,1,1,1,1], // Bottom wall with Exit Tile (8)
];

const stairsBalconyMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // Grand high balcony overlook
    [1,1,1,1,1,1,1,0,8,0,1,1,1,1,1,1], // Exit back down (8)
];

// Return active map matrix configuration dynamically
function getActiveMapGrid() {
    if (currentZone === "TOWN") return townMap;
    if (currentZone === "HOUSE") return houseInteriorMap;
    if (currentZone === "STAIRS") return stairsBalconyMap;
    return townMap;
}

// --- Input Processing System ---
window.addEventListener("keydown", (e) => {
    if (gameState === "TITLE_SCREEN") {
        if (e.key === "Enter") {
            if (localStorage.getItem("another_memory_save")) {
                gameState = "LOAD_PROMPT";
                menuSelection = 1; 
            } else { startNewGame(); }
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

        let currentGrid = getActiveMapGrid();

        // Canvas Boundary Verification Rules
        if (targetY >= 0 && targetY < currentGrid.length && targetX >= 0 && targetX < MAP_VIEW_WIDTH / TILE_SIZE) {
            let tileType = currentGrid[targetY][targetX];

            if (tileType !== 1) { // If it isn't solid geometry, perform move
                player.x = targetX;
                player.y = targetY;

                // --- Zone Trigger Processing ---
                if (tileType === 3) { // Entering a House
                    currentZone = "HOUSE";
                    battleLog = "Entered house. Safe zone established.";
                    player.x = 8; player.y = 3; // Center interior position
                } 
                else if (tileType === 7) { // Climbing Grand Stairs
                    currentZone = "STAIRS";
                    battleLog = "You ascended to the high castle walls!";
                    player.x = 8; player.y = 1;
                } 
                else if (tileType === 8) { // Leaving an interior space back to Town
                    currentZone = "TOWN";
                    battleLog = "Returned to town overworld.";
                    player.x = 8; player.y = 5; // Spawn onto path
                } 
                else {
                    // Random encounters only occur out in the green town fields
                    checkRandomEncounter();
                }
            }
        }
        if (e.key.toLowerCase() === "s") saveGame();
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

// --- Save & Load Framework ---
function saveGame() {
    try {
        const savePackage = { player: player, zone: currentZone };
        localStorage.setItem("another_memory_save", JSON.stringify(savePackage));
        battleLog = "Progress written to local disk!";
    } catch (e) { console.error(e); }
}

function loadGame() {
    const savedData = localStorage.getItem("another_memory_save");
    if (savedData) {
        const parsed = JSON.parse(savedData);
        player = parsed.player;
        currentZone = parsed.zone || "TOWN";
        gameState = "OVERWORLD";
        battleLog = "File loaded successfully.";
    } else { startNewGame(); }
}

function startNewGame() {
    player = { x: 8, y: 12, level: 1, hp: 30, maxHp: 30, attack: 8, defense: 2, speed: 5, gold: 40 };
    currentZone = "TOWN";
    gameState = "OVERWORLD";
    battleLog = "Welcome to Town!";
}

function checkRandomEncounter() {
    let currentGrid = getActiveMapGrid();
    // Only trigger random encounters on green overworld grass (tile ID 0)
    if (currentZone === "TOWN" && currentGrid[player.y][player.x] === 0 && Math.random() < 0.08) { 
        const randomMonsterTemplate = monsters[Math.floor(Math.random() * monsters.length)];
        currentMonster = { ...randomMonsterTemplate }; 
        gameState = "BATTLE";
        combatSelection = 0;
        battleLog = `An enemy ${currentMonster.name} attacked!`;
    }
}

function executeCombatRound() {
    if (combatSelection === 1) { 
        battleLog = "Escaped safely!";
        gameState = "OVERWORLD";
        return;
    }
    
    if (player.speed >= currentMonster.speed) {
        let dmg = Math.max(1, player.attack - currentMonster.defense);
        currentMonster.hp -= dmg;
        battleLog = `You hit ${currentMonster.name} for ${dmg}. `;
        if (currentMonster.hp > 0) {
            let mdmg = Math.max(1, currentMonster.attack - player.defense);
            player.hp -= mdmg;
            battleLog += `It hits you for ${mdmg}.`;
        }
    } else {
        let mdmg = Math.max(1, currentMonster.attack - player.defense);
        player.hp -= mdmg;
        battleLog = `The ${currentMonster.name} hits you for ${mdmg}. `;
        if (player.hp > 0) {
            let dmg = Math.max(1, player.attack - currentMonster.defense);
            currentMonster.hp -= dmg;
            battleLog += `You counter strike for ${dmg}.`;
        }
    }
    
    if (player.hp <= 0) gameState = "GAME_OVER";
    else if (currentMonster.hp <= 0) {
        player.gold += currentMonster.goldReward;
        gameState = "BATTLE_VICTORY";
        battleLog = `Defeated ${currentMonster.name}! Found ${currentMonster.goldReward} Gold!`;
    }
}

// --- Graphical Rendering Pipeline ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === "TITLE_SCREEN") drawTitleScreen();
    else if (gameState === "LOAD_PROMPT") drawLoadPromptScreen();
    else if (gameState === "OVERWORLD") {
        drawActiveZoneMap();
        drawPlayerSprite();
        drawRightBlueUI();
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

function drawActiveZoneMap() {
    let currentGrid = getActiveMapGrid();
    for (let r = 0; r < currentGrid.length; r++) {
        for (let c = 0; c < currentGrid[r].length; c++) {
            let tile = currentGrid[r][c];
            
            // Render rules mapped by Zone Type
            if (tile === 1) ctx.fillStyle = "#7F8C8D"; // Dark brick border layout walls
            else if (tile === 2) ctx.fillStyle = "#34495E"; // Main road pathing
            else if (tile === 3) ctx.fillStyle = "#D35400"; // House Doorway teleporters
            else if (tile === 7) ctx.fillStyle = "#F1C40F"; // Grand Gold Staircase teleporters
            else if (tile === 8) ctx.fillStyle = "#9B59B6"; // Interior room exit square mats
            else {
                // Background layouts change style depending on your current location
                if (currentZone === "TOWN") ctx.fillStyle = "#27AE60"; // Emerald overworld grass
                else if (currentZone === "HOUSE") ctx.fillStyle = "#5C3A21"; // Inside cozy wood flooring
                else ctx.fillStyle = "#111122"; // Balcony concrete stone flooring
            }

            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "rgba(0,0,0,0.12)";
            ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function drawPlayerSprite() {
    if (assetsLoaded >= totalAssets) {
        // Renders your active hero asset tile inside the map exploration view
        ctx.drawImage(heroBattleImage, player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    } else {
        ctx.fillStyle = "#E53935"; 
        ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
}

function drawRightBlueUI() {
    ctx.fillStyle = "#000055";
    ctx.fillRect(MAP_VIEW_WIDTH, 0, canvas.width - MAP_VIEW_WIDTH, canvas.height);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.strokeRect(MAP_VIEW_WIDTH + 8, 8, canvas.width - MAP_VIEW_WIDTH - 16, canvas.height - 16);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px monospace";
    ctx.fillText("STATUS WINDOW", MAP_VIEW_WIDTH + 24, 40);
    
    ctx.font = "14px monospace";
    ctx.fillText(`ZONE: ${currentZone}`, MAP_VIEW_WIDTH + 24, 70);
    ctx.fillText(`LVL : ${player.level}`, MAP_VIEW_WIDTH + 24, 100);
    ctx.fillText(`HP  : ${player.hp}/${player.maxHp}`, MAP_VIEW_WIDTH + 24, 130);
    ctx.fillText(`GOLD: ${player.gold}`, MAP_VIEW_WIDTH + 24, 160);
    
    ctx.strokeRect(MAP_VIEW_WIDTH + 16, 200, canvas.width - MAP_VIEW_WIDTH - 32, 220);
    ctx.fillText("LOG:", MAP_VIEW_WIDTH + 24, 230);
    
    ctx.font = "12px monospace";
    ctx.fillText(battleLog, MAP_VIEW_WIDTH + 24, 260, canvas.width - MAP_VIEW_WIDTH - 50);
}

function drawBattleScreen() {
    ctx.fillStyle = "#000033"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "16px monospace";

    if (gameState === "BATTLE") {
        // Left Column: Enemy Visual Rendering Viewport
        if (assetsLoaded >= totalAssets) {
            ctx.drawImage(monsterImage, 80, 100, 96, 96); 
        } else {
            ctx.fillStyle = "#FF00FF";
            ctx.fillRect(80, 100, 64, 64);
        }
        ctx.fillText(`ENEMY: ${currentMonster.name}`, 40, 50);
        ctx.fillText(`HP: ${Math.max(0, currentMonster.hp)} / ${currentMonster.maxHp}`, 40, 75);

        // Right Column: Side-view Hero Combat Rendering Viewport
        if (assetsLoaded >= totalAssets) {
            ctx.drawImage(heroBattleImage, 360, 100, 96, 96);
        } else {
            ctx.fillStyle = "#00FFFF";
            ctx.fillRect(360, 100, 64, 64);
        }
        ctx.fillText("PLAYER PARTY", 320, 50);
        ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, 320, 75);

        // Text Log Context Window Bounds
        ctx.fillStyle = "#111";
        ctx.fillRect(20, canvas.height - 140, canvas.width - 40, 120);
        ctx.strokeRect(20, canvas.height - 140, canvas.width - 40, 120);
        
        ctx.fillStyle = "#FFF";
        ctx.fillText(battleLog, 40, canvas.height - 100);
        ctx.fillText("FIGHT", 40, canvas.height - 50);
        ctx.fillText("RUN", 40, canvas.height - 25);
        
        let cursorY = combatSelection === 0 ? canvas.height - 50 : canvas.height - 25;
        ctx.fillText(">", 25, cursorY);

    } else if (gameState === "BATTLE_VICTORY") {
        ctx.textAlign = "center";
        ctx.fillText("VICTORY", canvas.width / 2, canvas.height / 3);
        ctx.fillText(battleLog, canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = "#AAA";
        ctx.fillText("Press ENTER to return to Overworld", canvas.width / 2, canvas.height / 1.5);
        ctx.textAlign = "left"; 
    } 
    else if (gameState === "GAME_OVER") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#D32F2F";
        ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 3);
        ctx.fillText("Press ENTER to retry from start", canvas.width / 2, canvas.height / 1.5);
        ctx.textAlign = "left";
    }
}

// Fire the loop
gameLoop();
