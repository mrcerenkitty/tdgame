const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gold = 500;
let wave = 1;
let selectedTowerType = null;
let enemies = [];
let towers = [];

// Encyclopedia Data
const archive = {
    towers: [
        { name: "Turret", desc: "Single target. Reliable.", stats: "Dmg: 10 | Range: 150" },
        { name: "Blast Tower", desc: "Deals splash damage in a radius.", stats: "Dmg: 20 | Range: 100" }
    ],
    enemies: [
        { name: "Scout", desc: "Fast moving unit.", stats: "HP: 50 | Speed: Fast" },
        { name: "Heavy", desc: "Armored tank unit.", stats: "HP: 200 | Speed: Slow" }
    ]
};

// --- MENU LOGIC ---
function toggleEncyclopedia(show) {
    document.getElementById('main-menu').classList.toggle('hidden', show);
    document.getElementById('encyclopedia').classList.toggle('hidden', !show);
    if(show) renderEnc('towers');
}

function renderEnc(category) {
    const container = document.getElementById('enc-content');
    container.innerHTML = archive[category].map(item => `
        <div style="border-bottom: 1px solid #555; margin-bottom: 10px;">
            <h3>${item.name}</h3>
            <p>${item.desc}</p>
            <small style="color: #27ae60">${item.stats}</small>
        </div>
    `).join('');
}

function startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    spawnWave();
    gameLoop();
}

// --- GAMEPLAY LOGIC ---
function selectTower(type) {
    selectedTowerType = type;
    console.log("Selected: " + type);
}

// Click to place tower
canvas.addEventListener('mousedown', (e) => {
    if (!selectedTowerType) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Simple placement
    towers.push({ x, y, type: selectedTowerType });
    console.log("Tower placed at: ", x, y);
});

function spawnWave() {
    for (let i = 0; i < 5; i++) {
        enemies.push({ x: 0, y: 300, hp: 100, speed: 1.5 });
    }
}

function gameLoop() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Path
    ctx.fillStyle = "#34495e";
    ctx.fillRect(0, 280, 800, 40);

    // Update & Draw Enemies
    ctx.fillStyle = "#e74c3c";
    enemies.forEach((enemy, index) => {
        enemy.x += enemy.speed;
        ctx.fillRect(enemy.x, enemy.y, 20, 20);
    });

    // Draw Towers
    towers.forEach(t => {
        ctx.fillStyle = (t.type === 'turret') ? "#3498db" : "#e67e22";
        ctx.beginPath();
        ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
        ctx.fill();
    });

    requestAnimationFrame(gameLoop);
}
