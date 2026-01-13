// ═══════════════════════════════════════════════════════════════════════
// PARAMETERS
// ═══════════════════════════════════════════════════════════════════════

let params = {
    seed: 12345,
    particleCount: 8000,
    magneticStrength: 0.08,
    waveAmplitude: 20,
    waveSpeed: 0.008,
    jitterAmount: 0.8
};

let defaultParams = {...params};

// ═══════════════════════════════════════════════════════════════════════
// GLOBAL VARIABLES
// ═══════════════════════════════════════════════════════════════════════

let particles = [];
let textParticles = [];
let letterBounds = [];
let pg; // Graphics buffer for text
let montserratFont;
let time = 0;

// ═══════════════════════════════════════════════════════════════════════
// P5.JS SETUP
// ═══════════════════════════════════════════════════════════════════════

function preload() {
    // Don't fetch remote font files in p5; we already include Montserrat via Google Fonts CSS.
    // Using CSS avoids 404s and "Unsupported OpenType signature" console noise.
    montserratFont = null;
}

function setup() {
    let canvas = createCanvas(1200, 675); // 16:9 cinematic ratio
    canvas.parent('canvas-container');
    
    pg = createGraphics(width, height);
    
    initializeSystem();
    
    document.querySelector('.loading').style.display = 'none';
    updateSeedDisplay();
}

function initializeSystem() {
    if (!pg) return;
    
    randomSeed(params.seed);
    noiseSeed(params.seed);

    particles = [];
    textParticles = [];
    letterBounds = [];
    time = 0;

    // Generate text mask and bounds
    generateTextData();

    // Create background magnetic particles
    for (let i = 0; i < params.particleCount; i++) {
        particles.push(new MagneticParticle());
    }

    // Create text particles
    for (let i = 0; i < 300; i++) {
        textParticles.push(new TextParticle());
    }
}

function generateTextData() {
    if (!pg) return;
    
    pg.clear();
    pg.background(0);
    pg.fill(255);
    pg.textFont(montserratFont || 'sans-serif');
    pg.textSize(180);
    pg.textAlign(CENTER, CENTER);
    pg.text('ANDREW', width / 2, height / 2);

    // Calculate letter bounds for magnetic attraction
    let letters = ['A', 'N', 'D', 'R', 'E', 'W'];
    let letterSpacing = 140;
    let startX = width / 2 - (letters.length * letterSpacing) / 2;

    for (let i = 0; i < letters.length; i++) {
        let x = startX + i * letterSpacing + letterSpacing / 2;
        let y = height / 2;
        letterBounds.push({
            x: x,
            y: y,
            w: letterSpacing * 0.8,
            h: 180,
            letter: letters[i]
        });
    }
}

function draw() {
    background(0);
    time += params.waveSpeed;

    // Don't try to draw if not initialized
    if (!particles.length && !textParticles.length) {
        return;
    }

    // Update and draw background particles
    for (let p of particles) {
        p.applyMagneticForce();
        p.applyWaveForce();
        p.update();
        p.display();
    }

    // Update and draw text particles
    for (let p of textParticles) {
        p.update();
        p.display();
    }
}

// ═══════════════════════════════════════════════════════════════════════
// PARTICLE CLASSES
// ═══════════════════════════════════════════════════════════════════════

class MagneticParticle {
    constructor() {
        this.homeX = random(width);
        this.homeY = random(height);
        this.x = this.homeX;
        this.y = this.homeY;
        this.vx = 0;
        this.vy = 0;
        this.size = random(1, 3);
        this.alpha = random(100, 255);
        this.noiseOffsetX = random(1000);
        this.noiseOffsetY = random(1000);
    }

    applyMagneticForce() {
        if (!pg) return;
        
        // Find closest letter center
        let closest = null;
        let minDist = Infinity;
        
        for (let bound of letterBounds) {
            let d = dist(this.x, this.y, bound.x, bound.y);
            if (d < minDist) {
                minDist = d;
                closest = bound;
            }
        }

        if (closest) {
            // Check if inside exclusion zone
            let px = this.x;
            let py = this.y;
            let col = pg.get(px, py);
            if (!col) return;
            let isInText = col[0] > 128;

            if (!isInText) {
                // Apply elliptical magnetic attraction
                let dx = closest.x - this.x;
                let dy = closest.y - this.y;
                let distance = sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    // Elliptical field with sine perturbation
                    let angle = atan2(dy, dx);
                    let ellipticalFactor = 1 + 0.3 * sin(angle * 3 + time);
                    
                    let forceMag = params.magneticStrength / (distance * 0.01) * ellipticalFactor;
                    forceMag = constrain(forceMag, 0, 2);
                    
                    this.vx += (dx / distance) * forceMag;
                    this.vy += (dy / distance) * forceMag;
                }
            } else {
                // Repel from text area
                let dx = this.x - closest.x;
                let dy = this.y - closest.y;
                let distance = sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    let forceMag = 0.5;
                    this.vx += (dx / distance) * forceMag;
                    this.vy += (dy / distance) * forceMag;
                }
            }
        }
    }

    applyWaveForce() {
        // Sonic wave passing through
        let waveX = (frameCount * 2) % width;
        let distToWave = abs(this.x - waveX);
        
        if (distToWave < 100) {
            let waveFactor = map(distToWave, 0, 100, 1, 0);
            let waveForce = params.waveAmplitude * waveFactor * sin(this.y * 0.05 + time * 5);
            this.vx += waveForce * 0.1;
        }
    }

    update() {
        // Apply velocity with damping
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.85;
        this.vy *= 0.85;

        // Wrap around edges
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
    }

    display() {
        noStroke();
        fill(255, this.alpha);
        circle(this.x, this.y, this.size);
    }
}

class TextParticle {
    constructor() {
        // Place on text area
        let placed = false;
        let attempts = 0;
        
        if (!pg) {
            // Fallback if pg doesn't exist
            this.homeX = width / 2;
            this.homeY = height / 2;
            placed = true;
        }
        
        while (!placed && attempts < 1000) {
            this.homeX = random(width);
            this.homeY = random(height);
            let col = pg.get(this.homeX, this.homeY);
            if (col && col[0] > 128) {
                placed = true;
            }
            attempts++;
        }
        
        // Fallback if couldn't place
        if (!placed) {
            this.homeX = width / 2;
            this.homeY = height / 2;
        }
        this.x = this.homeX;
        this.y = this.homeY;
        this.size = random(2, 4);
        this.noiseOffset = random(1000);
    }

    update() {
        // Electrical jitter
        let jitterX = noise(this.noiseOffset + time * 10) * 2 - 1;
        let jitterY = noise(this.noiseOffset + 500 + time * 10) * 2 - 1;
        
        this.x = this.homeX + jitterX * params.jitterAmount;
        this.y = this.homeY + jitterY * params.jitterAmount;
    }

    display() {
        noStroke();
        fill(255);
        circle(this.x, this.y, this.size);
    }
}

// ═══════════════════════════════════════════════════════════════════════
// UI CONTROL HANDLERS
// ═══════════════════════════════════════════════════════════════════════

window.updateParam = function(paramName, value) {
    params[paramName] = parseFloat(value);
    document.getElementById(paramName + '-value').textContent = value;
    
    if (paramName === 'particleCount') {
        initializeSystem();
    }
}

function updateSeedDisplay() {
    document.getElementById('seed-input').value = params.seed;
}

window.updateSeed = function() {
    let input = document.getElementById('seed-input');
    let newSeed = parseInt(input.value);
    if (newSeed && newSeed > 0) {
        params.seed = newSeed;
        initializeSystem();
    } else {
        updateSeedDisplay();
    }
}

window.previousSeed = function() {
    params.seed = Math.max(1, params.seed - 1);
    updateSeedDisplay();
    initializeSystem();
}

window.nextSeed = function() {
    params.seed = params.seed + 1;
    updateSeedDisplay();
    initializeSystem();
}

window.randomSeedAndUpdate = function() {
    params.seed = Math.floor(Math.random() * 999999) + 1;
    updateSeedDisplay();
    initializeSystem();
}

window.resetParameters = function() {
    params = {...defaultParams};
    
    document.getElementById('particleCount').value = params.particleCount;
    document.getElementById('particleCount-value').textContent = params.particleCount;
    document.getElementById('magneticStrength').value = params.magneticStrength;
    document.getElementById('magneticStrength-value').textContent = params.magneticStrength;
    document.getElementById('waveAmplitude').value = params.waveAmplitude;
    document.getElementById('waveAmplitude-value').textContent = params.waveAmplitude;
    document.getElementById('waveSpeed').value = params.waveSpeed;
    document.getElementById('waveSpeed-value').textContent = params.waveSpeed;
    document.getElementById('jitterAmount').value = params.jitterAmount;
    document.getElementById('jitterAmount-value').textContent = params.jitterAmount;
    
    updateSeedDisplay();
    initializeSystem();
}

window.saveImage = function() {
    saveCanvas('andrew-intro', 'png');
}
