const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 32; 

// --- Engine State Machine ---
let gameState = "TITLE_SCREEN"; 
let menuSelection = 0;   // 0 = New Game, 1 = Continue
let combatSelection = 0; // 0 = Fight, 1 = Run
let battleLog = "";
let currentMonster = null;

// --- Asset Image Loading Pipeline ---
let assetsLoaded = 0;
const totalAssets = 3;

function assetLoadedCallback() {
    assetsLoaded++;
}

// 8-bit placeholder assets from public open-source CDNs
const tileImage = new Image();
tileImage.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"; // Placeholder tile asset
tileImage.onload = assetLoadedCallback;

const heroBattleImage = new Image();
heroBattleImage.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/1.png"; // Classic Bulbasaur/Hero placeholder
heroBattleImage.onload = assetLoadedCallback;

const monsterImage = new Image();
monsterImage.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/19.png"; // Rattata/Monster placeholder
monsterImage.onload = assetLoadedCallback;


// --- Core Character Struct ---
let player = {
    x: 4, y: 4,
    level: 1,
    hp: 30, maxHp: 30,
    attack: 8, defense: 2, speed: 5,
    gold: 40
};

// --- Monster Bestiary Database ---
const monsters = [
    { name: "IMP", hp: 12, maxHp: 12, attack: 5, defense: 1, speed: 3, goldReward: 15 },
    { name: "GOBLIN", hp: 18, maxHp: 18, attack: 7, defense: 2, speed: 4, goldReward: 25 },
    { name: "SPIDER", hp: 8, maxHp: 8, attack: 6, defense: 0, speed: 6, goldReward: 10 }
];

// --- Simple 2D Map Array ---
const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,1,1,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// --- Save & Load Logic Functions ---
function saveGame() {
    try {
        localStorage.setItem("another_memory_save", JSON.stringify(player));
        alert("Game Progress Saved Systematically!");
    } catch (error) {
        console.error("Could not write data to browser memory", error);
    }
}

function loadGame() {
    const savedData = localStorage.getItem("another_memory_save");
    if (savedData) {
        player = JSON.parse(savedData);
        gameState = "OVERWORLD";
    } else {
        alert("No save data discovered! Starting fresh.");
        startNewGame();
    }
}

function startNewGame() {
    player = { x: 4, y: 4, level: 1, hp: 30, maxHp: 30, attack: 8, defense: 2, speed: 5, gold: 40 };
    gameState = "OVERWORLD";
}

// --- Dynamic Encounter Generator ---
function checkRandomEncounter() {
    if (Math.random() < 0.15) { 
        const randomMonsterTemplate = monsters[Math.floor(Math.random() * monsters.length)];
        currentMonster = { ...randomMonsterTemplate }; 
        gameState = "BATTLE";
        combatSelection = 0;
        battleLog = `An enemy ${currentMonster.name} ambushed you!`;
    }
}

// --- Turn-Based Battle Resolution ---
function executeCombatRound() {
    if (combatSelection === 1) { 
        if (Math.random() > 0.4) { 
            battleLog = "Escaped safely!";
            gameState = "BATTLE_VICTORY";
            currentMonster.goldReward = 0; 
            return;
        } else {
            battleLog = "Can't escape! The monster blocks your path.";
            monsterTurn();
            if (player.hp <= 0) gameState = "GAME_OVER";
            return;
        }
    }

    if (player.speed >= currentMonster.speed) {
        playerTurn();
        if (currentMonster.hp > 0) monsterTurn();
    } else {
        monsterTurn();
        if (player.hp > 0) playerTurn();
    }

    if (player.hp <= 0) {
        gameState = "GAME_OVER";
    } else if (currentMonster.hp <= 0) {
        gameState = "BATTLE_VICTORY";
        player.gold += currentMonster.goldReward;
        battleLog = `Defeated ${currentMonster.name}! Found ${currentMonster.goldReward} Gold!`;
    }
}

function playerTurn() {
    let damage = Math.max(1, player.attack - currentMonster.defense + Math.floor(Math.random() * 3));
    currentMonster.hp -= damage;
    battleLog = `You strike ${currentMonster.name} for ${damage} damage.`;
}

function monsterTurn() {
    let damage = Math.max(1, currentMonster.attack - player.defense + Math.floor(Math.random() * 2));
    player.hp -= damage;
    battleLog = `The ${currentMonster.name} attacks! Deals ${damage} damage.`;
}

// --- Input Processing ---
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

        if (targetY >= 0 && targetY < map.length && targetX >= 0 && targetX < map[0].length) {
            if (map[targetY][targetX] !== 1) {
                player.x = targetX;
                player.y = targetY;
                checkRandomEncounter();
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

// --- Graphical Rendering Pipeline ---
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
    } else {
        drawBattleScreen();
    }

    requestAnimationFrame(gameLoop);
}

// --- Graphical Interface Modules ---

function drawTitleScreen() {
    ctx.fillStyle = "#000055"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ANOTHER MEMORY?", canvas.width / 2, canvas.height / 3);

    ctx.font = "16px monospace";
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText("Press ENTER to Begin", canvas.width / 2, canvas.height / 1.5);
    ctx.textAlign = "left"; 
}

function drawLoadPromptScreen() {
    ctx.fillStyle = "#000055";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#FFFFFF";
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SELECT FILE", canvas.width / 2, canvas.height / 4);

    ctx.font = "20px monospace";
    ctx.textAlign = "left";
    ctx.fillText("NEW GAME", canvas.width / 2 - 60, canvas.height / 2);
    ctx.fillText("CONTINUE", canvas.width / 2 - 60, canvas.height / 2 + 40);

    let cursorY = menuSelection === 0 ? canvas.height / 2 : canvas.height / 2 + 40;
    ctx.fillText(">", canvas.width / 2 - 90, cursorY);
}

function drawMap() {
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            ctx.fillStyle = map[r][c] === 1 ? "#333" : "#2E7D32";
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function drawPlayer() {
    // If assets fail to load gracefully, render fallback block
    if (assetsLoaded >= totalAssets) {
        ctx.drawImage(heroBattleImage, player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    } else {
        ctx.fillStyle = "#E53935"; 
        ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
}

function drawOverworldUI() {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = "#FFF";
    ctx.font = "14px monospace";
    ctx.fillText(`HP: ${player.hp}/${player.maxHp} | GOLD: ${player.gold}`, 20, canvas.height - 15);
    ctx.textAlign = "right";
    ctx.fillText("Press [S] to Save Progress", canvas.width - 20, canvas.height - 15);
    ctx.textAlign = "left";
}

function drawBattleScreen() {
    // Classic deep blue combat box frame
    ctx.fillStyle = "#000033"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = "#FFF";
    ctx.font = "16px monospace";

    if (gameState === "BATTLE") {
        // --- Side View Combat Composition ---
        // Left Side: Enemy Render Pipeline
        if (assetsLoaded >= totalAssets) {
            ctx.drawImage(monsterImage, 80, 100, 96, 96); // Scaled up pixel layout
        } else {
            ctx.fillStyle = "#FF00FF";
            ctx.fillRect(80, 100, 64, 64);
        }
        ctx.fillText(`ENEMY: ${currentMonster.name}`, 40, 50);
        ctx.fillText(`HP: ${Math.max(0, currentMonster.hp)} / ${currentMonster.maxHp}`, 40, 75);

        // Right Side: Player Render Pipeline
        if (assetsLoaded >= totalAssets) {
            ctx.drawImage(heroBattleImage, 360, 100, 96, 96);
        } else {
            ctx.fillStyle = "#00FFFF";
            ctx.fillRect(360, 100, 64, 64);
        }
        ctx.fillText("PLAYER PARTY", 320, 50);
        ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, 320, 75);

        // Text Box Layout
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
    } else if (gameState === "GAME_OVER") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#D32F2F";
        ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 3);
        ctx.fillStyle = "#FFF";
        ctx.fillText("Another memory fades into darkness...", canvas.width / 2, canvas.height / 2);
        ctx.fillText("Press ENTER to retry from start", canvas.width / 2, canvas.height / 1.5);
        ctx.textAlign = "left";
    }
}

// Fire engine loops
gameLoop();
