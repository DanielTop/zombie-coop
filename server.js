const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(__dirname));

// Game state
const rooms = new Map();

const COLORS = [
    { id: 'green', name: 'Зелёный', hex: '#00ff88' },
    { id: 'blue', name: 'Синий', hex: '#00aaff' },
    { id: 'red', name: 'Красный', hex: '#ff4466' },
    { id: 'yellow', name: 'Жёлтый', hex: '#ffdd00' },
    { id: 'purple', name: 'Фиолетовый', hex: '#aa66ff' },
    { id: 'orange', name: 'Оранжевый', hex: '#ff8844' },
    { id: 'cyan', name: 'Голубой', hex: '#00ffff' },
    { id: 'pink', name: 'Розовый', hex: '#ff66aa' }
];

// Map size
const MAP_WIDTH = 3000;
const MAP_HEIGHT = 2000;

// Weapons database
const WEAPONS = {
    pistol: { name: 'Пистолет', damage: 12, fireRate: 220, bulletSpeed: 18, spread: 0.04, bullets: 1 },
    smg: { name: 'Узи', damage: 8, fireRate: 50, bulletSpeed: 22, spread: 0.15, bullets: 1 },
    shotgun: { name: 'Дробовик', damage: 20, fireRate: 600, bulletSpeed: 16, spread: 0.3, bullets: 8 },
    doubleBarrel: { name: 'Двустволка', damage: 35, fireRate: 900, bulletSpeed: 14, spread: 0.35, bullets: 12 },
    rifle: { name: 'Винтовка', damage: 50, fireRate: 400, bulletSpeed: 30, spread: 0.02, bullets: 1, pierce: 3 },
    sniper: { name: 'Снайперка', damage: 150, fireRate: 1200, bulletSpeed: 50, spread: 0, bullets: 1, pierce: 10 },
    minigun: { name: 'Миниган', damage: 7, fireRate: 35, bulletSpeed: 24, spread: 0.18, bullets: 1 },
    laser: { name: 'Лазер', damage: 35, fireRate: 100, bulletSpeed: 40, spread: 0, bullets: 1, pierce: 15 },
    plasma: { name: 'Плазма', damage: 60, fireRate: 350, bulletSpeed: 14, spread: 0.08, bullets: 1, explosive: 60 },
    bazooka: { name: 'Базука', damage: 120, fireRate: 1000, bulletSpeed: 10, spread: 0.05, bullets: 1, explosive: 120 },
    grenadeLauncher: { name: 'Гранатомёт', damage: 80, fireRate: 700, bulletSpeed: 12, spread: 0.1, bullets: 1, explosive: 100, bouncy: true },
    railgun: { name: 'Рейлган', damage: 200, fireRate: 1500, bulletSpeed: 60, spread: 0, bullets: 1, pierce: 50 },
    flamethrower: { name: 'Огнемёт', damage: 5, fireRate: 30, bulletSpeed: 10, spread: 0.4, bullets: 3, range: 200 },
    freezeGun: { name: 'Крио-пушка', damage: 15, fireRate: 150, bulletSpeed: 18, spread: 0.1, bullets: 1, freeze: true },
    chainLightning: { name: 'Тесла', damage: 40, fireRate: 400, bulletSpeed: 35, spread: 0, bullets: 1, chain: 5 },
    acidGun: { name: 'Кислота', damage: 25, fireRate: 200, bulletSpeed: 16, spread: 0.15, bullets: 2, poison: true },
    sawBlade: { name: 'Пила', damage: 30, fireRate: 300, bulletSpeed: 12, spread: 0, bullets: 1, pierce: 20, boomerang: true },
    clusterBomb: { name: 'Кассета', damage: 50, fireRate: 800, bulletSpeed: 14, spread: 0.1, bullets: 1, cluster: 8 },
    blackHole: { name: 'Чёрная дыра', damage: 100, fireRate: 2000, bulletSpeed: 8, spread: 0, bullets: 1, vortex: true },
    nukeGun: { name: 'Ядерка', damage: 300, fireRate: 3000, bulletSpeed: 6, spread: 0, bullets: 1, explosive: 250, nuke: true }
};

// Zombie types - more variety!
const ZOMBIE_TYPES = {
    // Basic
    normal: { hp: 30, speed: 1.8, damage: 10, radius: 14, color: '#44aa44', xp: 10, icon: 'zombie' },
    fast: { hp: 18, speed: 4, damage: 8, radius: 11, color: '#aacc44', xp: 15, icon: 'runner' },
    crawler: { hp: 25, speed: 2.5, damage: 12, radius: 10, color: '#66aa66', xp: 12, icon: 'crawler' },

    // Medium
    tank: { hp: 180, speed: 0.9, damage: 25, radius: 26, color: '#664422', xp: 45, icon: 'tank' },
    exploder: { hp: 45, speed: 2.2, damage: 5, radius: 16, color: '#cc4444', xp: 25, icon: 'exploder' },
    spitter: { hp: 35, speed: 1.5, damage: 15, radius: 15, color: '#44ccaa', xp: 30, icon: 'spitter' },

    // Special
    ghost: { hp: 50, speed: 2.8, damage: 18, radius: 14, color: '#8888ff', xp: 35, icon: 'ghost', alpha: 0.6 },
    splitter: { hp: 60, speed: 1.6, damage: 12, radius: 18, color: '#aa66aa', xp: 40, icon: 'splitter', splits: 2 },
    armored: { hp: 120, speed: 1.2, damage: 20, radius: 20, color: '#888888', xp: 50, icon: 'armored', armor: 0.3 },

    // Elite
    giant: { hp: 300, speed: 0.7, damage: 35, radius: 35, color: '#553322', xp: 80, icon: 'giant' },
    nightmare: { hp: 100, speed: 3.5, damage: 30, radius: 18, color: '#ff0066', xp: 70, icon: 'nightmare' },
    necro: { hp: 80, speed: 1.3, damage: 15, radius: 17, color: '#6600aa', xp: 60, icon: 'necro', spawner: true },

    // Boss
    boss: { hp: 600, speed: 0.6, damage: 50, radius: 45, color: '#880044', xp: 250, icon: 'boss' },
    megaBoss: { hp: 1500, speed: 0.4, damage: 80, radius: 60, color: '#440022', xp: 500, icon: 'megaboss' }
};

function createRoom(roomId) {
    return {
        id: roomId,
        players: new Map(),
        zombies: [],
        bullets: [],
        pickups: [],
        wave: 1,
        totalKills: 0,
        gameStarted: false,
        waveZombiesRemaining: 0,
        betweenWaves: true,
        lastSpawn: 0,
        lastUpdate: Date.now()
    };
}

function spawnZombie(room) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch(side) {
        case 0: x = Math.random() * MAP_WIDTH; y = -30; break;
        case 1: x = Math.random() * MAP_WIDTH; y = MAP_HEIGHT + 30; break;
        case 2: x = -30; y = Math.random() * MAP_HEIGHT; break;
        case 3: x = MAP_WIDTH + 30; y = Math.random() * MAP_HEIGHT; break;
    }

    let typeRoll = Math.random();
    let type;

    // More variety based on wave
    if (room.wave >= 15 && typeRoll < 0.03) type = 'megaBoss';
    else if (room.wave >= 10 && typeRoll < 0.06) type = 'boss';
    else if (room.wave >= 12 && typeRoll < 0.12) type = 'nightmare';
    else if (room.wave >= 10 && typeRoll < 0.18) type = 'necro';
    else if (room.wave >= 8 && typeRoll < 0.24) type = 'giant';
    else if (room.wave >= 6 && typeRoll < 0.30) type = 'armored';
    else if (room.wave >= 5 && typeRoll < 0.36) type = 'ghost';
    else if (room.wave >= 4 && typeRoll < 0.42) type = 'splitter';
    else if (room.wave >= 3 && typeRoll < 0.50) type = 'spitter';
    else if (room.wave >= 3 && typeRoll < 0.58) type = 'exploder';
    else if (room.wave >= 2 && typeRoll < 0.65) type = 'tank';
    else if (typeRoll < 0.45) type = 'fast';
    else if (typeRoll < 0.55) type = 'crawler';
    else type = 'normal';

    const template = ZOMBIE_TYPES[type];
    const waveMultiplier = 1 + (room.wave - 1) * 0.15;

    room.zombies.push({
        id: Date.now() + Math.random(),
        x, y,
        hp: template.hp * waveMultiplier,
        maxHp: template.hp * waveMultiplier,
        speed: template.speed * (1 + room.wave * 0.02),
        damage: template.damage * waveMultiplier,
        radius: template.radius,
        color: template.color,
        xpValue: Math.floor(template.xp * (1 + room.wave * 0.1)),
        type,
        icon: template.icon,
        alpha: template.alpha || 1,
        armor: template.armor || 0,
        lastAttack: 0
    });
}

function updateRoom(room) {
    const now = Date.now();
    const dt = (now - room.lastUpdate) / 16.67; // normalize to 60fps
    room.lastUpdate = now;

    if (!room.gameStarted || room.players.size === 0) return;

    // Check all players dead
    const alivePlayers = [...room.players.values()].filter(p => p.alive);
    if (alivePlayers.length === 0) {
        room.gameStarted = false;
        io.to(room.id).emit('gameOver', { wave: room.wave, kills: room.totalKills });
        return;
    }

    // Wave logic
    if (room.betweenWaves) {
        if (now - room.waveStartTime > 3000) {
            room.betweenWaves = false;
            room.waveZombiesRemaining = 15 + room.wave * 8;
            io.to(room.id).emit('waveStart', room.wave);
        }
    } else {
        // Spawn zombies
        const spawnRate = Math.max(300, 1500 - room.wave * 50);
        if (now - room.lastSpawn > spawnRate && room.waveZombiesRemaining > 0) {
            spawnZombie(room);
            room.waveZombiesRemaining--;
            room.lastSpawn = now;
        }

        // Check wave complete
        if (room.waveZombiesRemaining <= 0 && room.zombies.length === 0) {
            room.wave++;
            room.betweenWaves = true;
            room.waveStartTime = now;
            io.to(room.id).emit('waveComplete', room.wave);
        }
    }

    // Update zombies
    room.zombies.forEach(z => {
        let nearestPlayer = null;
        let minDist = Infinity;

        alivePlayers.forEach(p => {
            const dist = Math.hypot(p.x - z.x, p.y - z.y);
            if (dist < minDist) {
                minDist = dist;
                nearestPlayer = p;
            }
        });

        if (nearestPlayer) {
            const angle = Math.atan2(nearestPlayer.y - z.y, nearestPlayer.x - z.x);
            z.x += Math.cos(angle) * z.speed * dt;
            z.y += Math.sin(angle) * z.speed * dt;

            // Attack
            if (minDist < z.radius + 18) {
                if (now - z.lastAttack > 500) {
                    nearestPlayer.hp -= z.damage * (1 - (nearestPlayer.armor || 0));
                    z.lastAttack = now;
                    if (nearestPlayer.hp <= 0) {
                        nearestPlayer.hp = 0;
                        nearestPlayer.alive = false;
                        io.to(room.id).emit('playerDied', nearestPlayer.id);
                    }
                }
            }
        }
    });

    // Update bullets
    room.bullets = room.bullets.filter(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.traveled += Math.hypot(b.vx, b.vy) * dt;

        if (b.x < -50 || b.x > MAP_WIDTH + 50 || b.y < -50 || b.y > MAP_HEIGHT + 50) return false;
        if (b.traveled > (b.range || 1000)) return false;

        // Hit zombies
        for (let i = room.zombies.length - 1; i >= 0; i--) {
            const z = room.zombies[i];
            const dist = Math.hypot(z.x - b.x, z.y - b.y);
            if (dist < z.radius + b.size) {
                z.hp -= b.damage;

                io.to(room.id).emit('hit', { x: b.x, y: b.y, damage: b.damage, crit: b.crit });

                // Handle explosive weapons
                if (b.explosive && b.explosive > 0) {
                    const explosionRadius = b.explosive;
                    io.to(room.id).emit('explosion', {
                        x: b.x, y: b.y,
                        radius: explosionRadius,
                        color: b.color,
                        nuke: b.nuke
                    });

                    // Damage nearby zombies
                    room.zombies.forEach(nearZ => {
                        if (nearZ.id === z.id) return;
                        const dist = Math.hypot(nearZ.x - b.x, nearZ.y - b.y);
                        if (dist < explosionRadius) {
                            const splashDamage = b.damage * (1 - dist / explosionRadius) * 0.7;
                            nearZ.hp -= splashDamage;
                        }
                    });
                }

                // Handle cluster bombs
                if (b.cluster && z.hp <= 0) {
                    for (let c = 0; c < b.cluster; c++) {
                        const angle = (c / b.cluster) * Math.PI * 2;
                        room.bullets.push({
                            x: b.x, y: b.y,
                            vx: Math.cos(angle) * 8,
                            vy: Math.sin(angle) * 8,
                            damage: b.damage * 0.4,
                            color: '#ffaa00',
                            size: 4,
                            pierce: 0,
                            ownerId: b.ownerId,
                            explosive: 40
                        });
                    }
                }

                if (z.hp <= 0) {
                    room.zombies.splice(i, 1);
                    room.totalKills++;

                    // Award XP to shooter
                    const player = room.players.get(b.ownerId);
                    if (player) {
                        player.xp += z.xpValue * (player.xpMultiplier || 1);
                        if (player.lifeSteal) {
                            player.hp = Math.min(player.maxHp, player.hp + player.lifeSteal);
                        }

                        // Level up check
                        while (player.xp >= player.xpToLevel) {
                            player.xp -= player.xpToLevel;
                            player.level++;
                            player.xpToLevel = Math.floor(player.xpToLevel * 1.25);
                            io.to(player.socketId).emit('levelUp', player.level);
                        }
                    }

                    io.to(room.id).emit('zombieDied', { id: z.id, x: z.x, y: z.y, color: z.color });

                    // Spawn pickup
                    if (Math.random() < 0.18 * (player?.luck || 1)) {
                        const pickup = {
                            id: Date.now() + Math.random(),
                            x: z.x,
                            y: z.y,
                            type: Math.random() < 0.35 ? 'weapon' : (Math.random() < 0.5 ? 'health' : 'xp'),
                            life: 600
                        };
                        if (pickup.type === 'weapon') {
                            // Weapon drop tiers based on wave
                            let weaponPool;
                            if (room.wave < 3) {
                                weaponPool = ['smg', 'shotgun', 'rifle'];
                            } else if (room.wave < 5) {
                                weaponPool = ['smg', 'shotgun', 'doubleBarrel', 'rifle', 'sniper', 'minigun', 'flamethrower'];
                            } else if (room.wave < 8) {
                                weaponPool = ['doubleBarrel', 'sniper', 'minigun', 'laser', 'plasma', 'bazooka', 'freezeGun', 'acidGun'];
                            } else if (room.wave < 12) {
                                weaponPool = ['laser', 'plasma', 'bazooka', 'grenadeLauncher', 'railgun', 'chainLightning', 'sawBlade', 'clusterBomb'];
                            } else {
                                weaponPool = ['railgun', 'chainLightning', 'clusterBomb', 'blackHole', 'nukeGun'];
                            }
                            pickup.weaponKey = weaponPool[Math.floor(Math.random() * weaponPool.length)];
                        }
                        room.pickups.push(pickup);
                    }
                }

                b.pierce = (b.pierce || 0) - 1;
                if (b.pierce < 0) return false;
            }
        }
        return true;
    });

    // Update pickups
    room.pickups = room.pickups.filter(p => {
        p.life--;
        if (p.life <= 0) return false;

        alivePlayers.forEach(player => {
            const dist = Math.hypot(player.x - p.x, player.y - p.y);
            const magnetRange = player.magnetRange || 50;

            // Magnet effect
            if (dist < magnetRange && dist > 20) {
                const angle = Math.atan2(player.y - p.y, player.x - p.x);
                p.x += Math.cos(angle) * 3;
                p.y += Math.sin(angle) * 3;
            }

            // Pickup
            if (dist < 25) {
                io.to(player.socketId).emit('pickup', p);
                p.life = 0;
            }
        });

        return p.life > 0;
    });

    // Broadcast state
    io.to(room.id).emit('state', {
        players: [...room.players.values()].map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            angle: p.angle,
            color: p.color,
            hp: p.hp,
            maxHp: p.maxHp,
            level: p.level,
            alive: p.alive,
            weapon: p.weaponKey
        })),
        zombies: room.zombies.map(z => ({
            id: z.id,
            x: z.x,
            y: z.y,
            radius: z.radius,
            color: z.color,
            hp: z.hp,
            maxHp: z.maxHp
        })),
        pickups: room.pickups,
        wave: room.wave,
        kills: room.totalKills
    });
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    let currentRoom = null;
    let playerId = null;

    socket.emit('colors', COLORS);
    socket.emit('mapSize', { width: MAP_WIDTH, height: MAP_HEIGHT });

    socket.on('joinRoom', ({ roomId, playerName, colorId }) => {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, createRoom(roomId));
        }

        currentRoom = rooms.get(roomId);
        playerId = socket.id;

        const color = COLORS.find(c => c.id === colorId) || COLORS[0];
        const takenColors = [...currentRoom.players.values()].map(p => p.colorId);

        if (takenColors.includes(colorId)) {
            socket.emit('error', 'Этот цвет уже занят!');
            return;
        }

        const spawnX = 200 + Math.random() * (MAP_WIDTH - 400);
        const spawnY = 200 + Math.random() * (MAP_HEIGHT - 400);

        const player = {
            id: playerId,
            socketId: socket.id,
            name: playerName || 'Игрок',
            colorId: color.id,
            color: color.hex,
            x: spawnX,
            y: spawnY,
            angle: 0,
            hp: 100,
            maxHp: 100,
            level: 1,
            xp: 0,
            xpToLevel: 50,
            alive: true,
            weaponKey: 'pistol',
            speed: 5,
            damageMultiplier: 1,
            fireRateMultiplier: 1,
            armor: 0,
            critChance: 0.05,
            critDamage: 1.5,
            pierce: 0,
            magnetRange: 50,
            luck: 1,
            bulletSize: 1,
            bonusBullets: 0,
            explosiveChance: 0,
            lifeSteal: 0,
            xpMultiplier: 1,
            regen: 0
        };

        currentRoom.players.set(playerId, player);
        socket.join(roomId);

        socket.emit('joined', {
            playerId,
            player,
            roomId,
            players: [...currentRoom.players.values()]
        });

        socket.to(roomId).emit('playerJoined', player);

        console.log(`${playerName} joined room ${roomId} as ${color.name}`);
    });

    socket.on('startGame', () => {
        if (currentRoom && currentRoom.players.size >= 1) {
            currentRoom.gameStarted = true;
            currentRoom.wave = 1;
            currentRoom.totalKills = 0;
            currentRoom.zombies = [];
            currentRoom.bullets = [];
            currentRoom.pickups = [];
            currentRoom.betweenWaves = true;
            currentRoom.waveStartTime = Date.now();

            // Reset all players
            currentRoom.players.forEach(p => {
                p.hp = p.maxHp;
                p.alive = true;
                p.level = 1;
                p.xp = 0;
                p.xpToLevel = 50;
            });

            io.to(currentRoom.id).emit('gameStarted');
        }
    });

    socket.on('move', ({ x, y, angle }) => {
        if (currentRoom && playerId) {
            const player = currentRoom.players.get(playerId);
            if (player && player.alive) {
                player.x = Math.max(20, Math.min(MAP_WIDTH - 20, x));
                player.y = Math.max(20, Math.min(MAP_HEIGHT - 20, y));
                player.angle = angle;
            }
        }
    });

    socket.on('shoot', (bulletData) => {
        if (currentRoom && playerId) {
            const player = currentRoom.players.get(playerId);
            if (player && player.alive) {
                const bullet = {
                    ...bulletData,
                    ownerId: playerId
                };
                currentRoom.bullets.push(bullet);

                // Broadcast to other players so they see the bullets
                socket.to(currentRoom.id).emit('playerShot', {
                    playerId,
                    bullets: [{
                        x: bulletData.x,
                        y: bulletData.y,
                        vx: bulletData.vx,
                        vy: bulletData.vy,
                        color: bulletData.color,
                        size: bulletData.size,
                        big: bulletData.big,
                        beam: bulletData.beam,
                        freeze: bulletData.freeze,
                        vortex: bulletData.vortex
                    }]
                });
            }
        }
    });

    socket.on('applyPowerup', (powerupId) => {
        if (currentRoom && playerId) {
            const player = currentRoom.players.get(playerId);
            if (player) {
                // Apply powerup stats
                switch(powerupId) {
                    case 'maxHp': player.maxHp += 25; player.hp = Math.min(player.hp + 25, player.maxHp); break;
                    case 'damage': player.damageMultiplier *= 1.15; break;
                    case 'speed': player.speed *= 1.1; break;
                    case 'fireRate': player.fireRateMultiplier *= 0.8; break;
                    case 'regen': player.regen += 0.5; break;
                    case 'armor': player.armor = Math.min(0.75, player.armor + 0.1); break;
                    case 'xpBoost': player.xpMultiplier *= 1.25; break;
                    case 'critChance': player.critChance += 0.1; break;
                    case 'critDamage': player.critDamage += 0.5; break;
                    case 'pierce': player.pierce += 1; break;
                    case 'magnet': player.magnetRange += 50; break;
                    case 'luck': player.luck += 0.15; break;
                    case 'bulletSize': player.bulletSize *= 1.2; break;
                    case 'multishot': player.bonusBullets += 1; break;
                    case 'explosive': player.explosiveChance += 0.1; break;
                    case 'vampire': player.lifeSteal += 2; break;
                }
            }
        }
    });

    socket.on('changeWeapon', (weaponKey) => {
        if (currentRoom && playerId) {
            const player = currentRoom.players.get(playerId);
            if (player) {
                player.weaponKey = weaponKey;
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        if (currentRoom && playerId) {
            currentRoom.players.delete(playerId);
            io.to(currentRoom.id).emit('playerLeft', playerId);

            if (currentRoom.players.size === 0) {
                rooms.delete(currentRoom.id);
            }
        }
    });
});

// Game loop
setInterval(() => {
    rooms.forEach(room => updateRoom(room));
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Zombie Co-op server running on port ${PORT}`);
});
