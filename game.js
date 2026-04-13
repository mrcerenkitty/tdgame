const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- GAME STATE ---
let gold = 500;
let wave = 1;
let selectedTowerType = null;
let enemies = [];
let towers = [];
let bullets = [];
let isPaused = false;
let gameActive = false;
let particles = [];

function createMenuParticles() {
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2
        });
    }
}
createMenuParticles();

// Update your gameLoop to handle the "Menu State"
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isPaused || !gameActive) {
        // Draw floating background particles
        ctx.fillStyle = "rgba(79, 172, 254, 0.5)";
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    if (!isPaused && gameActive) {
        // ... (Keep all your existing game logic here: path, enemies, towers, bullets)
        
        // DRAW PATH
        ctx.fillStyle = "#34495e";
        ctx.fillRect(0, 280, 800, 40);

        // UPDATE ENEMIES
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            e.x += e.speed;
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(e.x, e.y - 10, 20, 20);
            if (e.hp <= 0) { enemies.splice(i, 1); gold += 20; updateUI(); }
        }

        // UPDATE TOWERS & BULLETS (Keep your existing code for these)
        towers.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI * 2); ctx.fill();
        });
        
        // (Include your bullet logic and collision logic from previous response here)
    }
    
    requestAnimationFrame(gameLoop);
}


// --- CONFIGURATION ---
const TOWER_TYPES = {
    turret: { name: "Turret", cost: 100, damage: 20, range: 150, color: "#3498db", fireRate: 60, splash: 0 },
    splash: { name: "Blast", cost: 200, damage: 15, range: 100, color: "#e67e22", fireRate: 100, splash: 50 }
};

const archive = {
    towers: [
        { name: "Turret", desc: "Single target. Reliable.", stats: "Dmg: 20 | Cost: $100" },
        { name: "Blast Tower", desc: "Deals splash damage.", stats: "Dmg: 15 | Cost: $200" }
    ],
    enemies: [
        { name: "Scout", desc: "Standard unit.", stats: "HP: 50 + Wave Scaling" }
    ]
};

// --- CONTROLS & MENU ---
window.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && gameActive) {
        isPaused = !isPaused;
        document.getElementById('main-menu').classList.toggle('hidden', !isPaused);
        document.querySelector('#main-menu h1').innerText = isPaused ? "PAUSED" : "CORE DEFENSE";
    }
    if (e.key === "1") selectTower('turret');
    if (e.key === "2") selectTower('splash');
});

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
    if (isPaused) { 
        isPaused = false; 
    } else {
        gameActive = true;
        spawnWave();
        gameLoop();
    }
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
}

// --- CORE MECHANICS ---
canvas.addEventListener('mousedown', (e) => {
    if (!selectedTowerType || isPaused) return;
    
    const config = TOWER_TYPES[selectedTowerType];
    if (gold >= config.cost) {
        const rect = canvas.getBoundingClientRect();
        towers.push({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            ...config,
            lastShot: 0
        });
        gold -= config.cost;
        updateUI();
    }
});

function updateUI() {
    document.getElementById('gold-txt').innerText = gold;
    document.getElementById('wave-txt').innerText = wave;
}

function spawnWave() {
    const enemyCount = 5 + (wave * 2); // More enemies each wave
    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
            if (!isPaused) enemies.push({ x: 0, y: 300, hp: 40 + (wave * 15), maxHp: 40 + (wave * 15), speed: 1 + (wave * 0.1) });
        }, i * 1000);
    }
}

function gameLoop() {
    if (!isPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw Path
        ctx.fillStyle = "#34495e";
        ctx.fillRect(0, 280, 800, 40);

        // Update Enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            e.x += e.speed;
            
            // Draw Enemy & HP Bar
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(e.x, e.y - 10, 20, 20);
            ctx.fillStyle = "#2ecc71";
            ctx.fillRect(e.x, e.y - 15, (e.hp/e.maxHp) * 20, 3);

            if (e.hp <= 0) {
                enemies.splice(i, 1);
                gold += 20;
                updateUI();
            }
            if (e.x > 800) enemies.splice(i, 1); // Enemy reached end
        }

        // Update Towers & Shooting
        towers.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
            ctx.fill();

            // Find Target
            t.lastShot++;
            if (t.lastShot >= t.fireRate) {
                const target = enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) < t.range);
                if (target) {
                    bullets.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, dmg: t.damage, splash: t.splash, speed: 5 });
                    t.lastShot = 0;
                }
            }
        });

        // Update Bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            let angle = Math.atan2(b.ty - b.y, b.tx - b.x);
            b.x += Math.cos(angle) * b.speed;
            b.y += Math.sin(angle) * b.speed;

            ctx.fillStyle = "yellow";
            ctx.fillRect(b.x, b.y, 5, 5);

            // Collision
            if (Math.hypot(b.tx - b.x, b.ty - b.y) < 10) {
                if (b.splash > 0) {
                    enemies.forEach(en => {
                        if (Math.hypot(en.x - b.x, en.y - b.y) < b.splash) en.hp -= b.dmg;
                    });
                } else {
                    const target = enemies.find(en => Math.hypot(en.x - b.x, en.y - b.y) < 20);
                    if (target) target.hp -= b.dmg;
                }
                bullets.splice(i, 1);
            }
        }

        // Next Wave Check
        if (enemies.length === 0) {
            wave++;
            updateUI();
            spawnWave();
        }
    }
    requestAnimationFrame(gameLoop);
}

function selectTower(type) {
    selectedTowerType = type;
    document.getElementById('btn-turret').style.border = type === 'turret' ? "2px solid gold" : "2px solid white";
    document.getElementById('btn-splash').style.border = type === 'splash' ? "2px solid gold" : "2px solid white";
}
