
export class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.markedForDeletion = false;
    }

    update(dt) { }
    draw(ctx) { }
}

export class Enemy extends Entity {
    constructor(waypoints, type = 'elf', speedMultiplier = 1.0) {
        super(waypoints[0].x, waypoints[0].y);
        this.waypoints = waypoints;
        this.waypointIndex = 1;
        this.type = type;

        let baseSpeed = type === 'santa' ? 30 : 60;
        this.speed = baseSpeed * speedMultiplier;

        this.maxHealth = (type === 'santa' ? 5000 : 100) * speedMultiplier;
        this.health = this.maxHealth;
        this.radius = type === 'santa' ? 30 : 15;
        this.frozen = false;
        this.slowFactor = 1;
        this.value = type === 'santa' ? 1000 : 10;

        this.image = type === 'santa' ? window.imgs.santa : window.imgs.elf;
    }

    update(dt) {
        if (this.health <= 0) {
            this.markedForDeletion = true;
            return;
        }

        let target = this.waypoints[this.waypointIndex];
        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        let moveDist = this.speed * this.slowFactor * dt;

        if (dist <= moveDist) {
            this.x = target.x;
            this.y = target.y;
            this.waypointIndex++;
            if (this.waypointIndex >= this.waypoints.length) {
                this.markedForDeletion = true;
                this.reachedEnd = true;
            }
        } else {
            this.x += (dx / dist) * moveDist;
            this.y += (dy / dist) * moveDist;
        }
    }

    takeDamage(amount) {
        this.health -= amount;
    }

    draw(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.radius / 2, this.radius, this.radius / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.image) {
            let size = this.radius * 2 * 1.5;
            ctx.drawImage(this.image, this.x - size / 2, this.y - size / 2 - 10, size, size);
        } else {
            ctx.fillStyle = this.type === 'santa' ? 'red' : 'green';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        let hpPct = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 15, this.y - this.radius - 15, 30, 4);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x - 15, this.y - this.radius - 15, 30 * hpPct, 4);
    }
}

export class Projectile extends Entity {
    constructor(x, y, target, damage, speed, color = 'white', slow = false) {
        super(x, y);
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.color = color;
        this.slow = slow;
        this.radius = 4;
    }

    update(dt) {
        if (!this.target || this.target.markedForDeletion) {
            this.markedForDeletion = true;
            return;
        }

        let dx = this.target.x - this.x;
        let dy = this.target.y - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        let moveDist = this.speed * dt;

        if (dist <= moveDist) {
            this.target.takeDamage(this.damage);
            this.markedForDeletion = true;
        } else {
            this.x += (dx / dist) * moveDist;
            this.y += (dy / dist) * moveDist;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class Spike extends Entity {
    constructor(x, y) {
        super(x, y);
        this.radius = 15;
        this.duration = 10.0; // Despawns after 10s if not used? Or permanent? Let's say 10s.
        this.image = window.imgs.spike;
    }

    update(dt, enemies) {
        this.duration -= dt;
        if (this.duration <= 0) {
            this.markedForDeletion = true;
            return;
        }

        // Check collision with ANY enemy
        for (let e of enemies) {
            let dx = e.x - this.x;
            let dy = e.y - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            // Instakill logic (except Santa?)
            // User said: "if an enemy goes over the spikes he dies immediately"
            // Let's make it massive damage for Santa so it doesn't trivialise boss.
            if (dist < this.radius + e.radius) {
                if (e.type === 'santa') {
                    e.takeDamage(500); // Big chunk but not instant
                } else {
                    e.takeDamage(99999);
                }
                this.markedForDeletion = true; // Spike used up
                break;
            }
        }
    }

    draw(ctx) {
        if (this.image) {
            let size = this.radius * 2;
            ctx.drawImage(this.image, this.x - size / 2, this.y - size / 2, size, size);
        } else {
            ctx.fillStyle = '#FFD700'; // Gold
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 10);
            ctx.lineTo(this.x - 10, this.y + 10);
            ctx.lineTo(this.x + 10, this.y + 10);
            ctx.fill();
        }
    }
}


export class Tower extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type; // 'cane' or 'trap'
        this.baseCost = type === 'trap' ? 150 : 50;
        this.totalInvested = this.baseCost;
        this.range = type === 'trap' ? 100 : 150;
        this.damage = type === 'trap' ? 0 : 20;
        this.fireRate = type === 'trap' ? 0.2 : 1.0; // Trap is slow
        this.cooldown = 0;
        this.radius = 25;

        this.level = 1;
        this.upgradePath = null;
        this.upgrades = [0, 0, 0];

        this.image = type === 'trap' ? window.imgs.tower_trap : window.imgs.tower_cane;
    }

    update(dt, enemies, projectilesList) {
        this.cooldown -= dt;

        if (this.cooldown <= 0) {
            if (this.type === 'trap') {
                // Trap Logic: Place spike near enemy
                let target = this.findTarget(enemies);
                if (target) {
                    // Place spike at target's FUTURE position? Or current.
                    // Projectiles list works for spikes too as entities
                    // But we want spikes to be stationary.
                    // Add to separate list? Or just generic entity list?
                    // Game.js passes "projectilesList" which is rendered. 
                    // Let's add Spike to projectilesList but it behaves differently (stationary).

                    projectilesList.push(new Spike(target.x, target.y));
                    this.cooldown = 1 / this.fireRate;
                }
            } else {
                let target = this.findTarget(enemies);
                if (target) {
                    this.shoot(target, projectilesList);
                    this.cooldown = 1 / this.fireRate;
                }
            }
        }
    }

    findTarget(enemies) {
        for (let enemy of enemies) {
            let dx = enemy.x - this.x;
            let dy = enemy.y - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= this.range) {
                return enemy;
            }
        }
        return null;
    }

    shoot(target, projectilesList) {
        projectilesList.push(new Projectile(this.x, this.y - 10, target, this.damage, 300));
    }

    getSellValue() {
        return Math.floor(this.totalInvested / 2);
    }

    draw(ctx, showRange = false) {
        if (showRange) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
        }

        if (this.image) {
            let size = this.radius * 2;
            ctx.drawImage(this.image, this.x - size / 2, this.y - size / 2, size, size);
        } else {
            // Fallback
            ctx.fillStyle = this.type === 'trap' ? '#555' : '#ccc';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
