const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 32; 
let gameState = "OVERWORLD"; 

// --- Combat Menu Selection Cursor ---
let combatSelection = 0; // 0 = Fight, 1 = Run
let battleLog = "";
let currentMonster = null;

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

const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,1,1,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// --- Input Handling & State Routers ---
window.addEventListener("keydown", (e) => {
    if (gameState === "OVERWORLD") {
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
    } 
    
    else if (gameState === "BATTLE") {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            combatSelection = combatSelection === 0 ? 1 : 0; // Toggle between Fight (0) and Run (1)
        }
        if (e.key === "Enter") {
            executeCombatRound();
        }
    } 
    
    else if (gameState === "BATTLE_VICTORY") {
        if (e.key === "Enter") {
            gameState = "OVERWORLD"; // Return to map exploration
        }
    } 
    
    else if (gameState === "GAME_OVER") {
        if (e.key === "Enter") {
            // Hard reset on death
            player.hp = player.maxHp;
            player.x = 4; player.y = 4;
            gameState = "OVERWORLD";
        }
    }
});

// --- Encounter Generator ---
function checkRandomEncounter() {
    if (Math.random() < 0.15) { // 15% encounter rate per movement step
        const randomMonsterTemplate = monsters[Math.floor(Math.random() * monsters.length)];
        // Deep copy the object template so we don't mutate the base database values
        currentMonster = { ...randomMonsterTemplate }; 
        gameState = "BATTLE";
        combatSelection = 0;
        battleLog = `An enemy ${currentMonster.name} ambushed you!`;
    }
}

// --- Dynamic Round Resolution Machine ---
function executeCombatRound() {
    if (combatSelection === 1) { // Player chooses to Attempt Escape
        if (Math.random() > 0.4) { // 60% escape rate success threshold
            battleLog = "Escaped safely!";
            gameState = "BATTLE_VICTORY";
            currentMonster.goldReward = 0; // Zero gains for fleeing
            return;
        } else {
            battleLog = "Can't escape! The monster blocks your path.";
            monsterTurn();
            return;
        }
    }

    // Sort turns based on basic speed stat initiative rules
    if (player.speed >= currentMonster.speed) {
        playerTurn();
        if (currentMonster.hp > 0) monsterTurn();
    } else {
        monsterTurn();
        if (player.hp > 0) playerTurn();
    }

    // Check Win/Loss conditions at the end of turn executions
    if (player.hp <= 0) {
        gameState = "GAME_OVER";
    } else if (currentMonster.hp <= 0) {
        gameState = "BATTLE_VICTORY";
        player.gold += currentMonster.goldReward;
        battleLog = `Defeated ${currentMonster.name}! Found ${currentMonster.goldReward} Gold!`;
    }
}

function playerTurn() {
    // Formula: Raw Attack minus target Defense (minimum floor value of 1 damage points)
    let damage = Math.max(1, player.attack - currentMonster.defense + Math.floor(Math.random() * 3));
    currentMonster.hp -= damage;
    battleLog = `You strike ${currentMonster.name} for ${damage} damage.`;
}

function monsterTurn() {
    let damage = Math.max(1, currentMonster.attack - player.defense + Math.floor(Math.random() * 2));
    player.hp -= damage;
    battleLog = `The ${currentMonster.name} attacks! Deals ${damage} damage.`;
}

// --- Rendering Loop Graphics Interface ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === "OVERWORLD") {
        drawMap();
        drawPlayer();
        drawOverworldUI();
    } else {
        // Draw combat wrapper menus for BATTLE, BATTLE_VICTORY, and GAME_OVER
        drawBattleScreen();
    }

    requestAnimationFrame(gameLoop);
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
    ctx.fillStyle = "#E53935"; 
    ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

function drawOverworldUI() {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = "#FFF";
    ctx.font = "14px monospace";
    ctx.fillText(`HP: ${player.hp}/${player.maxHp} | GOLD: ${player.gold}`, 20, canvas.height - 15);
}

function drawBattleScreen() {
    // Background Frame Window Box
    ctx.fillStyle = "#000033"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = "#FFF";
    ctx.font = "16px monospace";

    if (gameState === "BATTLE") {
        // Render target metadata
        ctx.fillText(`ENEMY: ${currentMonster.name}`, 40, 50);
        ctx.fillText(`HP: ${Math.max(0, currentMonster.hp)} / ${currentMonster.maxHp}`, 40, 80);

        // Render local player metadata
        ctx.fillText("PLAYER PARTY", 320, 50);
        ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, 320, 80);

        // Dialogue Box UI Text 
        ctx.fillStyle = "#111";
        ctx.fillRect(20, canvas.height - 140, canvas.width - 40, 120);
        ctx.strokeRect(20, canvas.height - 140, canvas.width - 40, 120);
        
        ctx.fillStyle = "#FFF";
        ctx.fillText(battleLog, 40, canvas.height - 100);

        // Dynamic Interactive Menu Select Boxes
        ctx.fillText("FIGHT", 40, canvas.height - 50);
        ctx.fillText("RUN", 40, canvas.height - 25);
        
        let cursorY = combatSelection === 0 ? canvas.height - 50 : canvas.height - 25;
        ctx.fillText(">", 25, cursorY);

    } else if (gameState === "BATTLE_VICTORY") {
        ctx.textAlign = "center";
        ctx.fillText("VICTORY ACHIEVEMENT UNSLOCKED", canvas.width / 2, canvas.height / 3);
        ctx.fillText(battleLog, canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = "#AAA";
        ctx.fillText("Press ENTER to return to Overworld", canvas.width / 2, canvas.height / 1.5);
        ctx.textAlign = "left"; // Reset positioning rules 
    } 
    
    else if (gameState === "GAME_OVER") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#D32F2F";
        ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 3);
        ctx.fillStyle = "#FFF";
        ctx.fillText("Another memory fades into darkness...", canvas.width / 2, canvas.height / 2);
        ctx.fillText("Press ENTER to revive at starting point", canvas.width / 2, canvas.height / 1.5);
        ctx.textAlign = "left";
    }
}

// Fire engine thread loops
gameLoop();
