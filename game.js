const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- GAME STATE ---
let gold = 500;
let wave = 1;
let playerHP = 100;
let selectedTowerType = null;
let enemies = [];
let towers = [];
let bullets = [];
let explosions = [];
let gameActive = false;
let isPaused = false;

// Mouse Tracking
let mouseX = 0;
let mouseY = 0;

// --- CONFIGURATION ---
const TOWER_TYPES = {
    turret: { name: "Turret", cost: 100, damage: 25, range: 180, color: "#3498db", fireRate: 30, splash: 0 },
    splash: { name: "Blast", cost: 200, damage: 30, range: 110, color: "#e67e22", fireRate: 80, splash: 80 }
};

// Map Path (Waypoints)
const waypoints = [
    { x: 0, y: 150 },
    { x: 600, y: 150 },
    { x: 600, y: 450 },
    { x: 150, y: 450 },
    { x: 150, y: 600 } 
];
const PATH_WIDTH = 40;

// --- CORE FUNCTIONS ---

function startGame() {
    if (!gameActive) {
        gameActive = true;
        playerHP = 100;
        gold = 500;
        wave = 1;
        enemies = [];
        towers = [];
        spawnWave();
        gameLoop();
    }
    isPaused = false;
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    updateUI();
}

function updateUI() {
    document.getElementById('gold-txt').innerText = gold;
    document.getElementById('wave-txt').innerText = wave;
    document.getElementById('hp-txt').innerText = playerHP;

    if (playerHP <= 0) {
        alert("GAME OVER! Final Wave: " + wave);
        location.reload();
    }
}

function addDevMoney() {
    gold += 100;
    updateUI();
}

// Math: Check distance from point to line segment (for road collision)
function distToSegment(p, v, w) {
    let l2 = (w.x - v.x)**2 + (w.y - v.y)**2;
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function canPlaceTower(x, y) {
    // Check if on road
    for(let i = 0; i < waypoints.length - 1; i++) {
        if(distToSegment({x, y}, waypoints[i], waypoints[i+1]) < (PATH_WIDTH/2 + 15)) return false;
    }
    // Check if on another tower
    for(let t of towers) {
        if(Math.hypot(t.x - x, t.y - y) < 30) return false;
    }
    return true;
}

function spawnWave() {
    if (!gameActive) return;
    const enemyCount = 5 + (wave * 2);
    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
            if (gameActive && !isPaused) {
                enemies.push({ 
                    x: waypoints[0].x, y: waypoints[0].y, wpIdx: 1, 
                    hp: 20 + (wave * 10), maxHp: 20 + (wave * 10), speed: 1.2 + (wave * 0.05) 
                });
            }
        }, i * 1000);
    }
}

// --- INPUTS ---

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', () => {
    if (!selectedTowerType || isPaused) return;
    const config = TOWER_TYPES[selectedTowerType];
    if (gold >= config.cost && canPlaceTower(mouseX, mouseY)) {
        towers.push({ x: mouseX, y: mouseY, ...config, lastShot: 0 });
        gold -= config.cost;
        updateUI();
    }
});

function selectTower(type) {
    selectedTowerType = (selectedTowerType === type) ? null : type;
}

function toggleEncyclopedia(show) {
    document.getElementById('main-menu').classList.toggle('hidden', show);
    document.getElementById('encyclopedia').classList.toggle('hidden', !show);
}

// --- MAIN LOOP ---

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameActive && !isPaused) {
        // 1. Draw Road
        ctx.strokeStyle = "#34495e";
        ctx.lineWidth = PATH_WIDTH;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(waypoints[0].x, waypoints[0].y);
        waypoints.forEach(w => ctx.lineTo(w.x, w.y));
        ctx.stroke();

        // 2. Placement Preview
        if (selectedTowerType) {
            const config = TOWER_TYPES[selectedTowerType];
            const valid = canPlaceTower(mouseX, mouseY) && gold >= config.cost;
            ctx.fillStyle = valid ? "rgba(255, 255, 255, 0.1)" : "rgba(231, 76, 60, 0.2)";
            ctx.beginPath(); ctx.arc(mouseX, mouseY, config.range, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = valid ? "white" : "red";
            ctx.stroke();
        }

        // 3. Enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            let target = waypoints[e.wpIdx];
            let dx = target.x - e.x, dy = target.y - e.y;
            let dist = Math.hypot(dx, dy);

            if (dist < e.speed) {
                e.wpIdx++;
                if (e.wpIdx >= waypoints.length) {
                    playerHP -= 10;
                    enemies.splice(i, 1);
                    updateUI();
                    continue;
                }
            } else {
                e.x += (dx/dist) * e.speed;
                e.y += (dy/dist) * e.speed;
            }

            // Draw Enemy Body
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(e.x-10, e.y-10, 20, 20);
            // HP Bar
            ctx.fillStyle = "#555"; ctx.fillRect(e.x-12, e.y-18, 24, 4);
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(e.x-12, e.y-18, (e.hp/e.maxHp)*24, 4);
            // HP Text
            ctx.fillStyle = "white"; ctx.font = "10px Arial"; ctx.textAlign = "center";
            ctx.fillText(Math.ceil(e.hp), e.x, e.y-22);

            if (e.hp <= 0) { enemies.splice(i, 1); gold += 15; updateUI(); }
        }

        // 4. Towers
        let hoveredTower = null;
        towers.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI*2); ctx.fill();

            if (Math.hypot(mouseX-t.x, mouseY-t.y) < 15) hoveredTower = t;

            t.lastShot++;
            if (t.lastShot >= t.fireRate) {
                let target = enemies.find(en => Math.hypot(en.x-t.x, en.y-t.y) < t.range);
                if (target) {
                    bullets.push({x:t.x, y:t.y, tx:target.x, ty:target.y, dmg:t.damage, splash:t.splash, color:t.color});
                    t.lastShot = 0;
                }
            }
        });

        // 5. Bullets & Explosions
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            let dx = b.tx-b.x, dy = b.ty-b.y, dist = Math.hypot(dx, dy);
            if (dist < 10) {
                if (b.splash > 0) {
                    explosions.push({x:b.x, y:b.y, r:10, maxR:b.splash, a:1});
                    enemies.forEach(en => {
                        if (Math.hypot(en.x-b.x, en.y-b.y) < b.splash) en.hp -= b.dmg;
                    });
                } else {
                    let target = enemies.find(en => Math.hypot(en.x-b.x, en.y-b.y) < 25);
                    if (target) target.hp -= b.dmg;
                }
                bullets.splice(i, 1);
            } else {
                b.x += (dx/dist)*10; b.y += (dy/dist)*10;
                ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
            }
        }

        for (let i = explosions.length - 1; i >= 0; i--) {
            let ex = explosions[i]; ex.r += 4; ex.a -= 0.05;
            ctx.fillStyle = `rgba(230, 126, 34, ${ex.a})`;
            ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2); ctx.fill();
            if (ex.a <= 0) explosions.splice(i, 1);
        }

        // 6. Hover Stats
        if (hoveredTower && !selectedTowerType) {
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(mouseX+10, mouseY+10, 100, 50);
            ctx.fillStyle = "white"; ctx.textAlign = "left"; ctx.font = "12px Arial";
            ctx.fillText(hoveredTower.name, mouseX+15, mouseY+25);
            ctx.fillText("Dmg: " + hoveredTower.damage, mouseX+15, mouseY+40);
            ctx.strokeStyle = "white"; ctx.beginPath(); ctx.arc(hoveredTower.x, hoveredTower.y, hoveredTower.range, 0, Math.PI*2); ctx.stroke();
        }

        if (enemies.length === 0) { wave++; spawnWave(); updateUI(); }
    }
    requestAnimationFrame(gameLoop);
}
