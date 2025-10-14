// Hot Loop – Endless Street Toy
// Main Game Logic

class HotLoop {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Game state
        this.roads = [];
        this.cars = [];
        this.particles = [];
        this.camera = {
            x: 0,
            y: 0,
            zoom: 0.6,
            targetZoom: 0.6
        };
        
        // Input tracking
        this.touchStartTime = 0;
        this.isHolding = false;
        this.lastTouchPos = null;
        this.swipeVelocity = { x: 0, y: 0 };
        
        // Visual settings
        this.colors = {
            neonPink: '#ff00ff',
            neonBlue: '#00ffff',
            neonGreen: '#00ff00',
            neonYellow: '#ffff00',
            neonOrange: '#ff6600',
            neonPurple: '#8800ff'
        };
        this.colorArray = Object.values(this.colors);
        
        // Initialize
        this.setupEventListeners();
        this.createInitialRoad();
        this.animate();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Mouse events (for desktop)
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.touchStartTime = Date.now();
        this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
        this.isHolding = false;
        
        // Start hold timer
        this.holdTimer = setTimeout(() => {
            this.isHolding = true;
            this.camera.targetZoom = 0.3; // Zoom out
            this.createParticleBurst(touch.clientX, touch.clientY, 30);
        }, 500);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.lastTouchPos) return;
        
        const touch = e.touches[0];
        const dx = touch.clientX - this.lastTouchPos.x;
        const dy = touch.clientY - this.lastTouchPos.y;
        
        this.swipeVelocity = { x: dx, y: dy };
        this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
        
        clearTimeout(this.holdTimer);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        clearTimeout(this.holdTimer);
        
        const touchDuration = Date.now() - this.touchStartTime;
        const swipeSpeed = Math.sqrt(
            this.swipeVelocity.x ** 2 + this.swipeVelocity.y ** 2
        );
        
        if (this.isHolding) {
            // Release hold - zoom back in
            this.camera.targetZoom = 0.6;
            this.isHolding = false;
        } else if (swipeSpeed > 10) {
            // Swipe detected - boost cars
            this.boostCars();
            this.createParticleBurst(this.lastTouchPos.x, this.lastTouchPos.y, 20);
        } else if (touchDuration < 300) {
            // Quick tap - create road
            const pos = this.screenToWorld(this.lastTouchPos.x, this.lastTouchPos.y);
            this.createRoadAtPosition(pos.x, pos.y);
        }
        
        this.swipeVelocity = { x: 0, y: 0 };
        this.lastTouchPos = null;
    }
    
    handleMouseDown(e) {
        this.handleTouchStart({ 
            touches: [{ clientX: e.clientX, clientY: e.clientY }], 
            preventDefault: () => {} 
        });
    }
    
    handleMouseMove(e) {
        if (this.lastTouchPos) {
            this.handleTouchMove({ 
                touches: [{ clientX: e.clientX, clientY: e.clientY }], 
                preventDefault: () => {} 
            });
        }
    }
    
    handleMouseUp(e) {
        this.handleTouchEnd({ preventDefault: () => {} });
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.centerX) / this.camera.zoom + this.camera.x,
            y: (screenY - this.centerY) / this.camera.zoom + this.camera.y
        };
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.camera.x) * this.camera.zoom + this.centerX,
            y: (worldY - this.camera.y) * this.camera.zoom + this.centerY
        };
    }
    
    createInitialRoad() {
        // Create a starting loop
        const segments = 8;
        const radius = 350;
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const nextAngle = ((i + 1) / segments) * Math.PI * 2;
            
            const road = {
                x1: Math.cos(angle) * radius,
                y1: Math.sin(angle) * radius,
                x2: Math.cos(nextAngle) * radius,
                y2: Math.sin(nextAngle) * radius,
                width: 30,
                color: this.colorArray[i % this.colorArray.length],
                glow: 20
            };
            
            this.roads.push(road);
        }
        
        // Create initial cars
        for (let i = 0; i < 5; i++) {
            this.createCar();
        }
    }
    
    createRoadAtPosition(x, y) {
        // Find nearest road endpoint
        let nearestPoint = null;
        let minDist = Infinity;
        
        this.roads.forEach(road => {
            const dist1 = Math.sqrt((x - road.x1) ** 2 + (y - road.y1) ** 2);
            const dist2 = Math.sqrt((x - road.x2) ** 2 + (y - road.y2) ** 2);
            
            if (dist1 < minDist) {
                minDist = dist1;
                nearestPoint = { x: road.x1, y: road.y1 };
            }
            if (dist2 < minDist) {
                minDist = dist2;
                nearestPoint = { x: road.x2, y: road.y2 };
            }
        });
        
        // Create new road segment
        const startPoint = nearestPoint || { x: 0, y: 0 };
        const angle = Math.random() * Math.PI * 2;
        const length = 100 + Math.random() * 150;
        
        const newRoad = {
            x1: startPoint.x,
            y1: startPoint.y,
            x2: startPoint.x + Math.cos(angle) * length,
            y2: startPoint.y + Math.sin(angle) * length,
            width: 25 + Math.random() * 15,
            color: this.colorArray[Math.floor(Math.random() * this.colorArray.length)],
            glow: 15 + Math.random() * 10,
            age: 0
        };
        
        this.roads.push(newRoad);
        
        // Maybe spawn a new car
        if (Math.random() < 0.3) {
            this.createCar(newRoad);
        }
        
        // Create particles at tap location
        this.createParticleBurst(
            ...this.worldToScreen(x, y),
            15
        );
        
        // Play sound effect
        this.playSound('tap');
    }
    
    createCar(road = null) {
        const selectedRoad = road || this.roads[Math.floor(Math.random() * this.roads.length)];
        if (!selectedRoad) return;
        
        const car = {
            road: selectedRoad,
            progress: Math.random(),
            speed: 0.002 + Math.random() * 0.003,
            size: 15 + Math.random() * 10,
            color: this.colorArray[Math.floor(Math.random() * this.colorArray.length)],
            trail: []
        };
        
        this.cars.push(car);
    }
    
    boostCars() {
        this.cars.forEach(car => {
            car.speed *= 2;
            // Create boost trail
            const pos = this.getCarPosition(car);
            this.createParticleBurst(pos.screenX, pos.screenY, 10);
        });
        
        this.playSound('boost');
        
        // Reset speeds after a moment
        setTimeout(() => {
            this.cars.forEach(car => car.speed *= 0.5);
        }, 1000);
    }
    
    getCarPosition(car) {
        const road = car.road;
        const x = road.x1 + (road.x2 - road.x1) * car.progress;
        const y = road.y1 + (road.y2 - road.y1) * car.progress;
        const screen = this.worldToScreen(x, y);
        
        return { x, y, screenX: screen.x, screenY: screen.y };
    }
    
    createParticleBurst(screenX, screenY, count) {
        const worldPos = this.screenToWorld(screenX, screenY);
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            
            this.particles.push({
                x: worldPos.x,
                y: worldPos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 5,
                color: this.colorArray[Math.floor(Math.random() * this.colorArray.length)],
                life: 1,
                decay: 0.015 + Math.random() * 0.015
            });
        }
    }
    
    playSound(type) {
        // Simple audio synthesis
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'tap') {
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } else if (type === 'boost') {
            oscillator.frequency.value = 400;
            gainNode.gain.value = 0.15;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    }
    
    update() {
        // Update camera zoom
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;
        
        // Update cars
        this.cars.forEach(car => {
            car.progress += car.speed;
            
            // Find next road segment when reaching end
            if (car.progress >= 1) {
                const currentRoad = car.road;
                const connectedRoads = this.roads.filter(road => 
                    (Math.abs(road.x1 - currentRoad.x2) < 10 && 
                     Math.abs(road.y1 - currentRoad.y2) < 10) ||
                    (Math.abs(road.x2 - currentRoad.x2) < 10 && 
                     Math.abs(road.y2 - currentRoad.y2) < 10)
                );
                
                if (connectedRoads.length > 0) {
                    car.road = connectedRoads[Math.floor(Math.random() * connectedRoads.length)];
                    car.progress = 0;
                } else {
                    // Loop back or find any road
                    car.road = this.roads[Math.floor(Math.random() * this.roads.length)];
                    car.progress = 0;
                }
            }
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            return particle.life > 0;
        });
        
        // Occasionally spawn new cars
        if (Math.random() < 0.01 && this.cars.length < 20) {
            this.createCar();
        }
    }
    
    draw() {
        // Clear canvas with dark background
        this.ctx.fillStyle = 'rgba(10, 0, 21, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for transformations
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw roads with glow effect
        this.roads.forEach(road => {
            // Glow
            this.ctx.strokeStyle = road.color;
            this.ctx.lineWidth = road.width + road.glow;
            this.ctx.shadowBlur = 30;
            this.ctx.shadowColor = road.color;
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(road.x1, road.y1);
            this.ctx.lineTo(road.x2, road.y2);
            this.ctx.stroke();
            
            // Solid road
            this.ctx.strokeStyle = road.color;
            this.ctx.lineWidth = road.width;
            this.ctx.shadowBlur = 10;
            
            this.ctx.beginPath();
            this.ctx.moveTo(road.x1, road.y1);
            this.ctx.lineTo(road.x2, road.y2);
            this.ctx.stroke();
            
            // Center line
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 0;
            this.ctx.setLineDash([10, 10]);
            
            this.ctx.beginPath();
            this.ctx.moveTo(road.x1, road.y1);
            this.ctx.lineTo(road.x2, road.y2);
            this.ctx.stroke();
            
            this.ctx.setLineDash([]);
        });
        
        // Draw cars
        this.cars.forEach(car => {
            const pos = this.getCarPosition(car);
            
            // Car glow
            this.ctx.fillStyle = car.color;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = car.color;
            
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, car.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Car body
            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowBlur = 5;
            
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, car.size * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw particles
        this.particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = particle.color;
            this.ctx.globalAlpha = particle.life;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
        this.ctx.restore();
    }
    
    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new HotLoop();
});

